import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CircularProgress from "../components/CircularProgress";
import ViolationList from "../components/ViolationList";
import {
  addViolation,
  auth,
  endSession,
  getViolationCategory,
  isSessionSuccessful,
  Session,
  subscribeToSession,
  terminateSession,
} from "../services/firebase";

const ActiveSessionScreen: React.FC = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const hasAutoCompleted = useRef<boolean>(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, (data) => {
      setSession(data);
      if (data?.status === "ended") {
        router.replace({
          pathname: "/(tabs)/SessionReportScreen",
          params: { sessionId },
        });
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === "active") {
      const interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.status]);

  // Auto-complete session when target time is reached
  useEffect(() => {
    if (!session || !sessionId || hasAutoCompleted.current || isCompleting) return;

    const targetSeconds = session.duration * 60;

    if (timer >= targetSeconds && session.status === "active") {
      hasAutoCompleted.current = true;
      setIsCompleting(true);

      const hasLowViolations = isSessionSuccessful(
        session.violations || [],
        session.participants || []
      );

      const completeSession = async () => {
        try {
          if (hasLowViolations) {
            await endSession(sessionId, "successful");
          } else {
            await endSession(sessionId, "failed", "Total violations exceeded 5 minute limit");
          }
        } catch (error) {
          console.error("Failed to auto-complete session:", error);
          setIsCompleting(false);
          hasAutoCompleted.current = false;
        }
      };

      completeSession();
    }
  }, [timer, session, sessionId, isCompleting]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
      const currentSession = sessionRef.current;

      if (
        appState.current === "active" &&
        (nextAppState === "background" || nextAppState === "inactive")
      ) {
        backgroundTime.current = Date.now();
      }

      if (
        (appState.current === "background" ||
          appState.current === "inactive") &&
        nextAppState === "active"
      ) {
        if (
          backgroundTime.current &&
          currentSession?.status === "active" &&
          auth.currentUser &&
          sessionId
        ) {
          const timeAwayMs = Date.now() - backgroundTime.current;
          const timeAwaySeconds = Math.floor(timeAwayMs / 1000);

          if (timeAwaySeconds >= 5) {
            try {
              const category = getViolationCategory(timeAwaySeconds);

              const result = await addViolation(
                sessionId,
                auth.currentUser.uid,
                "app-switch",
                timeAwaySeconds
              );

              if (result.isCatastrophic) {
                Alert.alert(
                  "Session Terminated",
                  `You were away for over 5 minutes. This session has been terminated.`,
                  [{ text: "OK" }]
                );
                await terminateSession(
                  sessionId,
                  `Catastrophic violation by user (${Math.floor(
                    timeAwaySeconds / 60
                  )} minutes away)`
                );
              } else {
                if (category === "large") {
                  Alert.alert(
                    "Large Violation",
                    `You were away for ${Math.floor(
                      timeAwaySeconds / 60
                    )} minutes. One more large violation may fail the session.`,
                    [{ text: "OK" }]
                  );
                }
              }
            } catch (error) {
              console.error("Failed to log violation:", error);
            }
          }
        }

        backgroundTime.current = null;
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [sessionId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return "Complete!";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s left`;
    return secs > 0 ? `${mins}m ${secs}s left` : `${mins}m left`;
  };

  const handleEndSession = (): void => {
    const targetSeconds = (session?.duration || 0) * 60;
    const isCompletedDuration = timer >= targetSeconds;
    const hasLowViolations = isSessionSuccessful(
      session?.violations || [],
      session?.participants || []
    );

    let confirmMessage = "Are you sure you want to end this study session?";
    if (!isCompletedDuration) {
      const remainingMins = Math.ceil((targetSeconds - timer) / 60);
      confirmMessage = `You still have ${remainingMins} minute(s) left. Ending early will mark this session as FAILED. Continue?`;
    }

    Alert.alert("End Session", confirmMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Session",
        style: "destructive",
        onPress: async () => {
          try {
            if (!sessionId) return;

            if (isCompletedDuration && hasLowViolations) {
              await endSession(sessionId, "successful");
            } else {
              let failReason = "";
              if (!isCompletedDuration) {
                failReason = "Session ended early";
              } else {
                failReason = "Total violations exceeded 5 minute limit";
              }
              await endSession(sessionId, "failed", failReason);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to end session");
          }
        },
      },
    ]);
  };

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  const targetSeconds = session.duration * 60;
  const progress = Math.min(timer / targetSeconds, 1);
  const remainingSeconds = Math.max(targetSeconds - timer, 0);
  const isComplete = timer >= targetSeconds;

  // Dynamic color based on progress
  const getProgressColor = (): string => {
    if (isComplete) return "#34C759"; // Green when complete
    if (progress > 0.75) return "#34C759"; // Green in final stretch
    if (progress > 0.5) return "#007AFF"; // Blue
    return "#007AFF"; // Blue
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Circular Timer */}
        <View style={styles.timerSection}>
          <CircularProgress
            progress={progress}
            size={220}
            strokeWidth={14}
            progressColor={getProgressColor()}
            backgroundColor="#F0F0F0"
          >
            <Text style={[styles.timerText, isComplete && styles.timerComplete]}>
              {formatTime(timer)}
            </Text>
            <Text style={styles.remainingText}>
              {formatRemainingTime(remainingSeconds)}
            </Text>
          </CircularProgress>

          <Text style={styles.targetText}>
            {session.duration} minute session
          </Text>
        </View>

        {/* Session Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {session.participants?.length || 1}
            </Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              (session.violations?.length || 0) > 0 && styles.violationValue
            ]}>
              {session.violations?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Violations</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, isComplete && styles.statusCardComplete]}>
          <Text style={styles.statusTitle}>
            {isComplete ? "Session Complete!" : "Study in Progress"}
          </Text>
          <Text style={styles.statusSubtext}>
            {isComplete
              ? "Great work! Session will end automatically."
              : "Automatic tracking active - stay focused!"}
          </Text>
        </View>

        {/* Violations List */}
        {session.violations && session.violations.length > 0 && (
          <View style={styles.violationsContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <ViolationList violations={session.violations} />
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.endButton, isCompleting && styles.endButtonDisabled]}
          onPress={handleEndSession}
          disabled={isCompleting}
        >
          <Text style={styles.endButtonText}>
            {isCompleting ? "Completing..." : "End Session Early"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  timerComplete: {
    color: "#34C759",
  },
  remainingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  targetText: {
    fontSize: 15,
    color: "#888",
    marginTop: 16,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#007AFF",
  },
  violationValue: {
    color: "#FF3B30",
  },
  statLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusCardComplete: {
    backgroundColor: "#E8F5E9",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: "#666",
  },
  violationsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
    color: "#1A1A1A",
  },
  buttonsContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  endButton: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  endButtonDisabled: {
    backgroundColor: "#FFB3B0",
  },
  endButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ActiveSessionScreen;

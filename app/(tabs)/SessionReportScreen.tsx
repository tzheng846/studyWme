import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  auth,
  db,
  Session,
  updateUserStats,
  ViolationCategory,
} from "../services/firebase";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const getCategoryColor = (category: ViolationCategory): string => {
  switch (category) {
    case "minor":
      return "#FFA500";
    case "medium":
      return "#FF6B00";
    case "large":
      return "#FF3B30";
    case "catastrophic":
      return "#8B0000";
    default:
      return "#FF3B30";
  }
};

interface ViolationStats {
  count: number;
  totalSeconds: number;
  byCategory: {
    minor: number;
    medium: number;
    large: number;
    catastrophic: number;
  };
}

const SessionReportScreen: React.FC = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async (): Promise<void> => {
    try {
      if (!sessionId) return;

      const docSnap = await getDoc(doc(db, "sessions", sessionId));
      if (docSnap.exists()) {
        const sessionData = { id: docSnap.id, ...docSnap.data() } as Session;
        setSession(sessionData);
        if (auth.currentUser) {
          await updateUserStats(auth.currentUser.uid, sessionData);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading report...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text>Session not found</Text>
      </View>
    );
  }

  const isSuccessful = session.outcome === "successful";
  const totalViolations = session.violations?.length || 0;

  const violationStatsByUser: Record<string, ViolationStats> = {};
  session.violations?.forEach((v) => {
    if (!violationStatsByUser[v.userId]) {
      violationStatsByUser[v.userId] = {
        count: 0,
        totalSeconds: 0,
        byCategory: { minor: 0, medium: 0, large: 0, catastrophic: 0 },
      };
    }
    violationStatsByUser[v.userId].count += 1;
    violationStatsByUser[v.userId].totalSeconds += v.durationSeconds || 0;
    if (v.category) {
      violationStatsByUser[v.userId].byCategory[v.category] += 1;
    }
  });

  const sortedUsers = Object.entries(violationStatsByUser).sort(
    (a, b) => a[1].totalSeconds - b[1].totalSeconds
  );
  const mvpUserId = sortedUsers[0]?.[0];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View
          style={[styles.outcomeHeader, !isSuccessful && styles.failedHeader]}
        >
          <Text style={styles.outcomeEmoji}>{isSuccessful ? "🎉" : "😔"}</Text>
          <Text style={styles.outcomeTitle}>
            {isSuccessful ? "Session Complete!" : "Session Failed"}
          </Text>
          <Text style={styles.outcomeSubtitle}>
            {isSuccessful
              ? "Great job studying together!"
              : session.failReason || "Session did not meet success criteria"}
          </Text>
          {!isSuccessful && (
            <Text style={styles.failedNote}>
              Hours and completion not counted. Violations still recorded.
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{session.duration}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {session.participants?.length || 1}
            </Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                totalViolations > 0 && styles.violationValue,
              ]}
            >
              {totalViolations}
            </Text>
            <Text style={styles.statLabel}>Violations</Text>
          </View>
        </View>

        {totalViolations > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Violations by Participant</Text>
            {Object.entries(violationStatsByUser).map(([userId, stats]) => (
              <View key={userId} style={styles.userViolationCard}>
                <View style={styles.userViolationHeader}>
                  <Text style={styles.userId}>
                    {userId === auth.currentUser?.uid
                      ? "You"
                      : userId.substring(0, 8)}
                  </Text>
                  <Text style={styles.totalTime}>
                    {formatDuration(stats.totalSeconds)} total
                  </Text>
                </View>
                <View style={styles.categoryBreakdown}>
                  {stats.byCategory.minor > 0 && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor("minor") },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {stats.byCategory.minor} minor
                      </Text>
                    </View>
                  )}
                  {stats.byCategory.medium > 0 && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor("medium") },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {stats.byCategory.medium} medium
                      </Text>
                    </View>
                  )}
                  {stats.byCategory.large > 0 && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor("large") },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {stats.byCategory.large} large
                      </Text>
                    </View>
                  )}
                  {stats.byCategory.catastrophic > 0 && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor("catastrophic") },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {stats.byCategory.catastrophic} catastrophic
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {totalViolations > 0 && (
          <View style={styles.legendSection}>
            <Text style={styles.legendTitle}>Violation Categories</Text>
            <Text style={styles.legendItem}>• Minor: &lt; 30 seconds</Text>
            <Text style={styles.legendItem}>• Medium: 30s - 2 minutes</Text>
            <Text style={styles.legendItem}>• Large: 2 - 5 minutes</Text>
            <Text style={styles.legendItem}>
              • Catastrophic: &gt; 5 minutes (ends session)
            </Text>
          </View>
        )}

        {isSuccessful && mvpUserId && (
          <View style={styles.mvpCard}>
            <Text style={styles.mvpEmoji}>🏆</Text>
            <Text style={styles.mvpTitle}>MVP - Most Focused</Text>
            <Text style={styles.mvpName}>
              {mvpUserId === auth.currentUser?.uid
                ? "You!"
                : mvpUserId.substring(0, 8)}
            </Text>
            <Text style={styles.mvpSubtitle}>
              {formatDuration(violationStatsByUser[mvpUserId].totalSeconds)}{" "}
              off-app time
            </Text>
          </View>
        )}

        {isSuccessful && totalViolations === 0 && (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectEmoji}>⭐</Text>
            <Text style={styles.perfectTitle}>Perfect Session!</Text>
            <Text style={styles.perfectText}>
              No violations - amazing focus!
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(tabs)/CreateSessionScreen")}
        >
          <Text style={styles.primaryButtonText}>Start Another Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(tabs)/HomeScreen")}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  outcomeHeader: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    marginBottom: 20,
  },
  failedHeader: {
    backgroundColor: "#FFEBEE",
  },
  outcomeEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  outcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  outcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  failedNote: {
    fontSize: 12,
    color: "#C62828",
    marginTop: 10,
    fontStyle: "italic",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
  },
  violationValue: {
    color: "#FF3B30",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  userViolationCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  userViolationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalTime: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  categoryBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  legendSection: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  legendItem: {
    fontSize: 12,
    color: "#666",
    marginVertical: 2,
  },
  mvpCard: {
    backgroundColor: "#FFF9E6",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  mvpEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  mvpTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  mvpName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginVertical: 5,
  },
  mvpSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  perfectCard: {
    backgroundColor: "#E8F5E9",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25,
  },
  perfectEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  perfectTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 5,
  },
  perfectText: {
    fontSize: 16,
    color: "#666",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SessionReportScreen;

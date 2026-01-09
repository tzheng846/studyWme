import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  auth,
  cancelSession,
  getUser,
  leaveSession,
  Session,
  startSession,
  subscribeToSession,
  UserProfile,
} from "../services/firebase";

const LobbyScreen = () => {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const isLeavingRef = useRef(false); // Track if we initiated the leave

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, (data) => {
      if (!data) {
        // Session was deleted - only show alert if we didn't initiate the leave
        if (!isLeavingRef.current) {
          Alert.alert(
            "Session Cancelled",
            "The host has cancelled this session.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)/HomeScreen"),
              },
            ]
          );
        }
        return;
      }

      setSession(data);

      // Auto-navigate when host starts the session
      if (data.status === "active") {
        router.replace({
          pathname: "/(tabs)/ActiveSessionScreen",
          params: { sessionId },
        });
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Fetch participant profiles
  useEffect(() => {
    const fetchParticipants = async () => {
      if (session?.participants) {
        try {
          const userProfiles = await Promise.all(
            session.participants.map((id) => getUser(id))
          );
          setParticipants(userProfiles.filter(Boolean) as UserProfile[]);
        } catch (error) {
          console.error("Error fetching participants:", error);
        }
      }
    };

    fetchParticipants();
  }, [session?.participants]);

  const isHost = auth.currentUser?.uid === session?.hostId;

  // Handle leaving the lobby
  const handleLeaveLobby = async () => {
    if (!sessionId || !auth.currentUser) return;

    isLeavingRef.current = true; // Mark that we initiated the leave
    try {
      if (isHost) {
        // Host leaving cancels the session
        await cancelSession(sessionId);
      } else {
        // Non-host just removes themselves from participants
        await leaveSession(sessionId, auth.currentUser.uid);
      }
      router.replace("/(tabs)/HomeScreen");
    } catch (error) {
      console.error("Error leaving lobby:", error);
      isLeavingRef.current = false; // Reset on error
      Alert.alert("Error", "Failed to leave lobby");
    }
  };

  // Show confirmation dialog for host, direct leave for participants
  const confirmLeaveLobby = () => {
    if (isHost) {
      Alert.alert(
        "Cancel Session?",
        "Leaving as the host will cancel this session for everyone.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave & Cancel",
            style: "destructive",
            onPress: handleLeaveLobby,
          },
        ]
      );
    } else {
      Alert.alert(
        "Leave Session?",
        "Are you sure you want to leave this session?",
        [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: handleLeaveLobby },
        ]
      );
    }
    return true; // Prevent default back behavior
  };

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      confirmLeaveLobby
    );
    return () => backHandler.remove();
  }, [isHost, sessionId]);

  const handleStartSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      await startSession(sessionId);
      // Navigation handled by subscription listener
    } catch (error) {
      console.error("Error starting session:", error);
      Alert.alert("Error", "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  // Format room code with space in middle (e.g., "482 931")
  const formattedRoomCode = session?.roomCode
    ? `${session.roomCode.slice(0, 3)} ${session.roomCode.slice(3)}`
    : "------";

  const renderParticipant = ({ item }: { item: UserProfile }) => {
    const isSessionHost = item.id === session?.hostId;

    return (
      <View style={styles.participantCard}>
        <View style={styles.participantAvatar}>
          <Text style={styles.participantInitial}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{item.username}</Text>
          {isSessionHost && <Text style={styles.hostBadge}>Host</Text>}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Study Session Lobby</Text>

      {/* Room Code Display */}
      <View style={styles.roomCodeContainer}>
        <Text style={styles.roomCodeLabel}>Room Code</Text>
        <Text style={styles.roomCode}>{formattedRoomCode}</Text>
        <Text style={styles.roomCodeHint}>
          Share this code with others to join
        </Text>
      </View>

      {/* Session Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>{session?.duration} minutes</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Participants:</Text>
          <Text style={styles.infoValue}>{participants.length}</Text>
        </View>
      </View>

      {/* Participants List */}
      <View style={styles.participantsSection}>
        <Text style={styles.sectionTitle}>Participants</Text>
        {participants.length > 0 ? (
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.participantsList}
          />
        ) : (
          <Text style={styles.emptyText}>Waiting for participants...</Text>
        )}
      </View>

      {/* Status Message */}
      {!isHost && (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Waiting for host to start the session...
          </Text>
        </View>
      )}

      {/* Start Button (Host Only) */}
      {isHost && (
        <TouchableOpacity
          style={[styles.startButton, loading && styles.buttonDisabled]}
          onPress={handleStartSession}
          disabled={loading}
        >
          <Text style={styles.startButtonText}>
            {loading ? "Starting..." : "Start Session"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          • The session will start when the host is ready
        </Text>
        <Text style={styles.infoBoxText}>
          • All participants will join automatically
        </Text>
        <Text style={styles.infoBoxText}>
          • Make sure everyone is present before starting
        </Text>
      </View>

      {/* Leave Button */}
      <TouchableOpacity style={styles.leaveButton} onPress={confirmLeaveLobby}>
        <Text style={styles.leaveButtonText}>Leave Lobby</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
    textAlign: "center",
  },
  roomCodeContainer: {
    backgroundColor: "#f0f8ff",
    padding: 25,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  roomCodeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  roomCode: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#007AFF",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 8,
  },
  roomCodeHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  participantsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  participantsList: {
    gap: 10,
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
  },
  participantAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  participantInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  hostBadge: {
    backgroundColor: "#FF9500",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
  statusCard: {
    backgroundColor: "#FFF3CD",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9500",
  },
  statusText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  startButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 12,
  },
  infoBoxText: {
    fontSize: 13,
    color: "#666",
    marginVertical: 3,
  },
  leaveButton: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  leaveButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default LobbyScreen;

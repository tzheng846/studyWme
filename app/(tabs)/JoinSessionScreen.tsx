import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  auth,
  cancelSession,
  getUserActiveSession,
  joinSessionByCode,
  leaveSession,
} from "../services/firebase";

const JoinSessionScreen = () => {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleRoomCodeChange = (text: string) => {
    // Only allow numbers, max 6 digits
    const cleaned = text.replace(/\D/g, "").slice(0, 6);
    setRoomCode(cleaned);
  };

  const handleJoinSession = async () => {
    if (roomCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a 6-digit room code");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to join a session");
      return;
    }

    setLoading(true);
    try {
      // Check if user is already in a session
      const existingSession = await getUserActiveSession(auth.currentUser.uid);

      if (existingSession) {
        setLoading(false);
        const isHost = existingSession.hostId === auth.currentUser.uid;

        Alert.alert(
          "Already in a Session",
          isHost
            ? "You already have an active session. Would you like to go to it or cancel it?"
            : "You're already in another session. Would you like to go to it or leave it?",
          [
            { text: "Stay Here", style: "cancel" },
            {
              text: "Go to Session",
              onPress: () => {
                if (existingSession.status === "active") {
                  router.replace({
                    pathname: "/(tabs)/ActiveSessionScreen",
                    params: { sessionId: existingSession.id },
                  });
                } else {
                  router.replace({
                    pathname: "/(tabs)/LobbyScreen",
                    params: { sessionId: existingSession.id },
                  });
                }
              },
            },
            {
              text: isHost ? "Cancel It" : "Leave It",
              style: "destructive",
              onPress: async () => {
                try {
                  if (isHost) {
                    await cancelSession(existingSession.id);
                  } else {
                    await leaveSession(
                      existingSession.id,
                      auth.currentUser!.uid
                    );
                  }
                  // Now join the new session
                  handleJoinSession();
                } catch (err) {
                  Alert.alert("Error", "Failed to leave existing session");
                }
              },
            },
          ]
        );
        return;
      }

      const sessionId = await joinSessionByCode(roomCode, auth.currentUser.uid);

      router.push({
        pathname: "/(tabs)/LobbyScreen",
        params: { sessionId },
      });
    } catch (error: any) {
      console.error("Error joining session:", error);
      Alert.alert("Error", error.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  // Format code as user types: "123456" → "123 456"
  const formattedCode =
    roomCode.length > 3
      ? `${roomCode.slice(0, 3)} ${roomCode.slice(3)}`
      : roomCode;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Join Study Session</Text>

        <Text style={styles.subtitle}>
          Enter the room code shared by the session host
        </Text>

        {/* Room Code Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Room Code</Text>

          {/* Visual digit boxes */}
          <View style={styles.digitContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.digitBox,
                  index === roomCode.length && styles.digitBoxActive,
                  index === 3 && styles.digitBoxSpacing,
                ]}
              >
                <Text style={styles.digitText}>{roomCode[index] || ""}</Text>
              </View>
            ))}
          </View>

          {/* Hidden input for better mobile experience */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={roomCode}
            onChangeText={handleRoomCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            placeholder=""
          />

          <TouchableOpacity
            style={styles.inputTrigger}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            <Text style={styles.inputTriggerText}>Tap to enter code</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How to Join</Text>
          <Text style={styles.infoText}>
            1. Ask the session host for 6 digit room code
          </Text>
          <Text style={styles.infoText}>
            2. Wait for the host to start the session
          </Text>
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (loading || roomCode.length !== 6) && styles.buttonDisabled,
          ]}
          onPress={handleJoinSession}
          disabled={loading || roomCode.length !== 6}
        >
          <Text style={styles.buttonText}>
            {loading ? "Joining..." : "Join Session"}
          </Text>
        </TouchableOpacity>

        {/* Code Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {roomCode.length} / 6 digits entered
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  digitContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  digitBox: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  digitBoxActive: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  digitBoxSpacing: {
    marginLeft: 12,
  },
  digitText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
  },
  inputTrigger: {
    padding: 10,
    alignItems: "center",
  },
  inputTriggerText: {
    fontSize: 12,
    color: "#007AFF",
  },
  infoBox: {
    backgroundColor: "#f0f8ff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 4,
    paddingLeft: 5,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  progressContainer: {
    alignItems: "center",
  },
  progressText: {
    fontSize: 12,
    color: "#999",
  },
});

export default JoinSessionScreen;

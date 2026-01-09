import { useRouter } from "expo-router";
import React, { useState } from "react";
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
  createSession,
  getUserActiveSession,
  leaveSession,
} from "../services/firebase";

const CreateSessionScreen = () => {
  const router = useRouter();
  const [duration, setDuration] = useState("25");
  const [loading, setLoading] = useState(false);

  const handleCreateSession = async () => {
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert("Error", "Please enter a valid duration");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to create a session");
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
                  // Now create the new session
                  handleCreateSession();
                } catch (err) {
                  Alert.alert("Error", "Failed to leave existing session");
                }
              },
            },
          ]
        );
        return;
      }

      const sessionId = await createSession(
        auth.currentUser.uid,
        [], // Empty participants array (just host)
        parseInt(duration)
      );

      // Navigate to lobby instead of active session
      router.replace({
        pathname: "/(tabs)/LobbyScreen",
        params: { sessionId },
      });
    } catch (error) {
      console.error("Error creating session:", error);
      Alert.alert("Error", "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Study Session</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="25"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Recommended: 25, 50, or 90 minutes</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 Rules</Text>
          <Text style={styles.infoText}>• Stay in the app during session</Text>
          <Text style={styles.infoText}>
            • Exiting app will automatically flag a violation
          </Text>
          <Text style={styles.infoText}>
            • Everyone must agree to end session
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateSession}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Create Session"}
          </Text>
        </TouchableOpacity>
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
    marginBottom: 30,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CreateSessionScreen;

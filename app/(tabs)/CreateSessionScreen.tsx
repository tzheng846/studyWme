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
  createSession,
  getUserByEmail,
  startSession,
} from "../services/firebase";

const CreateSessionScreen = () => {
  const router = useRouter();
  const [duration, setDuration] = useState("25");
  const [friendEmail, setFriendEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateSession = async () => {
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert("Error", "Please enter a valid duration");
      return;
    }

    setLoading(true);
    try {
      const participants = [];

      // Add friend if email provided
      if (friendEmail.trim()) {
        const friend = await getUserByEmail(friendEmail.trim());
        if (friend) {
          participants.push(friend.id);
        } else {
          Alert.alert("Warning", "Friend not found, starting solo session");
        }
      }

      if (!auth.currentUser) {
        Alert.alert("Error", "You must be logged in to create a session");
        return;
      }

      const sessionId = await createSession(
        auth.currentUser.uid,
        participants,
        parseInt(duration)
      );

      await startSession(sessionId);

      router.replace({
        pathname: "/(tabs)/ActiveSessionScreen",
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Study Partner (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="friend@email.com"
            value={friendEmail}
            onChangeText={setFriendEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Enter friend's email to study together
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 Rules</Text>
          <Text style={styles.infoText}>• Stay in the app during session</Text>
          <Text style={styles.infoText}>• Report if you check your phone</Text>
          <Text style={styles.infoText}>• Everyone must agree to end</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateSession}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Start Session"}
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

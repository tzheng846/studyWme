import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { auth, db, updateUserStats } from "../services/firebase";
const SessionReportScreen = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadSession();
  }, []);
  const loadSession = async () => {
    try {
      const docSnap = await getDoc(doc(db, "sessions", sessionId));
      if (docSnap.exists()) {
        const sessionData = { id: docSnap.id, ...docSnap.data() };
        setSession(sessionData);
        // Update user stats
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
  } // Calculate stats
  const violationsByUser = {};
  session.violations?.forEach((v) => {
    violationsByUser[v.userId] = (violationsByUser[v.userId] || 0) + 1;
  });
  const sortedUsers = Object.entries(violationsByUser).sort(
    (a, b) => a[1] - b[1]
  );
  const mvpUserId = sortedUsers[0]?.[0];
  const totalViolations = session.violations?.length || 0;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Session Complete!</Text>
          <Text style={styles.successSubtitle}>
            Great job studying together
          </Text>
        </View>
        {/* Stats Cards */}
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
            <Text style={styles.statValue}>{totalViolations}</Text>
            <Text style={styles.statLabel}>Violations</Text>
          </View>
        </View>
        {/* Violations Breakdown */}
        {totalViolations > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Violations by Participant</Text>
            {Object.entries(violationsByUser).map(([userId, count]) => (
              <View key={userId} style={styles.violationRow}>
                <Text style={styles.userId}>
                  {userId === auth.currentUser?.uid
                    ? "You"
                    : userId.substring(0, 8)}
                </Text>
                <View style={styles.violationBadge}>
                  <Text style={styles.violationCount}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {/* MVP Award */}
        {mvpUserId && (
          <View style={styles.mvpCard}>
            <Text style={styles.mvpEmoji}>🏆</Text>
            <Text style={styles.mvpTitle}>MVP - Most Focused</Text>
            <Text style={styles.mvpName}>
              {mvpUserId === auth.currentUser?.uid
                ? "You!"
                : mvpUserId.substring(0, 8)}
            </Text>
            <Text style={styles.mvpSubtitle}>
              Only {violationsByUser[mvpUserId]} violation(s)
            </Text>
          </View>
        )}
        {totalViolations === 0 && (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectEmoji}>⭐</Text>
            <Text style={styles.perfectTitle}>Perfect Session!</Text>
            <Text style={styles.perfectText}>
              No violations - amazing focus!
            </Text>
          </View>
        )}
        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("CreateSessionScreen")}
        >
          <Text style={styles.primaryButtonText}>Start Another Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("HomeScreen")}
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
  successHeader: {
    alignItems: "center",
    paddingVertical: 30,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666",
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
  violationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userId: {
    fontSize: 16,
    color: "#333",
  },
  violationBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  violationCount: {
    color: "#fff",
    fontWeight: "600",
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

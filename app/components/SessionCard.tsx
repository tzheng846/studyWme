import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Session } from "../services/firebase";

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onPress }) => {
  const getStatusColor = (status: Session["status"]): string => {
    switch (status) {
      case "active":
        return "#34C759";
      case "ended":
        return "#007AFF";
      case "pending":
        return "#FF9500";
      default:
        return "#999";
    }
  };

  const getStatusText = (status: Session["status"]): string => {
    switch (status) {
      case "active":
        return "In Progress";
      case "ended":
        return "Completed";
      case "pending":
        return "Waiting";
      default:
        return status;
    }
  };

  const formatDate = (timestamp: Date | null): string => {
    if (!timestamp) return "Unknown";
    const date =
      timestamp instanceof Date
        ? timestamp
        : (timestamp as { toDate?: () => Date }).toDate?.() ||
          new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={session.status === "pending"}
    >
      <View style={styles.header}>
        <Text style={styles.duration}>{session.duration} min</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(session.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(session.status)}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          {session.participants?.length || 1} participant(s)
        </Text>
        <Text style={styles.infoText}>
          {session.violations?.length || 0} violation(s)
        </Text>
      </View>

      <Text style={styles.date}>{formatDate(session.createdAt)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  duration: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  info: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
});

export default SessionCard;

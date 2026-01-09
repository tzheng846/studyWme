import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { auth, Violation } from "../services/firebase";

interface ViolationListProps {
  violations: Violation[];
}

const ViolationList: React.FC<ViolationListProps> = ({ violations }) => {
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderViolation = ({
    item,
  }: {
    item: Violation;
  }): React.ReactElement => {
    const isCurrentUser = item.userId === auth.currentUser?.uid;

    return (
      <View style={styles.violationItem}>
        <View style={styles.violationHeader}>
          <Text style={styles.violationUser}>
            {isCurrentUser ? "You" : item.userId.substring(0, 8)}
          </Text>
          <Text style={styles.violationTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={styles.violationType}>{item.type.replace("_", " ")}</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={violations}
      renderItem={renderViolation}
      keyExtractor={(item, index) => `${item.userId}-${index}`}
      scrollEnabled={false}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No violations yet</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  violationItem: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9500",
  },
  violationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  violationUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  violationTime: {
    fontSize: 12,
    color: "#666",
  },
  violationType: {
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    padding: 20,
  },
});

export default ViolationList;

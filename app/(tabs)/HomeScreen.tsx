import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { auth, logout, wipeUserHistory } from "../services/firebase";

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const breathingAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const clickScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathingAnim, {
            toValue: 1.08,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breathingAnimation.start();
    return () => breathingAnimation.stop();
  }, []);

  useEffect(() => {
    const gradientAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    gradientAnimation.start();
    return () => gradientAnimation.stop();
  }, []);

  const toggleDropdown = (): void => setShowDropdown(!showDropdown);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      Alert.alert("Error", "Failed to logout");
    }
  };

  const handleWipeHistory = async (): Promise<void> => {
    setShowDropdown(false);
    Alert.alert(
      "Wipe History",
      "This will delete all sessions and reset your stats to 0. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe",
          style: "destructive",
          onPress: async () => {
            try {
              if (!auth.currentUser) {
                Alert.alert("Error", "You must be logged in");
                return;
              }
              await wipeUserHistory(auth.currentUser.uid);
              Alert.alert("Success", "History wiped successfully");
            } catch (error) {
              console.error("Error wiping history:", error);
              Alert.alert("Error", "Failed to wipe history");
            }
          },
        },
      ]
    );
  };

  const goToAccountHistory = (): void => {
    setShowDropdown(false);
    router.push("/(tabs)/AccountHistoryScreen");
  };

  const handleStartPress = (): void => {
    Animated.sequence([
      Animated.timing(clickScaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(clickScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(clickScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push("/(tabs)/CreateSessionScreen");
    });
  };

  return (
    <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={["#667eea", "#764ba2", "#f093fb"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: gradientAnim }]}
          >
            <LinearGradient
              colors={["#4DA6FF", "#007AFF", "#26C6DA"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.accountButton} onPress={toggleDropdown}>
          <Text style={styles.accountButtonText}>
            {auth.currentUser?.email?.charAt(0).toUpperCase() || "A"}
          </Text>
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={goToAccountHistory}
            >
              <Text style={styles.dropdownText}>View Account History</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleWipeHistory}
            >
              <Text style={[styles.dropdownText, styles.dangerText]}>
                Wipe History
              </Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowDropdown(false);
                handleLogout();
              }}
            >
              <Text style={[styles.dropdownText, styles.dangerText]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.centerContent}>
          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(breathingAnim, clickScaleAnim) },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.circleButton}
              onPress={handleStartPress}
              activeOpacity={0.9}
            >
              <Text style={styles.circleButtonText}>Start as Host</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => router.push("/(tabs)/JoinSessionScreen")}
            activeOpacity={0.8}
          >
            <Text style={styles.pillButtonText}>Join Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accountButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  accountButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dropdownMenu: {
    position: "absolute",
    top: 100,
    right: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },
  dangerText: {
    color: "#FF3B30",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circleButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  circleButtonText: {
    color: "#667eea",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  pillButton: {
    width: 200,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pillButtonText: {
    color: "#667eea",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;

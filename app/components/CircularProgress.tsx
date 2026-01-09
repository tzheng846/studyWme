import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 200,
  strokeWidth = 12,
  progressColor = "#007AFF",
  backgroundColor = "#E8E8E8",
  children,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const halfSize = size / 2;
  const radius = halfSize - strokeWidth / 2;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // First half rotation (starts hidden at -180deg, rotates to 0deg for 0-50% progress)
  const firstHalfRotation = animatedProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "0deg", "0deg"],
  });

  // Second half rotation (starts at 0deg, rotates to 180deg for 50-100% progress)
  const secondHalfRotation = animatedProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "-180deg", "0deg"],
  });

  // Opacity for second half (only visible after 50%)
  const secondHalfOpacity = animatedProgress.interpolate({
    inputRange: [0, 0.5, 0.5001, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.backgroundCircle,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* First half (right side, 0-50%) */}
      <View
        style={[
          styles.halfCircleContainer,
          {
            width: halfSize,
            height: size,
            left: halfSize,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.halfCircle,
            {
              width: halfSize,
              height: size,
              borderTopRightRadius: halfSize,
              borderBottomRightRadius: halfSize,
              borderWidth: strokeWidth,
              borderLeftWidth: 0,
              borderColor: progressColor,
              transform: [
                { translateX: -halfSize / 2 },
                { rotate: firstHalfRotation },
                { translateX: halfSize / 2 },
              ],
            },
          ]}
        />
      </View>

      {/* Second half (left side, 50-100%) */}
      <Animated.View
        style={[
          styles.halfCircleContainer,
          {
            width: halfSize,
            height: size,
            left: 0,
            opacity: secondHalfOpacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.halfCircle,
            {
              width: halfSize,
              height: size,
              borderTopLeftRadius: halfSize,
              borderBottomLeftRadius: halfSize,
              borderWidth: strokeWidth,
              borderRightWidth: 0,
              borderColor: progressColor,
              transform: [
                { translateX: halfSize / 2 },
                { rotate: secondHalfRotation },
                { translateX: -halfSize / 2 },
              ],
            },
          ]}
        />
      </Animated.View>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundCircle: {
    position: "absolute",
  },
  halfCircleContainer: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  halfCircle: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CircularProgress;

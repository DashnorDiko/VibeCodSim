import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { formatNumber } from "../../utils/formatNumber";

interface WelcomeBackToastProps {
  earned: number;
  offlineSeconds: number;
  onDismiss: () => void;
}

export const WelcomeBackToast: React.FC<WelcomeBackToastProps> = ({
  earned,
  offlineSeconds,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const formatDuration = (secs: number): string => {
    if (secs < 60) return `${Math.floor(secs)}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  useEffect(() => {
    // Slide up + fade in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 90,
        left: 20,
        right: 20,
        zIndex: 999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: "#0d0d0d",
          borderWidth: 1,
          borderColor: "#3E80FB",
          borderRadius: 10,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#3E80FB",
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 22 }}>💤</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#3E80FB",
              fontWeight: "bold",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontFamily: "monospace",
            }}
          >
            OFFLINE PROGRESS
          </Text>
          <Text
            style={{
              color: "#d4d4d4",
              fontSize: 13,
              marginTop: 2,
              fontFamily: "monospace",
            }}
          >
            Away for {formatDuration(offlineSeconds)} →{" "}
            <Text style={{ color: "#39FF14", fontWeight: "bold" }}>
              +{formatNumber(earned)} LoC
            </Text>
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

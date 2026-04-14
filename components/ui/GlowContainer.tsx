import React from "react";
import { View, Platform, type ViewProps } from "react-native";

interface GlowContainerProps extends ViewProps {
  color?: "blue" | "green" | "purple" | "red" | "yellow";
  intensity?: "low" | "medium" | "high";
}

const glowColors = {
  blue: "#00D4FF",
  green: "#39FF14",
  purple: "#BF40FF",
  red: "#FF073A",
  yellow: "#F3F315",
} as const;

const radiusMap = {
  low: 8,
  medium: 16,
  high: 24,
} as const;

export const GlowContainer: React.FC<GlowContainerProps> = ({
  color = "blue",
  intensity = "medium",
  style,
  className = "",
  children,
  ...props
}) => {
  const glowColor = glowColors[color];
  const radius = radiusMap[intensity];

  const glowStyle =
    Platform.OS === "web"
      ? { boxShadow: `0 0 ${radius}px ${glowColor}99, 0 0 ${radius * 2}px ${glowColor}33` }
      : {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: radius,
          elevation: radius,
        };

  return (
    <View
      className={`border border-surface-light rounded-2xl bg-surface ${className}`}
      style={[glowStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
};

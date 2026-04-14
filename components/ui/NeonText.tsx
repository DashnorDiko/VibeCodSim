import React from "react";
import { Text, Platform, type TextProps } from "react-native";

interface NeonTextProps extends TextProps {
  color?: "blue" | "green" | "purple" | "white" | "red" | "yellow";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const colorMap = {
  blue: { text: "text-neon-blue", shadow: "#00D4FF" },
  green: { text: "text-neon-green", shadow: "#39FF14" },
  purple: { text: "text-neon-purple", shadow: "#BF40FF" },
  red: { text: "text-neon-red", shadow: "#FF073A" },
  yellow: { text: "text-neon-yellow", shadow: "#F3F315" },
  white: { text: "text-white", shadow: "#FFFFFF" },
} as const;

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
  "2xl": "text-4xl",
} as const;

export const NeonText: React.FC<NeonTextProps> = ({
  color = "blue",
  size = "md",
  style,
  className = "",
  children,
  ...props
}) => {
  const { text, shadow } = colorMap[color];
  const fontSize = sizeMap[size];

  const glowStyle =
    Platform.OS === "web"
      ? { textShadow: `0 0 10px ${shadow}, 0 0 20px ${shadow}40` }
      : {
          textShadowColor: shadow,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        };

  return (
    <Text
      className={`${text} ${fontSize} font-bold ${className}`}
      style={[glowStyle, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

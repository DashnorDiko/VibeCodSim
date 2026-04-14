import React, { useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useGameStore, REBOOT_THRESHOLD } from "../../store/gameStore";
import { formatNumber } from "../../utils/formatNumber";

const HOLD_DURATION = 2000; // 2 seconds hold-to-confirm

export const RebootButton: React.FC = () => {
  const neuralTokens = useGameStore((s) => s.neuralTokens);
  const rebootCount = useGameStore((s) => s.rebootCount);
  const reboot = useGameStore((s) => s.reboot);

  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const canReboot = neuralTokens >= REBOOT_THRESHOLD;

  if (!canReboot) return null;

  const handlePressIn = () => {
    setHolding(true);
    holdAnimation.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    holdAnimation.current.start(({ finished }) => {
      if (finished) {
        reboot();
        setHolding(false);
        progress.setValue(0);
      }
    });
  };

  const handlePressOut = () => {
    holdAnimation.current?.stop();
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FF073A",
        backgroundColor: "#1a0005",
        overflow: "hidden",
      }}
    >
      {/* Hold progress bar */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: progressWidth,
          backgroundColor: "rgba(255, 7, 58, 0.15)",
        }}
      />

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ padding: 16 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FF073A",
                fontWeight: "bold",
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontFamily: "monospace",
              }}
            >
              ⚡ REBOOT SYSTEM
            </Text>
            <Text
              style={{
                color: "#858585",
                fontSize: 11,
                marginTop: 3,
                fontFamily: "monospace",
              }}
            >
              Vibe v{rebootCount + 1}.0.0 → +1 Overclock Level
            </Text>
            <Text
              style={{
                color: "#555",
                fontSize: 10,
                marginTop: 2,
                fontFamily: "monospace",
              }}
            >
              {holding ? "HOLD TO CONFIRM..." : "Hold 2s to reboot"}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "#2a0008",
              borderRadius: 6,
              padding: 8,
              borderWidth: 1,
              borderColor: "#FF073A44",
            }}
          >
            <Text
              style={{
                color: "#FF073A",
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              {formatNumber(REBOOT_THRESHOLD)} LoC
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, Easing } from "react-native";
import { useGameStore } from "../../store/gameStore";

export const BonusWordTarget: React.FC = () => {
  const activeBonusWord = useGameStore((s) => s.activeBonusWord);
  const bonusWordPosition = useGameStore((s) => s.bonusWordPosition);
  const claimBonusWord = useGameStore((s) => s.claimBonusWord);

  const scale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!activeBonusWord) return;

    // Pop in
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 120,
    }).start();

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      // Reset for next word
      scale.setValue(0);
      glowOpacity.setValue(0.4);
    };
  }, [activeBonusWord]);

  const handlePress = () => {
    Animated.timing(scale, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      claimBonusWord();
    });
  };

  if (!activeBonusWord || !bonusWordPosition) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: `${bonusWordPosition.y}%`,
        left: `${bonusWordPosition.x}%`,
        transform: [{ scale }],
        zIndex: 60,
      }}
    >
      <Pressable onPress={handlePress}>
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: "#F3F315",
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "rgba(243, 243, 21, 0.1)",
            opacity: glowOpacity,
            shadowColor: "#F3F315",
            shadowOpacity: 0.8,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: "#F3F315",
              fontFamily: "monospace",
              fontSize: 15,
              fontWeight: "bold",
              letterSpacing: 1.5,
            }}
          >
            {activeBonusWord}
          </Text>
        </Animated.View>
        <Text
          style={{
            color: "#a0a0a0",
            fontSize: 9,
            textAlign: "center",
            marginTop: 3,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          TAP!
        </Text>
      </Pressable>
    </Animated.View>
  );
};

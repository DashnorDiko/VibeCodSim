import React from "react";
import { View, Text, Pressable } from "react-native";
import { useGameStore } from "../../store/gameStore";
import type { BuyMultiplier } from "../../utils/scaling";
import { T } from "../../constants/theme";

export const BuyMultiplierToggle: React.FC = () => {
  const buyMultiplier = useGameStore((s) => s.buyMultiplier);
  const setBuyMultiplier = useGameStore((s) => s.setBuyMultiplier);

  const options: BuyMultiplier[] = [1, 10, 100, "MAX"];

  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: T.bg.elevated,
      borderRadius: T.radius.lg,
      padding: T.space.sm,
      marginHorizontal: T.space.lg,
      marginBottom: T.space.md,
      borderWidth: 1,
      borderColor: T.border.subtle,
    }}>
      <Text style={{
        fontFamily: T.mono,
        color: T.text.secondary,
        fontSize: T.font.sm,
        marginLeft: T.space.sm,
      }}>
        Buy:
      </Text>
      <View style={{ flexDirection: "row", gap: T.space.xs }}>
        {options.map((opt) => {
          const isActive = buyMultiplier === opt;
          return (
            <Pressable
              key={opt.toString()}
              onPress={() => setBuyMultiplier(opt)}
              style={({ pressed }) => ({
                backgroundColor: isActive ? T.accent.blueAlt + "33" : "transparent",
                borderWidth: 1,
                borderColor: isActive ? T.accent.blueAlt : "transparent",
                paddingVertical: T.space.xs,
                paddingHorizontal: T.space.md,
                borderRadius: T.radius.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{
                fontFamily: T.mono,
                fontWeight: isActive ? "bold" : "normal",
                color: isActive ? T.accent.blueAlt : T.text.muted,
                fontSize: T.font.sm,
              }}>
                {opt === "MAX" ? "MAX" : `${opt}x`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

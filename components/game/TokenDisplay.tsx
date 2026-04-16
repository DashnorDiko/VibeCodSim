import React from "react";
import { View, Text, Image, Platform } from "react-native";
import { Zap } from "lucide-react-native";
import { useGameStore } from "../../store/gameStore";
import { formatNumber } from "../../utils/formatNumber";
import { T } from "../../constants/theme";

const glowStyle = Platform.OS === "web"
  ? { textShadow: `0 0 12px ${T.accent.blue}66, 0 0 24px ${T.accent.blue}22` } as any
  : { textShadowColor: `${T.accent.blue}66`, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } };

export const TokenDisplay: React.FC = () => {
  const locCount = useGameStore((s) => s.locCount);
  const tokens = useGameStore((s) => s.tokens);
  const locPerSecond = useGameStore((s) => s.locPerSecond);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const strainLevel = useGameStore((s) => s.strainLevel);
  const isBurnedOut = useGameStore((s) => s.isBurnedOut);
  const comboCount = useGameStore((s) => s.comboCount ?? 0);
  const useScientificNotation = useGameStore((s) => s.useScientificNotation);

  const strainColor = isBurnedOut ? T.accent.red : strainLevel > 80 ? T.accent.yellow : T.text.muted;

  return (
    <View style={{ gap: T.space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.md }}>
        <View style={{
          backgroundColor: `${T.accent.blue}15`,
          borderRadius: T.radius.md,
          padding: T.space.sm,
          borderWidth: 1,
          borderColor: `${T.accent.blue}30`,
        }}>
          <Zap size={22} color={T.accent.blue} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: "#ffffff",
            fontSize: T.font["2xl"],
            fontWeight: "800",
            fontFamily: T.mono,
            ...glowStyle,
          }}>
            {formatNumber(locCount)}{" "}
            <Text style={{ color: T.accent.blue, fontSize: T.font.base, fontWeight: "600" }}>LoC</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.sm, marginTop: T.space.xs }}>
            <View style={{
              backgroundColor: T.bg.surface,
              borderRadius: 999,
              paddingHorizontal: T.space.sm,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: T.border.subtle,
            }}>
              <Text style={{ color: T.text.secondary, fontSize: T.font.xs, fontFamily: T.mono }}>
                {formatNumber(locPerSecond)}/sec
              </Text>
            </View>
            <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono }}>
              x{incomeMultiplier.toFixed(1)}
            </Text>
            {comboCount > 0 && (
              <View style={{
                backgroundColor: `${T.accent.green}20`,
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: `${T.accent.green}40`,
              }}>
                <Text style={{ color: T.accent.green, fontSize: T.font.xs, fontFamily: T.mono, fontWeight: "bold" }}>
                  {comboCount}x
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: T.space.sm,
        paddingLeft: T.space.xs,
        borderLeftWidth: 3,
        borderLeftColor: `${T.accent.green}60`,
        marginLeft: T.space.xs,
      }}>
        <Image
          source={require("../../assets/images/energy_drink.png")}
          resizeMode="contain"
          style={{ width: 16, height: 16 }}
          accessibilityLabel="Tokens"
        />
        <Text style={{ color: T.accent.green, fontSize: T.font.lg, fontWeight: "bold", fontFamily: T.mono }}>
          {formatNumber(tokens)}
        </Text>
        <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textTransform: "uppercase" }}>
          Tokens
        </Text>
      </View>

      <Text style={{ color: strainColor, fontSize: T.font.xs, fontFamily: T.mono, marginLeft: T.space.xs }}>
        {isBurnedOut ? "BURNOUT: cooling down" : `Strain ${Math.floor(strainLevel)}%`}
      </Text>
    </View>
  );
};

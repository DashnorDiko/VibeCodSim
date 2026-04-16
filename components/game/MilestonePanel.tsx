import React from "react";
import { Pressable, Text, View } from "react-native";
import { MILESTONES, useGameStore } from "../../store/gameStore";
import { formatNumber } from "../../utils/formatNumber";
import { T } from "../../constants/theme";

export const MilestonePanel: React.FC = () => {
  const lifetimeLoc = useGameStore((s) => s.lifetimeLoc);
  const rebootCount = useGameStore((s) => s.rebootCount);
  const milestoneClaims = useGameStore((s) => s.milestoneClaims);
  const claimMilestone = useGameStore((s) => s.claimMilestone);
  const useScientificNotation = useGameStore((s) => s.useScientificNotation);

  return (
    <View style={{ marginHorizontal: T.space.lg, marginBottom: T.space.lg }}>
      <Text style={{
        color: T.accent.green,
        textTransform: "uppercase",
        fontSize: T.font.sm,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: T.space.sm,
        fontFamily: T.mono,
      }}>
        Milestones
      </Text>

      {MILESTONES.map((milestone) => {
        const claimed = milestoneClaims.includes(milestone.id);
        const locTarget = milestone.lifetimeLoc ?? 0;
        const rebootTarget = milestone.rebootCount ?? 0;
        const locProgress = locTarget === 0 ? 1 : Math.min(1, lifetimeLoc / locTarget);
        const rebootProgress = rebootTarget === 0 ? 1 : Math.min(1, rebootCount / rebootTarget);
        const done = locProgress >= 1 && rebootProgress >= 1;
        const canClaim = done && !claimed;
        const blendedProgress = Math.min(1, (locProgress + rebootProgress) / 2);

        return (
          <View
            key={milestone.id}
            style={{
              borderRadius: T.radius.md,
              borderWidth: 1,
              borderColor: claimed ? "#2a5331" : canClaim ? "#416846" : T.border.subtle,
              backgroundColor: claimed ? "#102014" : T.bg.surface,
              padding: T.space.lg,
              marginBottom: T.space.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.sm }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: claimed ? T.accent.green : canClaim ? `${T.accent.green}44` : T.bg.elevated,
                alignItems: "center", justifyContent: "center",
                borderWidth: 1,
                borderColor: claimed ? T.accent.green : T.border.default,
              }}>
                <Text style={{ color: claimed ? "#000" : T.text.muted, fontSize: 11, fontWeight: "bold" }}>
                  {claimed ? "✓" : ""}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: claimed ? "#85cf91" : T.text.primary,
                  fontWeight: "600", fontSize: T.font.base,
                  fontFamily: T.mono,
                  textDecorationLine: claimed ? "line-through" : "none",
                }}>
                  {milestone.title}
                </Text>
              </View>
            </View>
            <Text style={{ color: T.text.secondary, fontSize: T.font.sm, marginTop: T.space.xs, marginLeft: 30 }}>
              {milestone.description}
            </Text>
            {locTarget > 0 && (
              <Text style={{ color: T.text.muted, fontSize: T.font.xs, marginTop: T.space.xs, fontFamily: T.mono, marginLeft: 30 }}>
                LoC: {formatNumber(lifetimeLoc)} / {formatNumber(locTarget)}
              </Text>
            )}
            {rebootTarget > 0 && (
              <Text style={{ color: T.text.muted, fontSize: T.font.xs, marginTop: 2, fontFamily: T.mono, marginLeft: 30 }}>
                Reboots: {rebootCount} / {rebootTarget}
              </Text>
            )}
            <Text style={{ color: "#5f7fbd", fontSize: T.font.xs, marginTop: T.space.xs, fontFamily: T.mono, marginLeft: 30 }}>
              +{milestone.rewardLoc ?? 0} LoC · +{milestone.rewardTokens ?? 0} Tokens · +{milestone.rewardArchitecturePoints ?? 0} AP
            </Text>

            <View style={{
              marginTop: T.space.sm, height: 6, borderRadius: 999,
              backgroundColor: T.bg.base, overflow: "hidden", marginLeft: 30,
            }}>
              <View style={{
                width: `${Math.floor(blendedProgress * 100)}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: claimed ? "#3a8f4b" : canClaim ? T.accent.green : "#37538f",
              }} />
            </View>

            <Pressable
              onPress={() => claimMilestone(milestone.id)}
              disabled={!canClaim}
              style={({ pressed }) => ({
                marginTop: T.space.sm,
                borderRadius: T.radius.sm,
                paddingVertical: T.space.md,
                alignItems: "center",
                backgroundColor: claimed ? "#1d3c23" : canClaim ? "#235838" : T.bg.elevated,
                opacity: pressed && canClaim ? 0.8 : 1,
                marginLeft: 30,
              })}
            >
              <Text style={{
                color: claimed ? "#95d8a2" : canClaim ? "#d9ffe4" : T.text.muted,
                fontSize: T.font.sm, fontFamily: T.mono, fontWeight: "600",
              }}>
                {claimed ? "✓ Claimed" : canClaim ? "Claim Reward" : "In Progress"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

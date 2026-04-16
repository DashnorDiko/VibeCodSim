import { Cpu, GitBranch, Keyboard, Lock, Radar, Server, Terminal, Workflow, Zap } from "lucide-react-native";
import React, { useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import { T } from "../../constants/theme";
import { getCloudBurstIncomeMultiplierFromNodes } from "../../store/economy";
import { getTierUnlockRequirement, getUpgradeCostMultiplier, useGameStore } from "../../store/gameStore";
import { USE_NATIVE_ANIM_DRIVER } from "../../utils/animatedNativeDriver";
import { formatNumber } from "../../utils/formatNumber";
import type { UpgradeType } from "../../utils/scaling";
import { getUpgradeTierLabel, getBulkUpgradeInfo } from "../../utils/scaling";

interface UpgradeCardProps {
  type: "autoCoder" | "server" | "keyboard" | "aiPair" | "gitAutopilot" | "cloudBurst" | "ciPipeline" | "observability";
  title: string;
  unlocksAt?: number;
  description?: string;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({ type, title, unlocksAt, description }) => {
  const {
    locCount,
    lifetimeLoc,
    rebootCount,
    milestoneClaims,
    unlockedMetaNodes,
    tokens,
    cloudBurstActive,
    buyMultiplier,
  } = useGameStore(
    useShallow((s) => ({
      locCount: s.locCount,
      lifetimeLoc: s.lifetimeLoc,
      rebootCount: s.rebootCount,
      milestoneClaims: s.milestoneClaims,
      unlockedMetaNodes: s.unlockedMetaNodes,
      tokens: s.tokens,
      cloudBurstActive: s.cloudBurstActive,
      buyMultiplier: s.buyMultiplier,
    }))
  );

  const level = useGameStore((s) => {
    if (type === "autoCoder") return s.autoCoderLevel;
    if (type === "server") return s.serverLevel;
    if (type === "keyboard") return s.keyboardLevel;
    if (type === "aiPair") return s.aiPairLevel;
    if (type === "gitAutopilot") return s.gitAutopilotLevel;
    if (type === "ciPipeline") return s.ciPipelineLevel;
    if (type === "observability") return s.observabilityLevel;
    return 0;
  });

  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
  const purchaseHiddenUpgrade = useGameStore((s) => s.purchaseHiddenUpgrade);
  const activateCloudBurst = useGameStore((s) => s.activateCloudBurst);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const accent = T.upgradeAccent(type);

  const lifetimeRequirement = type === "aiPair" ? 500 : type === "gitAutopilot" ? 5_000 : type === "cloudBurst" ? 50_000 : type === "ciPipeline" ? 250_000 : type === "observability" ? 1_000_000 : undefined;
  const rebootRequirement = type === "ciPipeline" ? 1 : type === "observability" ? 2 : undefined;
  const requiredMilestoneId = type === "ciPipeline" ? "m_first_reboot" : type === "observability" ? "m_scale_1m" : undefined;
  const lockedByLegacy = unlocksAt !== undefined && lifetimeLoc < unlocksAt;

  const isLocked = lockedByLegacy
    || (lifetimeRequirement !== undefined && lifetimeLoc < lifetimeRequirement)
    || (rebootRequirement !== undefined && rebootCount < rebootRequirement)
    || (requiredMilestoneId !== undefined && !milestoneClaims.includes(requiredMilestoneId));

  const lockReasons: string[] = [];
  if (lifetimeRequirement !== undefined && lifetimeLoc < lifetimeRequirement) lockReasons.push(`${formatNumber(lifetimeRequirement)} total LoC`);
  if (rebootRequirement !== undefined && rebootCount < rebootRequirement) lockReasons.push(`${rebootRequirement} reboot(s)`);
  if (requiredMilestoneId && !milestoneClaims.includes(requiredMilestoneId)) lockReasons.push("milestone");

  const usesAdvanced =
    type === "aiPair" ||
    type === "gitAutopilot" ||
    type === "ciPipeline" ||
    type === "observability";
  const costMult = getUpgradeCostMultiplier(type as UpgradeType);
  const metaDiscount = unlockedMetaNodes.includes("couponCompiler") ? 0.12 : 0;

  const bulkInfo = useMemo(
    () => {
      if (isLocked || type === "cloudBurst") {
        return {
          totalCost: 0,
          levelsGained: 0,
          isAffordable: false,
          isTierLocked: false,
          nextSingleCost: 0,
        };
      }
      return getBulkUpgradeInfo(level, buyMultiplier, locCount, lifetimeLoc, {
        costMultiplier: costMult,
        metaDiscount,
      });
    },
    [isLocked, type, level, buyMultiplier, locCount, lifetimeLoc, costMult, metaDiscount]
  );

  if (isLocked) {
    return (
      <View style={{
        marginHorizontal: T.space.lg,
        marginBottom: T.space.md,
        padding: T.space.lg,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: T.border.subtle,
        backgroundColor: T.bg.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: T.space.md,
        opacity: 0.6,
      }}>
        <View style={{ backgroundColor: T.bg.elevated, borderRadius: T.radius.md, padding: T.space.md }}>
          <Lock size={20} color={T.text.disabled} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.text.disabled, fontWeight: "600", fontSize: T.font.base, fontFamily: T.mono }}>
            {title}
          </Text>
          <Text style={{ color: T.text.muted, fontSize: T.font.sm, marginTop: T.space.xs, fontFamily: T.mono }}>
            Requires: {lockReasons.join(" + ") || `${formatNumber(unlocksAt ?? 0)} LoC`}
          </Text>
        </View>
      </View>
    );
  }

  if (type === "cloudBurst") {
    const canToggleOn = !cloudBurstActive && tokens >= 1;
    const canInteract = cloudBurstActive || canToggleOn;

    return (
      <View style={{
        marginHorizontal: T.space.lg,
        marginBottom: T.space.md,
        padding: T.space.lg,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderLeftWidth: 3,
        borderLeftColor: cloudBurstActive ? T.accent.green : canToggleOn ? T.accent.blueAlt : T.border.default,
        borderColor: cloudBurstActive ? `${T.accent.green}55` : T.border.default,
        backgroundColor: T.bg.overlay,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.lg }}>
          <View style={{ backgroundColor: T.bg.surface, borderRadius: T.radius.md, padding: T.space.md }}>
            <Zap size={24} color={cloudBurstActive ? T.accent.green : canToggleOn ? T.accent.blueAlt : T.text.muted} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: T.font.lg, fontWeight: "600", color: cloudBurstActive ? T.accent.green : T.text.primary, fontFamily: T.mono }}>
              {title}
            </Text>
            <Text style={{
              color: T.text.muted, fontSize: T.font.xs, marginTop: T.space.xs, fontFamily: T.mono, minHeight: 30
            }}>
              {(() => {
                const cloudBurstMult = Math.round(
                  getCloudBurstIncomeMultiplierFromNodes(unlockedMetaNodes)
                );
                return cloudBurstActive
                  ? `${cloudBurstMult}x LoC — draining 1%/sec (${formatNumber(Math.floor(tokens))} Tokens left)`
                  : `Toggle ${cloudBurstMult}x LoC production (drains 1% Tokens/sec)`;
              })()}
            </Text>
          </View>
          <Pressable
            onPress={activateCloudBurst}
            disabled={!canInteract}
            style={({ pressed }) => ({
              borderRadius: T.radius.md,
              paddingVertical: T.space.md,
              backgroundColor: cloudBurstActive ? "#1b5e20" : canToggleOn ? "#0e639c" : T.bg.elevated,
              borderWidth: 1,
              borderColor: cloudBurstActive ? `${T.accent.green}66` : canToggleOn ? `${T.accent.blueAlt}66` : T.border.focus,
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              width: 110,
              alignItems: "center" as const,
              justifyContent: "center" as const,
            })}
          >
            <Text style={{
              fontFamily: T.mono, fontSize: 9, fontWeight: "800",
              color: cloudBurstActive ? T.accent.green : canToggleOn ? T.accent.blueAlt : T.text.disabled,
              letterSpacing: 2, textTransform: "uppercase", textAlign: "center",
              marginBottom: 3,
            }}>
              {cloudBurstActive ? "ACTIVE" : "BOOST"}
            </Text>
            <Text style={{ fontFamily: T.mono, fontSize: T.font.sm + 1, color: canInteract ? "#fff" : T.text.muted, fontWeight: "700", textAlign: "center" }}>
              {cloudBurstActive ? "ON" : "OFF"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const cost = bulkInfo.totalCost;
  const nextCost = bulkInfo.nextSingleCost;
  const canAfford = bulkInfo.isAffordable;
  
  const tierLabel = getUpgradeTierLabel(level);
  const tierReq = getTierUnlockRequirement(Math.floor(level / 20) + 1);
  const tierUnlocked = lifetimeLoc >= tierReq;

  const getIcon = () => {
    const c = canAfford ? accent : T.text.muted;
    if (type === "server") return <Server size={22} color={c} strokeWidth={1.5} />;
    if (type === "keyboard") return <Keyboard size={22} color={c} strokeWidth={1.5} />;
    if (type === "aiPair") return <Cpu size={22} color={c} strokeWidth={1.5} />;
    if (type === "gitAutopilot") return <GitBranch size={22} color={c} strokeWidth={1.5} />;
    if (type === "ciPipeline") return <Workflow size={22} color={c} strokeWidth={1.5} />;
    if (type === "observability") return <Radar size={22} color={c} strokeWidth={1.5} />;
    return <Terminal size={22} color={c} strokeWidth={1.5} />;
  };

  const handleBuy = () => {
    if (usesAdvanced) purchaseHiddenUpgrade(type as "aiPair" | "gitAutopilot" | "ciPipeline" | "observability");
    else purchaseUpgrade(type as "autoCoder" | "server" | "keyboard");
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, { toValue: 0, duration: T.motion.normal, useNativeDriver: USE_NATIVE_ANIM_DRIVER }).start();
  };

  const currentContribution =
    type === "autoCoder" ? `+${Math.round(level * 0.3)}/sec, +${Math.round(level * 0.5)} tap`
      : type === "server" ? `+${Math.round(level * 0.5)}/sec`
        : type === "keyboard" ? `+${Math.round(level * 0.18)}/sec, +${Math.round(level * 0.08)} tap`
          : type === "aiPair" ? `-${Math.min(80, level * 15)}% strain`
            : type === "gitAutopilot" ? `+${level * 10}% passive`
              : type === "ciPipeline" ? `+${level * 20}% passive`
                : `+${level * 35}% global`;

  const nextGain =
    type === "autoCoder" ? "+0.30/sec, +0.50 tap" : type === "server" ? "+0.50/sec"
      : type === "keyboard" ? "+0.18/sec, +0.08 tap" : type === "aiPair" ? "-15% strain"
        : type === "gitAutopilot" ? "+10% passive" : type === "ciPipeline" ? "+20% passive"
          : "+35% global";

  const levelDots = Math.min(level, 20);

  return (
    <Pressable
      onPress={handleBuy}
      disabled={!canAfford || !tierUnlocked}
      accessibilityLabel={`Install ${title} for ${formatNumber(cost)} LoC`}
      accessibilityRole="button"
      style={{
        marginHorizontal: T.space.lg,
        marginBottom: T.space.md,
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderLeftWidth: canAfford ? 3 : 1,
        borderLeftColor: canAfford ? accent : T.border.default,
        borderColor: T.border.default,
        backgroundColor: T.bg.overlay,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          pointerEvents: "none",
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: `${accent}20`,
          opacity: flashOpacity,
        }}
      />
      <View style={{ padding: T.space.lg, flexDirection: "row", alignItems: "center", gap: T.space.lg }}>
        <View style={{
          backgroundColor: T.bg.surface,
          borderRadius: T.radius.md,
          padding: T.space.md,
          borderWidth: 1,
          borderColor: T.border.subtle,
        }}>
          {getIcon()}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.sm }}>
            <Text style={{ fontSize: T.font.lg, fontWeight: "600", color: canAfford ? T.text.primary : T.text.secondary, fontFamily: T.mono }}>
              {title}
            </Text>
            <View style={{
              backgroundColor: `${accent}20`,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}>
              <Text style={{ color: accent, fontSize: T.font.xs, fontWeight: "bold", fontFamily: T.mono }}>
                {tierLabel}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: T.space.xs }}>
            {Array.from({ length: Math.min(levelDots, 10) }).map((_, i) => (
              <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent, opacity: 0.7 }} />
            ))}
            {levelDots > 10 && <Text style={{ color: accent, fontSize: 8, fontFamily: T.mono, marginLeft: 2 }}>+{levelDots - 10}</Text>}
            <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, marginLeft: T.space.xs }}>
              Lv.{level} — {currentContribution}
            </Text>
          </View>

          <Text style={{ color: T.text.muted, fontSize: T.font.xs, marginTop: T.space.xs, fontFamily: T.mono }}>
            {description}
          </Text>
          <Text style={{ color: `${T.accent.green}bb`, fontSize: T.font.xs, marginTop: 2, fontFamily: T.mono }}>
            Next: {nextGain}
          </Text>
          {!tierUnlocked && (
            <Text style={{ color: "#8B5E3C", fontSize: T.font.xs, marginTop: 2, fontFamily: T.mono }}>
              Tier gate: {formatNumber(tierReq)} total LoC
            </Text>
          )}
        </View>

        <View
          pointerEvents="none"
          style={{
            borderRadius: T.radius.md,
            paddingHorizontal: T.space.xl,
            paddingVertical: T.space.md,
            backgroundColor: T.upgradeButtonBg(type, canAfford && tierUnlocked),
            borderWidth: 1,
            borderColor: canAfford && tierUnlocked ? `${accent}66` : T.border.focus,
            ...(canAfford && tierUnlocked ? {
              shadowColor: accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            } : {}),
            minWidth: 88,
            alignItems: "center" as const,
          }}
        >
          <Text style={{
            fontFamily: T.mono, fontSize: 9, fontWeight: "800",
            color: canAfford && tierUnlocked ? accent : T.text.disabled,
            letterSpacing: 2, textTransform: "uppercase", textAlign: "center",
            marginBottom: 3,
          }}>
            {tierUnlocked && bulkInfo.levelsGained > 1 ? `INSTALL ${bulkInfo.levelsGained}X` : tierUnlocked ? "INSTALL" : "LOCKED"}
          </Text>
          <Text style={{ fontFamily: T.mono, fontSize: T.font.sm + 1, color: canAfford ? "#fff" : T.text.muted, fontWeight: "700", textAlign: "center" }}>
            {formatNumber(cost)}
          </Text>
          <Text style={{ fontFamily: T.mono, fontSize: T.font.xs, color: canAfford ? T.text.secondary : T.text.disabled, marginTop: 2, textAlign: "center" }}>
            next {formatNumber(nextCost)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

import React, { useMemo } from "react";
import { Pressable, View, Text } from "react-native";
import { Terminal, Server, Keyboard, Lock, Cpu, GitBranch, Zap } from "lucide-react-native";

import { useGameStore } from "../../store/gameStore";
import { getUpgradeCost } from "../../utils/scaling";
import { formatNumber } from "../../utils/formatNumber";

// Hidden upgrade cost multipliers
const HIDDEN_COST_MULTIPLIERS: Record<string, number> = {
  aiPair: 3,
  gitAutopilot: 5,
};

interface UpgradeCardProps {
  type: "autoCoder" | "server" | "keyboard" | "aiPair" | "gitAutopilot" | "cloudBurst";
  title: string;
  versionPrefix?: string;
  unlocksAt?: number; // LoC threshold to reveal this card
  description?: string;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({
  type,
  title,
  versionPrefix = "v",
  unlocksAt,
  description,
}) => {
  const neuralTokens = useGameStore((s) => s.neuralTokens);
  const energyDrinks = useGameStore((s) => s.energyDrinks);
  const cloudBurstCooldown = useGameStore((s) => s.cloudBurstCooldown);
  const cloudBurstActive = useGameStore((s) => s.cloudBurstActive);

  const level = useGameStore((s) => {
    if (type === "autoCoder") return s.autoCoderLevel;
    if (type === "server") return s.serverLevel;
    if (type === "keyboard") return s.keyboardLevel;
    if (type === "aiPair") return s.aiPairLevel;
    if (type === "gitAutopilot") return s.gitAutopilotLevel;
    return 0;
  });

  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
  const purchaseHiddenUpgrade = useGameStore((s) => s.purchaseHiddenUpgrade);
  const activateCloudBurst = useGameStore((s) => s.activateCloudBurst);

  // ── LOCKED STATE ──────────────────────────────────────────────────────────
  const isLocked = unlocksAt !== undefined && neuralTokens < unlocksAt;
  if (isLocked) {
    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#252525",
          backgroundColor: "#111",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: 0.5,
        }}
      >
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 8, padding: 12 }}>
          <Lock size={20} color="#444" strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#444", fontWeight: "500", fontSize: 15, fontFamily: "monospace" }}>
            ???
          </Text>
          <Text style={{ color: "#333", fontSize: 12, marginTop: 3, fontFamily: "monospace" }}>
            Unlock at {formatNumber(unlocksAt!)} LoC
          </Text>
        </View>
      </View>
    );
  }

  // ── CLOUD BURST (active ability) ──────────────────────────────────────────
  if (type === "cloudBurst") {
    const now = Date.now();
    const onCooldown = cloudBurstCooldown > now;
    const cooldownSecsLeft = onCooldown
      ? Math.ceil((cloudBurstCooldown - now) / 1000)
      : 0;
    const canActivate = !onCooldown && !cloudBurstActive && energyDrinks >= 1;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: cloudBurstActive ? "#39FF14" : "#333",
          backgroundColor: "#252526",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ backgroundColor: "#1e1e1e", borderRadius: 8, padding: 12 }}>
            <Zap
              size={24}
              color={cloudBurstActive ? "#39FF14" : canActivate ? "#4FC1FF" : "#858585"}
              strokeWidth={1.5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: cloudBurstActive ? "#39FF14" : canActivate ? "#d4d4d4" : "#858585" }}>
              {title}
            </Text>
            <Text style={{ color: "#858585", fontSize: 13, marginTop: 4, fontFamily: "monospace" }}>
              {cloudBurstActive
                ? "2× ACTIVE"
                : onCooldown
                ? `Cooldown: ${cooldownSecsLeft}s`
                : description ?? "2× income for 30s"}
            </Text>
          </View>
          <Pressable
            onPress={activateCloudBurst}
            disabled={!canActivate}
            style={{
              borderRadius: 4,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: canActivate ? "#0e639c" : "#333333",
            }}
          >
            <Text style={{ fontFamily: "monospace", fontSize: 14, color: canActivate ? "#ffffff" : "#858585" }}>
              {canActivate ? "activate(1🥤)" : onCooldown ? "wait..." : "need 🥤"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── STANDARD + HIDDEN UPGRADES ─────────────────────────────────────────────
  const isHidden = type === "aiPair" || type === "gitAutopilot";
  const costMultiplier = type === "server" ? 2 : type === "keyboard" ? 1.5 : HIDDEN_COST_MULTIPLIERS[type] ?? 1;
  const cost = useMemo(() => Math.floor(getUpgradeCost(level) * costMultiplier), [level, costMultiplier]);
  const canAfford = neuralTokens >= cost;

  const getIcon = () => {
    if (type === "server") return <Server size={24} color={canAfford ? "#4FC1FF" : "#858585"} strokeWidth={1.5} />;
    if (type === "keyboard") return <Keyboard size={24} color={canAfford ? "#4FC1FF" : "#858585"} strokeWidth={1.5} />;
    if (type === "aiPair") return <Cpu size={24} color={canAfford ? "#C586C0" : "#858585"} strokeWidth={1.5} />;
    if (type === "gitAutopilot") return <GitBranch size={24} color={canAfford ? "#4EC9B0" : "#858585"} strokeWidth={1.5} />;
    return <Terminal size={24} color={canAfford ? "#4FC1FF" : "#858585"} strokeWidth={1.5} />;
  };

  const handleBuy = () => {
    if (isHidden) {
      purchaseHiddenUpgrade(type as "aiPair" | "gitAutopilot");
    } else {
      purchaseUpgrade(type as "autoCoder" | "server" | "keyboard");
    }
  };

  const accentColor = type === "aiPair" ? "#C586C0" : type === "gitAutopilot" ? "#4EC9B0" : "#4FC1FF";
  const buttonBg = canAfford ? (type === "aiPair" ? "#2d0a2e" : type === "gitAutopilot" ? "#0a2d29" : "#0e639c") : "#333333";

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isHidden ? (canAfford ? accentColor + "55" : "#333") : "#333333",
        backgroundColor: "#252526",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ backgroundColor: "#1e1e1e", borderRadius: 8, padding: 12 }}>
          {getIcon()}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: canAfford ? "#d4d4d4" : "#858585" }}>
            {title}
          </Text>
          <Text style={{ color: "#858585", fontSize: 13, marginTop: 4, fontFamily: "monospace" }}>
            {description ?? `${versionPrefix}${level}.0.0`}
          </Text>
        </View>
        <Pressable
          onPress={handleBuy}
          disabled={!canAfford}
          style={{ borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: buttonBg }}
        >
          <Text style={{ fontFamily: "monospace", fontSize: 14, color: canAfford ? "#ffffff" : "#858585" }}>
            install({formatNumber(cost)})
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

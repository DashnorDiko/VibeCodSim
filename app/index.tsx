import {
  BarChart3,
  Battery,
  Box,
  Bug,
  Coffee,
  Cpu,
  Flame,
  Layers,
  Monitor,
  Package,
  Rocket,
  Scissors,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Clipboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { USE_NATIVE_ANIM_DRIVER } from "../utils/animatedNativeDriver";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MetaTreePanel } from "../components/game/MetaTreePanel";
import { MilestonePanel } from "../components/game/MilestonePanel";
import { RebootButton } from "../components/game/RebootButton";
import { TokenDisplay } from "../components/game/TokenDisplay";
import { UpgradeCard } from "../components/game/UpgradeCard";
import { GraphicGamePanel } from "../components/ui/GraphicGamePanel";
import { ProgressToast } from "../components/ui/ProgressToast";
import { WelcomeBackToast } from "../components/ui/WelcomeBackToast";
import { BuyMultiplierToggle } from "../components/ui/BuyMultiplierToggle";
import { T } from "../constants/theme";
import { ACHIEVEMENT_DEFINITIONS, getTokenTechCost, useGameStore } from "../store/gameStore";
import { formatNumber } from "../utils/formatNumber";
import { exportSaveShareNative, pickSaveFileText } from "../utils/saveFile";

type MobileTab = "NODE" | "PACKAGES" | "ADVANCED" | "BOOST" | "PROGRESS";
type DesktopSubTab = "packages" | "advanced" | "boost" | "progress";

const DESKTOP_TABS: { key: DesktopSubTab; label: string; Icon: React.FC<any> }[] = [
  { key: "packages", label: "Packages", Icon: Package },
  { key: "advanced", label: "Advanced", Icon: Layers },
  { key: "boost", label: "Boost", Icon: Zap },
  { key: "progress", label: "Progress", Icon: TrendingUp },
];

const MOBILE_TABS: { key: MobileTab; label: string; Icon: React.FC<any> }[] = [
  { key: "NODE", label: "Node", Icon: Monitor },
  { key: "PACKAGES", label: "Pkgs", Icon: Box },
  { key: "ADVANCED", label: "Adv", Icon: Cpu },
  { key: "BOOST", label: "Boost", Icon: Rocket },
  { key: "PROGRESS", label: "Prog", Icon: BarChart3 },
];

const SubTabBar = ({
  active,
  onSelect,
  tabs,
}: {
  active: string;
  onSelect: (key: string) => void;
  tabs: { key: string; label: string; Icon: React.FC<any> }[];
}) => (
  <View style={{
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: T.border.subtle,
    backgroundColor: T.bg.base,
  }}>
    {tabs.map((t) => {
      const isActive = active === t.key;
      return (
        <Pressable
          key={t.key}
          onPress={() => onSelect(t.key)}
          style={{
            flex: 1,
            paddingVertical: T.space.md,
            alignItems: "center",
            gap: 4,
            backgroundColor: isActive ? T.bg.elevated : "transparent",
            borderBottomWidth: 2,
            borderBottomColor: isActive ? T.accent.blue : "transparent",
          }}
        >
          <t.Icon size={14} color={isActive ? T.accent.blue : T.text.muted} strokeWidth={1.5} />
          <Text style={{
            color: isActive ? T.accent.blue : T.text.muted,
            fontSize: T.font.sm,
            fontWeight: isActive ? "700" : "500",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontFamily: T.mono,
          }}>
            {t.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const PackagesContent: React.FC = () => (
  <ScrollView style={{ flex: 1, paddingTop: T.space.md }}>
    <BuyMultiplierToggle />
    <Text style={{
      paddingHorizontal: T.space.lg, color: T.text.muted,
      textTransform: "uppercase", fontSize: T.font.xs, fontWeight: "bold",
      marginBottom: T.space.sm, marginTop: T.space.md, letterSpacing: 1.5, fontFamily: T.mono,
    }}>
      General Packages
    </Text>
    <UpgradeCard type="autoCoder" title="Auto-Coder Unit" description="+0.30 passive LoC/sec and +0.50 tap power per level" />
    <UpgradeCard type="server" title="Dedicated AWS Node" description="+0.50 passive LoC/sec per level" />
    <UpgradeCard type="keyboard" title="Mechanical Switch" description="+0.18 passive LoC/sec and +0.08 tap power per level" />
  </ScrollView>
);

const AdvancedContent: React.FC = () => {
  const unlockedMetaNodes = useGameStore((s) => s.unlockedMetaNodes);
  const cloudBurstMult = unlockedMetaNodes.includes("burstDaemon") ? 3 : 2;

  return (
  <ScrollView style={{ flex: 1, paddingTop: T.space.md }}>
    <BuyMultiplierToggle />
    <Text style={{
      paddingHorizontal: T.space.lg, color: T.text.muted,
      textTransform: "uppercase", fontSize: T.font.xs, fontWeight: "bold",
      marginBottom: T.space.sm, marginTop: T.space.md, letterSpacing: 1.5, fontFamily: T.mono,
    }}>
      Advanced Modules
    </Text>
    <UpgradeCard type="aiPair" title="AI Pair Programmer" unlocksAt={500} description="-15% strain per level" />
    <UpgradeCard type="gitAutopilot" title="Git Autopilot" unlocksAt={5000} description="+10% passive LoC/sec per level" />
    <UpgradeCard type="cloudBurst" title="Cloud Burst" unlocksAt={50000} description={`Toggle ${cloudBurstMult}x LoC (drains 1% Tokens/sec)`} />
    <Text style={{
      paddingHorizontal: T.space.lg, color: T.text.muted,
      textTransform: "uppercase", fontSize: T.font.xs, fontWeight: "bold",
      marginBottom: T.space.sm, marginTop: T.space.xl, letterSpacing: 1.5, fontFamily: T.mono,
    }}>
      Scale Modules
    </Text>
    <UpgradeCard type="ciPipeline" title="CI Pipeline" description="+20% passive layer per level" />
    <UpgradeCard type="observability" title="Observability Matrix" description="+35% global layer per level" />
  </ScrollView>
  );
};

const BoostContent: React.FC = () => {
  const tokens = useGameStore((s) => s.tokens);
  const techLevel = useGameStore((s) => s.tokenTechLevel);
  const prestigeLevel = useGameStore((s) => s.rebootPrestigeLevel);
  const rebootCount = useGameStore((s) => s.rebootCount);
  const purchaseTokenUpgrade = useGameStore((s) => s.purchaseTokenUpgrade);
  const cost = getTokenTechCost(techLevel);
  const nextCost = getTokenTechCost(techLevel + 1);
  const canAfford = tokens >= cost;
  const isMaxed = techLevel >= 20;
  const shopBonus = (techLevel * 0.2 * (1 / (1 + techLevel * 0.05)) * 100).toFixed(0);
  const rebootBonus = (prestigeLevel * 0.15 * (1 / (1 + prestigeLevel * 0.03)) * 100).toFixed(0);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: T.space.lg }}>
        <View style={{
          borderRadius: T.radius.md, borderWidth: 1,
          borderColor: T.border.default, backgroundColor: T.bg.elevated,
          padding: T.space.lg, flexDirection: "row", alignItems: "center",
          justifyContent: "space-between", marginBottom: T.space.md,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.lg }}>
            <View style={{ backgroundColor: T.bg.surface, borderRadius: T.radius.md, padding: T.space.md, borderWidth: 1, borderColor: T.border.subtle }}>
              <Battery size={22} color={canAfford ? T.accent.green : T.text.muted} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.text.primary, fontWeight: "600", fontSize: T.font.lg, fontFamily: T.mono }}>Overclock Engine</Text>
              <Text style={{ color: T.text.muted, fontSize: T.font.xs, marginTop: T.space.xs, fontFamily: T.mono }}>
                Lv.{techLevel} — +{shopBonus}% shop / +{rebootBonus}% prestige
              </Text>
            </View>
          </View>
          <Pressable
            onPress={purchaseTokenUpgrade}
            disabled={!canAfford || isMaxed}
            style={({ pressed }) => ({
              borderRadius: T.radius.md, paddingHorizontal: T.space.xl, paddingVertical: T.space.md,
              backgroundColor: isMaxed ? "#1a1a00" : canAfford ? "#1b5e20" : T.bg.elevated,
              borderWidth: 1,
              borderColor: isMaxed ? `${T.accent.yellow}44` : canAfford ? `${T.accent.green}66` : T.border.focus,
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              minWidth: 88,
              alignItems: "center" as const,
            })}
          >
            <Text style={{
              fontFamily: T.mono, fontSize: 9, fontWeight: "800",
              color: isMaxed ? T.accent.yellow : canAfford ? T.accent.green : T.text.disabled,
              letterSpacing: 2, textTransform: "uppercase", textAlign: "center",
              marginBottom: 3,
            }}>
              {isMaxed ? "MAXED" : "DRINK"}
            </Text>
            <Text style={{ fontFamily: T.mono, fontSize: T.font.sm + 1, color: isMaxed ? T.accent.yellow : canAfford ? "#fff" : T.text.muted, fontWeight: "700", textAlign: "center" }}>
              {isMaxed ? "MAX" : formatNumber(cost)}
            </Text>
            {!isMaxed && (
              <Text style={{ fontFamily: T.mono, fontSize: T.font.xs, color: canAfford ? T.text.secondary : T.text.disabled, marginTop: 2, textAlign: "center" }}>
                next {formatNumber(nextCost)}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={{
          color: T.accent.red, textTransform: "uppercase", fontSize: T.font.xs,
          fontWeight: "bold", letterSpacing: 1.5, marginBottom: T.space.sm, marginTop: T.space.sm, fontFamily: T.mono,
        }}>
          Danger Zone - Vibe v{rebootCount}.0.0
        </Text>
        <RebootButton />
        <View style={{ alignItems: "center", marginTop: T.space.md }}>
          <Text style={{ color: T.text.disabled, fontSize: T.font.xs, textAlign: "center", fontFamily: T.mono }}>
            Tap floating Tokens in Simulation to earn Tokens
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const EVENT_ICONS: Record<string, React.FC<any>> = {
  code_rush: Flame,
  bug_swarm: Bug,
  refactor_window: Scissors,
  coffee_break: Coffee,
};

const EventBanner: React.FC = () => {
  const activeEvent = useGameStore((s) => s.activeEvent);
  if (!activeEvent) return null;
  const secsLeft = Math.max(0, Math.ceil((activeEvent.endsAt - Date.now()) / 1000));
  const totalDuration = activeEvent.duration ?? 30;
  const progress = Math.max(0, secsLeft / totalDuration);
  const colors: Record<string, string> = { code_rush: T.accent.green, bug_swarm: T.accent.red, refactor_window: T.accent.yellow, coffee_break: T.accent.blueAlt };
  const color = colors[activeEvent.id] ?? T.accent.green;
  const EventIcon = EVENT_ICONS[activeEvent.id];

  return (
    <View style={{
      marginHorizontal: T.space.lg, marginVertical: T.space.xs,
      borderRadius: T.radius.md, borderWidth: 1, borderColor: `${color}44`,
      backgroundColor: `${color}12`,
      paddingHorizontal: T.space.lg, paddingVertical: T.space.sm,
      overflow: "hidden",
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.sm, flex: 1 }}>
          {EventIcon && <EventIcon size={16} color={color} strokeWidth={2} />}
          <View style={{ flex: 1 }}>
            <Text style={{ color, fontWeight: "bold", fontSize: T.font.sm, fontFamily: T.mono }}>{activeEvent.title}</Text>
            <Text style={{ color: T.text.secondary, fontSize: T.font.xs, fontFamily: T.mono }}>{activeEvent.description}</Text>
          </View>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color, fontWeight: "bold", fontSize: T.font.base, fontFamily: T.mono }}>{secsLeft}s</Text>
        </View>
      </View>
      <View style={{ marginTop: T.space.xs, height: 3, borderRadius: 999, backgroundColor: `${color}20`, overflow: "hidden" }}>
        <View style={{ width: `${Math.floor(progress * 100)}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
      </View>
    </View>
  );
};

const AchievementsPanel: React.FC = () => {
  const achievements = useGameStore((s) => s.achievements);
  const categories = ["economy", "tapping", "upgrades", "meta", "secret"] as const;
  const catLabels: Record<string, string> = { economy: "Economy", tapping: "Tapping", upgrades: "Upgrades", meta: "Meta", secret: "Secret" };
  const catColors: Record<string, string> = { economy: T.accent.green, tapping: T.accent.blue, upgrades: T.accent.blueAlt, meta: T.accent.purple, secret: T.accent.yellow };

  const total = ACHIEVEMENT_DEFINITIONS.length;
  const unlocked = achievements.length;

  return (
    <View style={{ paddingHorizontal: T.space.lg, paddingVertical: T.space.sm }}>
      <Text style={{ color: T.accent.yellow, fontSize: T.font.sm, fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: T.mono, marginBottom: T.space.sm }}>
        Achievements ({unlocked}/{total})
      </Text>
      <View style={{ height: 4, borderRadius: 999, backgroundColor: T.bg.elevated, marginBottom: T.space.md, overflow: "hidden" }}>
        <View style={{ width: `${Math.floor((unlocked / Math.max(total, 1)) * 100)}%`, height: "100%", borderRadius: 999, backgroundColor: T.accent.yellow }} />
      </View>
      {categories.map((cat) => {
        const defs = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === cat);
        if (defs.length === 0) return null;
        const catUnlocked = defs.filter((a) => achievements.includes(a.id)).length;
        const catColor = catColors[cat] ?? T.accent.green;
        return (
          <View key={cat} style={{ marginBottom: T.space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: T.space.sm, marginBottom: T.space.xs }}>
              <View style={{ width: 3, height: 14, backgroundColor: catColor, borderRadius: 2 }} />
              <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", fontFamily: T.mono }}>
                {catLabels[cat]} ({catUnlocked}/{defs.length})
              </Text>
            </View>
            {defs.map((ach) => {
              const isUnlocked = achievements.includes(ach.id);
              return (
                <View key={ach.id} style={{
                  flexDirection: "row", alignItems: "center", gap: T.space.sm,
                  paddingVertical: T.space.xs, paddingHorizontal: T.space.sm,
                  borderRadius: T.radius.sm,
                  backgroundColor: isUnlocked ? `${catColor}15` : T.bg.surface,
                  marginBottom: 3,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: isUnlocked ? catColor : T.bg.elevated,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderColor: isUnlocked ? catColor : T.border.default,
                  }}>
                    <Text style={{ color: isUnlocked ? "#000" : T.text.disabled, fontSize: 11, fontWeight: "bold" }}>
                      {isUnlocked ? "✓" : ""}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: isUnlocked ? T.text.primary : T.text.disabled, fontSize: T.font.sm, fontWeight: "600", fontFamily: T.mono }}>
                      {ach.title}
                    </Text>
                    <Text style={{ color: isUnlocked ? T.text.muted : T.text.disabled, fontSize: T.font.xs, fontFamily: T.mono }}>
                      {ach.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const StatsPanel: React.FC = () => {
  const totalTaps = useGameStore((s) => s.totalTaps);
  const totalTimePlayed = useGameStore((s) => s.totalTimePlayed);
  const totalSparksCollected = useGameStore((s) => s.totalSparksCollected);
  const totalBonusWordsClaimed = useGameStore((s) => s.totalBonusWordsClaimed);
  const highestCombo = useGameStore((s) => s.highestCombo);
  const rebootCount = useGameStore((s) => s.rebootCount);
  const locPerSecond = useGameStore((s) => s.locPerSecond);
  const lifetimeLoc = useGameStore((s) => s.lifetimeLoc);
  const serverLevel = useGameStore((s) => s.serverLevel);
  const autoCoderLevel = useGameStore((s) => s.autoCoderLevel);
  const keyboardLevel = useGameStore((s) => s.keyboardLevel);
  const hours = Math.floor(totalTimePlayed / 3600);
  const mins = Math.floor((totalTimePlayed % 3600) / 60);

  const StatCard: React.FC<{ label: string; value: string; accentColor: string }> = ({ label, value, accentColor }) => (
    <View style={{
      flex: 1, minWidth: 120,
      borderRadius: T.radius.md, backgroundColor: T.bg.surface,
      borderWidth: 1, borderColor: T.border.subtle,
      borderLeftWidth: 3, borderLeftColor: accentColor,
      padding: T.space.md,
    }}>
      <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color: T.text.primary, fontSize: T.font.base, fontWeight: "bold", fontFamily: T.mono, marginTop: 2 }}>{value}</Text>
    </View>
  );

  const serverIncome = serverLevel * 0.5;
  const autoCoderIncome = autoCoderLevel * 0.3;
  const keyboardIncome = keyboardLevel * 0.18;
  const totalIncome = Math.max(serverIncome + autoCoderIncome + keyboardIncome, 0.01);

  return (
    <View style={{ paddingHorizontal: T.space.lg, paddingVertical: T.space.sm }}>
      <Text style={{ color: T.accent.blueAlt, fontSize: T.font.sm, fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: T.mono, marginBottom: T.space.sm }}>
        Statistics
      </Text>

      <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: T.space.xs }}>Session</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: T.space.sm, marginBottom: T.space.md }}>
        <StatCard label="Total Taps" value={formatNumber(totalTaps)} accentColor={T.accent.blue} />
        <StatCard label="Time Played" value={`${hours}h ${mins}m`} accentColor={T.accent.blue} />
        <StatCard label="Highest Combo" value={highestCombo.toString()} accentColor={T.accent.blue} />
      </View>

      <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: T.space.xs }}>All-Time</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: T.space.sm, marginBottom: T.space.md }}>
        <StatCard label="Lifetime LoC" value={formatNumber(lifetimeLoc)} accentColor={T.accent.green} />
        <StatCard label="Current LoC/sec" value={formatNumber(locPerSecond)} accentColor={T.accent.green} />
        <StatCard label="Total Reboots" value={rebootCount.toString()} accentColor={T.accent.green} />
        <StatCard label="Sparks" value={totalSparksCollected.toString()} accentColor={T.accent.yellow} />
        <StatCard label="Bonus Words" value={totalBonusWordsClaimed.toString()} accentColor={T.accent.yellow} />
      </View>

      <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: T.space.xs }}>LoC/sec Breakdown</Text>
      <View style={{ borderRadius: T.radius.md, backgroundColor: T.bg.surface, borderWidth: 1, borderColor: T.border.subtle, padding: T.space.md }}>
        {[
          { label: "Server", value: serverIncome, color: T.accent.blueAlt },
          { label: "Auto-Coder", value: autoCoderIncome, color: T.accent.blue },
          { label: "Keyboard", value: keyboardIncome, color: T.accent.teal },
        ].map((src) => (
          <View key={src.label} style={{ marginBottom: T.space.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: T.text.secondary, fontSize: T.font.xs, fontFamily: T.mono }}>{src.label}</Text>
              <Text style={{ color: T.text.primary, fontSize: T.font.xs, fontFamily: T.mono, fontWeight: "bold" }}>+{Math.round(src.value)}</Text>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: T.bg.elevated, marginTop: 2, overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, (src.value / totalIncome) * 100)}%`, height: "100%", borderRadius: 2, backgroundColor: src.color }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const AutoBuyPanel: React.FC = () => {
  const autoBuyEnabled = useGameStore((s) => s.autoBuyEnabled);
  const toggleAutoBuy = useGameStore((s) => s.toggleAutoBuy);
  const rebootCount = useGameStore((s) => s.rebootCount);
  if (rebootCount < 1) return null;

  const types = [
    { key: "autoCoder", label: "Auto-Coder" }, { key: "server", label: "Server" },
    { key: "keyboard", label: "Keyboard" }, { key: "aiPair", label: "AI Pair" },
    { key: "gitAutopilot", label: "Git Autopilot" }, { key: "ciPipeline", label: "CI Pipeline" },
    { key: "observability", label: "Observability" },
  ];

  return (
    <View style={{ paddingHorizontal: T.space.lg, paddingVertical: T.space.sm }}>
      <Text style={{ color: T.accent.purple, fontSize: T.font.sm, fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: T.mono, marginBottom: T.space.sm }}>
        Auto-Buy (unlocked via reboot)
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: T.space.xs }}>
        {types.map((t) => {
          const on = autoBuyEnabled[t.key] ?? false;
          return (
            <Pressable
              key={t.key}
              onPress={() => toggleAutoBuy(t.key)}
              style={({ pressed }) => ({
                paddingHorizontal: T.space.sm, paddingVertical: T.space.xs + 2,
                borderRadius: T.radius.sm, borderWidth: 1,
                borderColor: on ? T.accent.green : T.border.default,
                backgroundColor: on ? `${T.accent.green}15` : T.bg.surface,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: on ? T.accent.green : T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, fontWeight: "bold" }}>
                {t.label}: {on ? "ON" : "OFF"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const resetSave = useGameStore((s) => s.resetSave);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);
  const useScientificNotation = useGameStore((s) => s.useScientificNotation);
  const setUseScientificNotation = useGameStore((s) => s.setUseScientificNotation);

  const [exportString, setExportString] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [saveIoStatus, setSaveIoStatus] = useState<string | null>(null);
  const [resetInput, setResetInput] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = () => {
    const str = exportSave();
    setExportString(str);
    setSaveIoStatus(str ? "Copied save string to clipboard." : "Export failed.");
    try { Clipboard.setString(str); } catch { }
  };

  const handleDownloadExport = async () => {
    const str = exportSave();
    setExportString(str);
    setImportError(null);
    setSaveIoStatus(null);

    if (!str) {
      setSaveIoStatus("Export failed.");
      return;
    }

    if (Platform.OS !== "web") {
      const res = await exportSaveShareNative(str);
      if (res.ok) {
        setSaveIoStatus("Exported — share sheet opened (cache copy for sharing).");
      } else {
        setSaveIoStatus(res.error);
        try { Clipboard.setString(str); } catch { }
      }
      return;
    }

    try {
      const blob = new Blob([str], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vibecodesim-save.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaveIoStatus("Exported to vibecodesim-save.txt (Downloads).");
    } catch {
      try { Clipboard.setString(str); } catch { }
      setSaveIoStatus("Download failed — copied to clipboard instead.");
    }
  };

  const handleImportPickFile = () => {
    setImportError(null);
    setSaveIoStatus(null);

    if (Platform.OS !== "web") {
      void (async () => {
        const picked = await pickSaveFileText();
        if (!picked.ok) {
          if (picked.error !== "Cancelled.") {
            setImportError(picked.error);
          }
          return;
        }
        const res = importSave(picked.text.trim());
        if (res.ok) {
          setExportString("");
          setImportError(null);
          setSaveIoStatus("Imported successfully.");
          setShowResetConfirm(false);
          setResetInput("");
          onClose();
        } else {
          setImportError(res.error);
        }
      })();
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".txt,text/plain";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const res = importSave(text);
          if (res.ok) {
            setExportString("");
            setImportError(null);
            setSaveIoStatus("Imported successfully.");
            setShowResetConfirm(false);
            setResetInput("");
            onClose();
          } else {
            setImportError(res.error);
          }
        } catch {
          setImportError("Failed to read file.");
        }
      };
      input.click();
    } catch {
      setImportError("Import is not supported in this browser.");
    }
  };

  const handleReset = () => {
    if (!showResetConfirm) { setShowResetConfirm(true); return; }
    if (resetInput !== "RESET") return;
    resetSave();
    setShowResetConfirm(false);
    setResetInput("");
    onClose();
  };

  const handleClose = () => {
    setShowResetConfirm(false);
    setResetInput("");
    setExportString("");
    setImportError(null);
    setSaveIoStatus(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "center", alignItems: "center",
        padding: T.space.xl,
      }}>
        <View style={{
          width: "100%", maxWidth: 400,
          borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.border.default,
          backgroundColor: T.bg.surface, overflow: "hidden",
        }}>
          <View style={{ height: 3, backgroundColor: T.accent.blue }} />
          <View style={{ padding: T.space.xl }}>
            <Text style={{ color: T.text.primary, fontSize: T.font.xl, fontWeight: "bold", fontFamily: T.mono, marginBottom: T.space.xs, textAlign: "center" }}>
              Settings
            </Text>
            <Text style={{ color: T.text.muted, fontSize: T.font.xs, fontFamily: T.mono, textAlign: "center", marginBottom: T.space.xl }}>
              VibeCodSim v1.0.0
            </Text>

            <View style={{ height: 1, backgroundColor: T.border.subtle, marginBottom: T.space.lg }} />

            <Pressable
              onPress={() => void handleDownloadExport()}
              style={({ pressed }) => ({
                paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                borderRadius: T.radius.sm, backgroundColor: pressed ? "#1a3a5a" : "#1a2a3a",
                borderWidth: 1, borderColor: "#2e405f", marginBottom: T.space.sm,
              })}
            >
              <Text style={{ color: T.accent.blueAlt, fontFamily: T.mono, fontSize: T.font.sm, textAlign: "center", fontWeight: "600" }}>
                {Platform.OS === "web"
                  ? "Export Save (Download .txt)"
                  : "Export Save (Share .txt)"}
              </Text>
            </Pressable>

            {Platform.OS !== "web" ? (
              <Pressable
                onPress={handleExport}
                style={({ pressed }) => ({
                  paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                  borderRadius: T.radius.sm, backgroundColor: pressed ? "#152030" : "#121a24",
                  borderWidth: 1, borderColor: "#2e405f", marginBottom: T.space.sm,
                })}
              >
                <Text style={{ color: T.text.muted, fontFamily: T.mono, fontSize: T.font.sm, textAlign: "center", fontWeight: "600" }}>
                  Copy save string (clipboard)
                </Text>
              </Pressable>
            ) : null}

            {exportString ? (
              <View style={{ marginBottom: T.space.sm }}>
                <TextInput
                  value={exportString}
                  selectTextOnFocus
                  style={{
                    borderWidth: 1, borderColor: T.border.default, borderRadius: T.radius.sm,
                    padding: T.space.sm, color: T.text.muted, fontSize: T.font.xs,
                    fontFamily: T.mono, backgroundColor: T.bg.base, maxHeight: 60,
                  }}
                  multiline editable={false}
                />
                <Text style={{ color: T.text.disabled, fontSize: 9, fontFamily: T.mono, marginTop: T.space.xs }}>
                  {Platform.OS === "web" ? "Downloaded! Keep this file to back up your progress." : "Copied! Save this string to back up your progress."}
                </Text>
              </View>
            ) : null}

            {saveIoStatus ? (
              <Text style={{ color: T.accent.green, fontSize: 10, fontFamily: T.mono, textAlign: "center", marginBottom: T.space.sm }}>
                {saveIoStatus}
              </Text>
            ) : null}

            <View style={{ marginBottom: T.space.sm }}>
              <Pressable
                onPress={handleImportPickFile}
                style={({ pressed }) => ({
                  paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                  borderRadius: T.radius.sm, backgroundColor: pressed ? "#2a2a1a" : "#1f1f12",
                  borderWidth: 1, borderColor: "#5a5a2e",
                  marginBottom: importError ? T.space.xs : 0,
                })}
              >
                <Text style={{ color: T.accent.yellow, fontFamily: T.mono, fontSize: T.font.sm, textAlign: "center", fontWeight: "600" }}>
                  {Platform.OS === "web" ? "Import Save (Pick .txt)" : "Import Save (Pick file)"}
                </Text>
              </Pressable>
              {importError ? (
                <Text style={{ color: T.accent.red, fontSize: 10, fontFamily: T.mono, textAlign: "center" }}>
                  {importError}
                </Text>
              ) : null}
            </View>

            <View style={{ height: 1, backgroundColor: T.border.subtle, marginVertical: T.space.md }} />

            <View style={{ marginBottom: T.space.sm }}>
              <Pressable
                onPress={() => setUseScientificNotation(!useScientificNotation)}
                style={({ pressed }) => ({
                  paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                  borderRadius: T.radius.sm, backgroundColor: pressed ? "#1a3a5a" : "#1a2a3a",
                  borderWidth: 1, borderColor: "#2e405f",
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center"
                })}
              >
                <Text style={{ color: T.accent.blueAlt, fontFamily: T.mono, fontSize: T.font.sm, fontWeight: "600" }}>
                  Use Scientific Notation
                </Text>
                <Text style={{ color: useScientificNotation ? T.accent.green : T.text.muted, fontFamily: T.mono, fontSize: T.font.sm, fontWeight: "bold" }}>
                  {useScientificNotation ? "ON" : "OFF"}
                </Text>
              </Pressable>
              <Text style={{ color: T.text.disabled, fontSize: 10, fontFamily: T.mono, marginTop: T.space.xs, textAlign: "center" }}>
                Forces numbers over 100 to display as 1.00e+2
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: T.border.subtle, marginVertical: T.space.md }} />

            {showResetConfirm ? (
              <View style={{ marginBottom: T.space.sm }}>
                <Text style={{ color: T.accent.red, fontSize: T.font.sm, fontFamily: T.mono, marginBottom: T.space.xs, textAlign: "center" }}>
                  Type RESET to confirm
                </Text>
                <TextInput
                  value={resetInput}
                  onChangeText={setResetInput}
                  placeholder="RESET"
                  placeholderTextColor={T.text.disabled}
                  autoCapitalize="characters"
                  style={{
                    borderWidth: 1, borderColor: T.accent.red, borderRadius: T.radius.sm,
                    padding: T.space.sm, color: T.accent.red, fontSize: T.font.base,
                    fontFamily: T.mono, backgroundColor: "#1a0005", textAlign: "center",
                    marginBottom: T.space.sm,
                  }}
                />
              </View>
            ) : null}

            <Pressable
              onPress={handleReset}
              disabled={showResetConfirm && resetInput !== "RESET"}
              style={({ pressed }) => ({
                paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                borderRadius: T.radius.sm,
                backgroundColor: pressed ? "#5a0000" : showResetConfirm ? "#4a0000" : "#2a0005",
                borderWidth: 1, borderColor: T.accent.red,
                marginBottom: T.space.sm,
                opacity: showResetConfirm && resetInput !== "RESET" ? 0.5 : 1,
              })}
            >
              <Text style={{ color: T.accent.red, fontFamily: T.mono, fontSize: T.font.sm, textAlign: "center", fontWeight: "bold" }}>
                {showResetConfirm ? "Confirm Reset" : "Reset Save"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => ({
                paddingVertical: T.space.md, paddingHorizontal: T.space.lg,
                borderRadius: T.radius.sm,
                backgroundColor: pressed ? T.bg.elevated : T.bg.overlay,
                borderWidth: 1, borderColor: T.border.default,
              })}
            >
              <Text style={{ color: T.text.secondary, fontFamily: T.mono, fontSize: T.font.sm, textAlign: "center" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProgressContent: React.FC = () => {
  const lifetimeLoc = useGameStore((s) => s.lifetimeLoc);
  const architecturePoints = useGameStore((s) => s.architecturePoints);

  return (
    <ScrollView style={{ flex: 1, paddingTop: T.space.sm }}>
      <View style={{
        marginHorizontal: T.space.lg, borderRadius: T.radius.md,
        borderWidth: 1, borderColor: "#2e405f", backgroundColor: "#111826",
        padding: T.space.lg, marginBottom: T.space.sm,
      }}>
        <Text style={{ color: "#9fb4ff", fontSize: T.font.xs, textTransform: "uppercase", letterSpacing: 1.4, fontFamily: T.mono }}>
          Progression Snapshot
        </Text>
        <Text style={{ color: T.text.primary, fontSize: T.font.base, marginTop: T.space.xs, fontFamily: T.mono }}>
          Total LoC: {formatNumber(lifetimeLoc)}
        </Text>
        <Text style={{ color: T.text.primary, fontSize: T.font.base, marginTop: 2, fontFamily: T.mono }}>
          Architecture Points: {formatNumber(architecturePoints)}
        </Text>
      </View>
      <StatsPanel />
      <AchievementsPanel />
      <AutoBuyPanel />
      <MilestonePanel />
      <MetaTreePanel />
    </ScrollView>
  );
};

const LoadingScreen: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: USE_NATIVE_ANIM_DRIVER }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: USE_NATIVE_ANIM_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(interval);
  }, []);

  const dotStr = ".".repeat(dots);

  return (
    <View style={{
      flex: 1, backgroundColor: T.bg.base,
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: T.text.muted, fontSize: T.font.sm, fontFamily: T.mono, letterSpacing: 4, marginBottom: T.space.lg, textTransform: "uppercase" }}>
        VibeCodSim
      </Text>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Text style={{ color: T.accent.blue, fontSize: T.font.xl, fontFamily: T.mono, letterSpacing: 3 }}>
          Loading{dotStr}
        </Text>
      </Animated.View>
      <Text style={{ color: T.text.disabled, fontSize: T.font.xs, fontFamily: T.mono, marginTop: T.space.sm }}>
        Hydrating game state
      </Text>
    </View>
  );
};

const GameScreen: React.FC = () => {
  const { height, width } = useWindowDimensions();
  const [mobileTab, setMobileTab] = useState<MobileTab>("NODE");
  const [desktopSubTab, setDesktopSubTab] = useState<DesktopSubTab>("packages");
  const masterTick = useGameStore((s) => s.masterTick);
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const offlineEarnedLoc = useGameStore((s) => s.offlineEarnedLoc);
  const offlineEarnedSeconds = useGameStore((s) => s.offlineEarnedSeconds);
  const clearOfflineToast = useGameStore((s) => s.clearOfflineToast);

  useEffect(() => {
    let animationFrameId: number;
    let fallbackInterval: ReturnType<typeof setInterval>;
    if (Platform.OS === "web") {
      const loop = (timestamp: number) => { masterTick(timestamp); animationFrameId = requestAnimationFrame(loop); };
      animationFrameId = requestAnimationFrame(loop);
    } else {
      fallbackInterval = setInterval(() => { masterTick(Date.now()); }, 100);
    }
    return () => { if (Platform.OS === "web") cancelAnimationFrame(animationFrameId); else clearInterval(fallbackInterval); };
  }, [masterTick]);

  const isDesktop = width > 768;
  if (!hasHydrated) return <LoadingScreen />;

  const renderDesktopSubTab = () => {
    switch (desktopSubTab) {
      case "packages": return <PackagesContent />;
      case "advanced": return <AdvancedContent />;
      case "boost": return <BoostContent />;
      case "progress": return <ProgressContent />;
    }
  };

  if (isDesktop) {
    return (
      <View style={{
        flexDirection: "row",
        height: Platform.OS === "web" ? ("100dvh" as any) : height,
        backgroundColor: T.bg.base,
      }}>
        <View style={{ flex: 1, backgroundColor: T.bg.base, position: "relative", overflow: "hidden" }}>
          <GraphicGamePanel />
        </View>

        <View style={{
          width: 420, borderLeftWidth: 1, borderColor: T.border.subtle,
          backgroundColor: T.bg.panel, flexDirection: "column",
        }}>
          <View style={{
            padding: T.space.lg, borderBottomWidth: 1, borderColor: T.border.subtle,
            paddingTop: T.space.xl, backgroundColor: T.bg.deep,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}><TokenDisplay /></View>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                style={({ pressed }) => ({
                  padding: T.space.sm, marginLeft: T.space.sm,
                  borderRadius: T.radius.sm,
                  backgroundColor: pressed ? T.bg.elevated : "transparent",
                })}
              >
                <Settings size={18} color={T.text.muted} strokeWidth={1.5} />
              </Pressable>
            </View>
          </View>
          <EventBanner />
          <SubTabBar active={desktopSubTab} onSelect={(k) => setDesktopSubTab(k as DesktopSubTab)} tabs={DESKTOP_TABS} />
          <View style={{ flex: 1 }}>{renderDesktopSubTab()}</View>
        </View>

        {offlineEarnedLoc > 0 && <WelcomeBackToast earned={offlineEarnedLoc} offlineSeconds={offlineEarnedSeconds} onDismiss={clearOfflineToast} />}
        <ProgressToast />
        <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </View>
    );
  }

  const renderMobileTab = () => {
    switch (mobileTab) {
      case "NODE": return <GraphicGamePanel />;
      case "PACKAGES": return <PackagesContent />;
      case "ADVANCED": return <AdvancedContent />;
      case "BOOST": return <BoostContent />;
      case "PROGRESS": return <ProgressContent />;
    }
  };

  return (
    <View style={{
      flex: 1, flexDirection: "column", justifyContent: "space-between",
      backgroundColor: T.bg.base,
      height: Platform.OS === "web" ? ("100dvh" as any) : height,
    }}>
      <View style={{
        padding: T.space.lg, paddingTop: Math.max(insets.top, 20),
        borderBottomWidth: 1, borderColor: T.border.subtle, backgroundColor: T.bg.deep,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}><TokenDisplay /></View>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => ({
              padding: T.space.sm, marginLeft: T.space.sm,
              borderRadius: T.radius.sm,
              backgroundColor: pressed ? T.bg.elevated : "transparent",
            })}
          >
            <Settings size={18} color={T.text.muted} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
      <EventBanner />

      <View style={{ flex: 1, backgroundColor: T.bg.base }}>{renderMobileTab()}</View>

      <View style={{
        flexDirection: "row", borderTopWidth: 1, borderColor: T.border.subtle,
        backgroundColor: T.bg.deep, paddingBottom: Math.max(insets.bottom, 8), paddingTop: T.space.xs,
      }}>
        {MOBILE_TABS.map((t) => {
          const isActive = mobileTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setMobileTab(t.key)}
              style={{ flex: 1, alignItems: "center", paddingVertical: T.space.md + 2, gap: 3 }}
            >
              <t.Icon size={16} color={isActive ? T.accent.blue : T.text.muted} strokeWidth={isActive ? 2 : 1.5} />
              <Text style={{
                color: isActive ? T.accent.blue : T.text.muted,
                fontSize: T.font.xs, fontWeight: isActive ? "700" : "500",
                fontFamily: T.mono, letterSpacing: 0.5,
              }}>
                {t.label}
              </Text>
              {isActive && (
                <View style={{
                  width: 4, height: 4, borderRadius: 2,
                  backgroundColor: T.accent.blue, marginTop: 1,
                }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {offlineEarnedLoc > 0 && <WelcomeBackToast earned={offlineEarnedLoc} offlineSeconds={offlineEarnedSeconds} onDismiss={clearOfflineToast} />}
      <ProgressToast />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
};

export default GameScreen;

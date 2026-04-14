import React, { useState, useEffect } from "react";
import { Platform, Pressable, useWindowDimensions, View, Text, ScrollView } from "react-native";
import { useGameStore, getEnergyTechCost } from "../store/gameStore";

import { TokenDisplay } from "../components/game/TokenDisplay";
import { UpgradeCard } from "../components/game/UpgradeCard";
import { RebootButton } from "../components/game/RebootButton";
import { GraphicGamePanel } from "../components/ui/GraphicGamePanel";
import { WelcomeBackToast } from "../components/ui/WelcomeBackToast";
import { NeonText } from "../components/ui/NeonText";
import { Battery } from "lucide-react-native";
import { formatNumber } from "../utils/formatNumber";

type Tab = "UPGRADES" | "OVERCLOCK" | "SIMULATION";

const GameScreen: React.FC = () => {
  const { height, width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>("SIMULATION");
  const masterTick = useGameStore((s) => s.masterTick);

  // Offline progress toast state
  const offlineEarnedTokens = useGameStore((s) => s.offlineEarnedTokens);
  const offlineEarnedSeconds = useGameStore((s) => s.offlineEarnedSeconds);
  const clearOfflineToast = useGameStore((s) => s.clearOfflineToast);
  const rebootCount = useGameStore((s) => s.rebootCount);

  useEffect(() => {
    let animationFrameId: number;
    let fallbackInterval: ReturnType<typeof setInterval>;

    if (Platform.OS === "web") {
      const loop = (timestamp: number) => {
        masterTick(timestamp);
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    } else {
      fallbackInterval = setInterval(() => {
        masterTick(Date.now());
      }, 100);
    }

    return () => {
      if (Platform.OS === "web") cancelAnimationFrame(animationFrameId);
      else clearInterval(fallbackInterval);
    };
  }, [masterTick]);

  const isDesktop = width > 768;

  // ── Overclock Panel ───────────────────────────────────────────────────────
  const RenderOverclock = () => {
    const energyDrinks = useGameStore((s) => s.energyDrinks);
    const techLevel = useGameStore((s) => s.energyTechLevel);
    const purchaseEnergyUpgrade = useGameStore((s) => s.purchaseEnergyUpgrade);
    const cost = getEnergyTechCost(techLevel);
    const canAfford = energyDrinks >= cost;
    const isMaxed = techLevel >= 20;

    // Soft-cap bonus display
    const bonus = ((techLevel * 0.2) * (1 / (1 + techLevel * 0.05)) * 100).toFixed(0);

    return (
      <View style={{ padding: 16, flex: 1 }}>
        {/* Overclock Engine Upgrade */}
        <View
          style={{
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#333",
            backgroundColor: "#1a1a1a",
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ backgroundColor: "#111", borderRadius: 8, padding: 12 }}>
              <Battery size={24} color={canAfford ? "#39FF14" : "#858585"} strokeWidth={1.5} />
            </View>
            <View style={{ marginLeft: 0 }}>
              <Text style={{ color: "#d4d4d4", fontWeight: "500", fontSize: 16 }}>
                Overclock Engine
              </Text>
              <Text style={{ color: "#858585", fontSize: 13, marginTop: 4, fontFamily: "monospace" }}>
                Lv.{techLevel} (+{bonus}% income boost)
              </Text>
            </View>
          </View>
          <Pressable
            onPress={purchaseEnergyUpgrade}
            disabled={!canAfford || isMaxed}
            style={{
              borderRadius: 4,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: isMaxed ? "#1a1a00" : canAfford ? "#1b5e20" : "#333",
            }}
          >
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: isMaxed ? "#F3F315" : canAfford ? "#39FF14" : "#858585",
              }}
            >
              {isMaxed ? "MAXED" : `drink(${formatNumber(cost)}🥤)`}
            </Text>
          </Pressable>
        </View>

        {/* Reboot Section Label */}
        <Text
          style={{
            color: "#FF073A",
            textTransform: "uppercase",
            fontSize: 11,
            fontWeight: "bold",
            letterSpacing: 1.5,
            marginBottom: 8,
            marginTop: 8,
            paddingHorizontal: 0,
            fontFamily: "monospace",
          }}
        >
          ⚠ Danger Zone — Vibe v{rebootCount}.0.0
        </Text>
        <RebootButton />

        <View style={{ alignItems: "center", marginTop: 12 }}>
          <Text style={{ color: "white", fontSize: 11, opacity: 0.35, textAlign: "center", fontFamily: "monospace" }}>
            Tap floating energy cans in Simulation to earn 🥤
          </Text>
        </View>
      </View>
    );
  };

  // ── Upgrade List ──────────────────────────────────────────────────────────
  const RenderUpgrades = () => (
    <ScrollView style={{ flex: 1, paddingTop: 4 }}>
      {/* Core Packages */}
      <Text style={{ paddingHorizontal: 16, color: "#858585", textTransform: "uppercase", fontSize: 11, fontWeight: "bold", marginBottom: 8, marginTop: 12, letterSpacing: 1.5 }}>
        General Packages
      </Text>
      <UpgradeCard type="autoCoder" title="Auto-Coder Unit" versionPrefix="v" />
      <UpgradeCard type="server" title="Dedicated AWS Node" versionPrefix="ec2-" />
      <UpgradeCard type="keyboard" title="Mechanical Switch" versionPrefix="mk-" />

      {/* Discovery Unlocks */}
      <Text style={{ paddingHorizontal: 16, color: "#858585", textTransform: "uppercase", fontSize: 11, fontWeight: "bold", marginBottom: 8, marginTop: 16, letterSpacing: 1.5 }}>
        Advanced Modules
      </Text>
      <UpgradeCard
        type="aiPair"
        title="AI Pair Programmer"
        unlocksAt={500}
        description="−15% strain per level"
      />
      <UpgradeCard
        type="gitAutopilot"
        title="Git Autopilot"
        unlocksAt={5000}
        description="+10% passive LoC/sec per level"
      />
      <UpgradeCard
        type="cloudBurst"
        title="Cloud Burst"
        unlocksAt={50000}
        description="2× income for 30s (costs 1🥤)"
      />
    </ScrollView>
  );

  // ── Tab content switcher ──────────────────────────────────────────────────
  const renderActiveTab = () => {
    switch (activeTab) {
      case "SIMULATION":
        return <GraphicGamePanel />;
      case "UPGRADES":
        return <RenderUpgrades />;
      case "OVERCLOCK":
        return <RenderOverclock />;
    }
  };

  const TabButton = ({ tab, label }: { tab: Tab; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        onPress={() => setActiveTab(tab)}
        className={`px-4 py-3 border-b-2 flex-1 items-center ${isActive ? "border-[#007acc] bg-[#1e1e1e]" : "border-transparent"}`}
      >
        <NeonText color={isActive ? "blue" : "white"} size="sm" className={isActive ? "" : "opacity-50"}>
          {label}
        </NeonText>
      </Pressable>
    );
  };

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View
        className="bg-[#080808]"
        style={{
          flexDirection: "row",
          height: Platform.OS === "web" ? ("100vh" as any) : height,
          backgroundColor: "#080808",
        }}
      >
        {/* Left pane — Stats & Upgrades */}
        <View
          style={{
            width: 350,
            borderRightWidth: 1,
            borderColor: "#222",
            backgroundColor: "#0a0a0a",
            flexDirection: "column",
          }}
        >
          {/* Header Stats */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#222", paddingTop: 24, backgroundColor: "#050505" }}>
            <TokenDisplay />
          </View>

          <ScrollView style={{ flex: 1, paddingTop: 8 }}>
            {/* Core upgrades */}
            <Text style={{ paddingHorizontal: 16, color: "#858585", textTransform: "uppercase", fontSize: 11, fontWeight: "bold", marginBottom: 8, marginTop: 12, letterSpacing: 1.5 }}>
              General Packages
            </Text>
            <UpgradeCard type="autoCoder" title="Auto-Coder Unit" versionPrefix="v" />
            <UpgradeCard type="server" title="Dedicated AWS Node" versionPrefix="ec2-" />
            <UpgradeCard type="keyboard" title="Mechanical Switch" versionPrefix="mk-" />

            {/* Discovery unlocks */}
            <Text style={{ paddingHorizontal: 16, color: "#858585", textTransform: "uppercase", fontSize: 11, fontWeight: "bold", marginBottom: 8, marginTop: 16, letterSpacing: 1.5 }}>
              Advanced Modules
            </Text>
            <UpgradeCard type="aiPair" title="AI Pair Programmer" unlocksAt={500} description="−15% strain per level" />
            <UpgradeCard type="gitAutopilot" title="Git Autopilot" unlocksAt={5000} description="+10% passive LoC/sec per level" />
            <UpgradeCard type="cloudBurst" title="Cloud Burst" unlocksAt={50000} description="2× income for 30s (costs 1🥤)" />

            {/* Prestige section */}
            <Text style={{ paddingHorizontal: 16, color: "#39FF14", textTransform: "uppercase", fontSize: 11, fontWeight: "bold", marginBottom: 8, marginTop: 20, letterSpacing: 1.5 }}>
              Prestige
            </Text>
            <RenderOverclock />
          </ScrollView>
        </View>

        {/* Right pane — Simulation */}
        <View style={{ flex: 1, backgroundColor: "#121417", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <GraphicGamePanel />
        </View>

        {/* Offline Toast (desktop) */}
        {offlineEarnedTokens > 0 && (
          <WelcomeBackToast
            earned={offlineEarnedTokens}
            offlineSeconds={offlineEarnedSeconds}
            onDismiss={clearOfflineToast}
          />
        )}
      </View>
    );
  }

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  return (
    <View
      className="bg-void flex-col justify-between"
      style={{ height: Platform.OS === "web" ? ("100vh" as any) : height }}
    >
      {/* Top Stats */}
      <View className="p-4 pt-12 border-b border-[#1a1a1a] bg-[#060606]">
        <TokenDisplay />
      </View>

      {/* Main View */}
      <View className="flex-1 bg-[#080808]">
        {renderActiveTab()}
      </View>

      {/* Bottom Taskbar */}
      <View className="flex-row border-t border-[#1a1a1a] bg-[#060606] pb-6 pt-2 justify-around">
        <TabButton tab="UPGRADES" label="Upgrades" />
        <TabButton tab="SIMULATION" label="Node" />
        <TabButton tab="OVERCLOCK" label="Boost" />
      </View>

      {/* Offline Toast (mobile) */}
      {offlineEarnedTokens > 0 && (
        <WelcomeBackToast
          earned={offlineEarnedTokens}
          offlineSeconds={offlineEarnedSeconds}
          onDismiss={clearOfflineToast}
        />
      )}
    </View>
  );
};

export default GameScreen;

import React from "react";
import { Pressable, ScrollView, Text, View, Platform, useWindowDimensions } from "react-native";
import { META_NODE_DEFINITIONS, useGameStore } from "../../store/gameStore";
import { T } from "../../constants/theme";

const TREE_LAYOUT: Record<string, { x: number; y: number }> = {
  steadyHands:     { x: 50, y: 0 },
  threadOptimizer: { x: 25, y: 1 },
  couponCompiler:  { x: 75, y: 1 },
  sparkMagnet:     { x: 15, y: 2 },
  burstDaemon:     { x: 50, y: 2 },
  architectMind:   { x: 50, y: 3 },
};

const NODE_W = 140;
const NODE_H = 72;
const ROW_H = 100;
const PADDING_TOP = 16;

const ConnectionLine: React.FC<{
  fromX: number; fromY: number; toX: number; toY: number; active: boolean;
}> = ({ fromX, fromY, toX, toY, active }) => {
  const midY = (fromY + toY) / 2;
  const color = active ? `${T.accent.green}55` : `${T.border.default}88`;
  const w = 2;

  return (
    <>
      <View style={{ position: "absolute", left: fromX, top: fromY, width: w, height: midY - fromY, backgroundColor: color }} />
      <View style={{ position: "absolute", left: Math.min(fromX, toX), top: midY, width: Math.abs(toX - fromX) + w, height: w, backgroundColor: color }} />
      <View style={{ position: "absolute", left: toX, top: midY, width: w, height: toY - midY, backgroundColor: color }} />
    </>
  );
};

export const MetaTreePanel: React.FC = () => {
  const architecturePoints = useGameStore((s) => s.architecturePoints);
  const unlockedMetaNodes = useGameStore((s) => s.unlockedMetaNodes);
  const purchaseMetaNode = useGameStore((s) => s.purchaseMetaNode);
  const respecMetaTree = useGameStore((s) => s.respecMetaTree);

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth - 32, 380);
  const totalRows = 4;
  const containerHeight = totalRows * ROW_H + PADDING_TOP + 24;

  const getNodeCenter = (nodeId: string) => {
    const layout = TREE_LAYOUT[nodeId];
    if (!layout) return { cx: 0, cy: 0 };
    return {
      cx: (layout.x / 100) * containerWidth,
      cy: PADDING_TOP + layout.y * ROW_H + NODE_H / 2,
    };
  };

  const connections: { from: string; to: string }[] = [];
  for (const node of META_NODE_DEFINITIONS) {
    for (const req of node.requires) {
      connections.push({ from: req, to: node.id });
    }
  }

  const glowWeb = (color: string) =>
    Platform.OS === "web" ? { boxShadow: `0 0 12px ${color}44, 0 0 4px ${color}66` } as any : {};

  return (
    <View style={{ marginHorizontal: T.space.lg, marginTop: T.space.sm, marginBottom: T.space.lg }}>
      <View style={{
        borderRadius: T.radius.md,
        borderWidth: 1,
        borderColor: "#36435c",
        backgroundColor: "#0e1219",
        padding: T.space.lg,
        marginBottom: T.space.sm,
      }}>
        <Text style={{ color: "#9fb4ff", fontSize: T.font.sm, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1.4 }}>
          Meta Tree
        </Text>
        <Text style={{ color: T.text.primary, fontSize: T.font.xl, fontFamily: T.mono, fontWeight: "800", marginTop: T.space.xs }}>
          {architecturePoints} AP
        </Text>
        <Text style={{ color: "#7f8aa1", fontSize: T.font.xs, fontFamily: T.mono, marginTop: T.space.xs }}>
          Permanent bonuses across all reboots
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: containerWidth, height: containerHeight, position: "relative" }}>
          {connections.map((conn) => {
            const from = getNodeCenter(conn.from);
            const to = getNodeCenter(conn.to);
            const active = unlockedMetaNodes.includes(conn.from) && unlockedMetaNodes.includes(conn.to);
            return (
              <ConnectionLine
                key={`${conn.from}-${conn.to}`}
                fromX={from.cx} fromY={from.cy + NODE_H / 2}
                toX={to.cx} toY={to.cy - NODE_H / 2}
                active={active}
              />
            );
          })}

          {META_NODE_DEFINITIONS.map((node) => {
            const layout = TREE_LAYOUT[node.id];
            if (!layout) return null;
            const unlocked = unlockedMetaNodes.includes(node.id);
            const prereqsMet = node.requires.every((id) => unlockedMetaNodes.includes(id));
            const canAfford = architecturePoints >= node.cost;
            const canBuy = !unlocked && prereqsMet && canAfford;

            const left = (layout.x / 100) * containerWidth - NODE_W / 2;
            const top = PADDING_TOP + layout.y * ROW_H;

            const borderColor = unlocked ? T.accent.green : canBuy ? T.accent.blueAlt : prereqsMet ? "#33405a" : T.border.subtle;
            const bg = unlocked ? "#0f2512" : canBuy ? "#0e1d30" : "#161a22";

            return (
              <Pressable
                key={node.id}
                onPress={() => canBuy && purchaseMetaNode(node.id)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canBuy, selected: unlocked }}
                accessibilityLabel={`${node.title}: ${node.description}. ${unlocked ? "Owned" : `Costs ${node.cost} AP`}`}
                style={({ pressed }) => ({
                  position: "absolute", left, top, width: NODE_W, height: NODE_H,
                  borderRadius: T.radius.md,
                  borderWidth: 2,
                  borderColor,
                  backgroundColor: bg,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: T.space.sm,
                  transform: [{ scale: pressed && canBuy ? 0.95 : 1 }],
                  ...(unlocked ? glowWeb(T.accent.green) : {}),
                })}
              >
                <View style={{
                  position: "absolute", top: -8, right: -4,
                  backgroundColor: unlocked ? T.accent.green : canAfford ? T.accent.blueAlt : T.text.muted,
                  borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
                  borderWidth: 1, borderColor: bg,
                }}>
                  <Text style={{ color: "#000", fontSize: 8, fontWeight: "bold", fontFamily: T.mono }}>
                    {unlocked ? "✓" : `${node.cost}`}
                  </Text>
                </View>
                <Text numberOfLines={1} style={{
                  color: unlocked ? "#7bff68" : canBuy ? "#cce0ff" : T.text.muted,
                  fontWeight: "700", fontSize: T.font.sm, fontFamily: T.mono, textAlign: "center",
                }}>
                  {node.title}
                </Text>
                <Text numberOfLines={2} style={{
                  color: unlocked ? "#5a9f50" : T.text.disabled,
                  fontSize: T.font.xs, fontFamily: T.mono, textAlign: "center", marginTop: 2,
                  lineHeight: 13,
                }}>
                  {node.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable
        onPress={respecMetaTree}
        style={({ pressed }) => ({
          marginTop: T.space.sm,
          borderRadius: T.radius.sm,
          paddingVertical: T.space.md,
          alignItems: "center",
          backgroundColor: pressed ? "#3f2d42" : "#2f2230",
          borderWidth: 1,
          borderColor: "#6f4a72",
        })}
      >
        <Text style={{ color: "#e7b6ec", fontFamily: T.mono, fontSize: T.font.sm }}>
          Respec Tree (80% refund)
        </Text>
      </Pressable>
    </View>
  );
};

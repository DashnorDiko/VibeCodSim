import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, Platform, Modal, SafeAreaView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { META_NODE_DEFINITIONS, useGameStore } from "../../store/gameStore";
import { T } from "../../constants/theme";


const NODE_W = 140;
const NODE_H = 72;
const ROW_H = 120;
const PADDING_TOP = 20;


export const MetaTreePanel: React.FC = () => {
  const architecturePoints = useGameStore((s) => s.architecturePoints);
  const unlockedMetaNodes = useGameStore((s) => s.unlockedMetaNodes);
  const purchaseMetaNode = useGameStore((s) => s.purchaseMetaNode);
  const respecMetaTree = useGameStore((s) => s.respecMetaTree);

  const [modalVisible, setModalVisible] = useState(false);

  const nodeLevels: Record<string, number> = {};
  const calculateLevel = (nodeId: string): number => {
    if (nodeLevels[nodeId] !== undefined) return nodeLevels[nodeId];
    const node = META_NODE_DEFINITIONS.find((n) => n.id === nodeId);
    if (!node || node.requires.length === 0) {
      nodeLevels[nodeId] = 0;
      return 0;
    }
    const maxReqLevel = Math.max(...node.requires.map(calculateLevel));
    nodeLevels[nodeId] = maxReqLevel + 1;
    return nodeLevels[nodeId];
  };

  const nodesByLevel: Record<number, string[]> = {};
  let maxLevel = 0;
  for (const node of META_NODE_DEFINITIONS) {
    const lvl = calculateLevel(node.id);
    if (lvl > maxLevel) maxLevel = lvl;
    if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
    nodesByLevel[lvl].push(node.id);
  }

  const maxNodesInLevel = Math.max(...Object.values(nodesByLevel).map((v) => v.length));
  const COL_W = 280;
  const MIN_ROW_H = 120;
  const PADDING_LEFT = 40;

  const dynamicLayout: Record<string, { x: number; y: number }> = {};
  for (const lvl in nodesByLevel) {
    const levelNum = parseInt(lvl, 10);
    const nodesInLevel = nodesByLevel[lvl];
    nodesInLevel.forEach((nodeId, index) => {
      const yPercent = ((index + 1) / (nodesInLevel.length + 1)) * 100;
      dynamicLayout[nodeId] = { x: levelNum, y: yPercent };
    });
  }

  const TREE_CANVAS_W = (maxLevel + 1) * COL_W + PADDING_LEFT * 2;
  const TREE_CANVAS_H = Math.max(600, maxNodesInLevel * MIN_ROW_H + PADDING_TOP * 2);

  const getNodeCenter = (nodeId: string) => {
    const layout = dynamicLayout[nodeId];
    if (!layout) return { cx: 0, cy: 0 };
    return {
      cx: PADDING_LEFT + NODE_W / 2 + layout.x * COL_W,
      cy: (layout.y / 100) * TREE_CANVAS_H,
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
    <>
      <View style={{ marginHorizontal: T.space.lg, marginTop: T.space.sm, marginBottom: T.space.lg }}>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => ({
            borderRadius: T.radius.md,
            borderWidth: 1,
            borderColor: "#36435c",
            backgroundColor: pressed ? "#19202c" : "#0e1219",
            padding: T.space.lg,
            alignItems: "center",
          })}
        >
          <Text style={{ color: "#9fb4ff", fontSize: T.font.sm, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1.4 }}>
            Open Meta Tree
          </Text>
          <Text style={{ color: T.text.primary, fontSize: T.font.xl, fontFamily: T.mono, fontWeight: "800", marginTop: T.space.xs }}>
            {architecturePoints} AP
          </Text>
          <Text style={{ color: "#7f8aa1", fontSize: T.font.xs, fontFamily: T.mono, marginTop: T.space.xs }}>
            Permanent bonuses across all reboots
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0e14" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: T.space.lg, borderBottomWidth: 1, borderBottomColor: "#36435c" }}>
            <View>
              <Text style={{ color: "#9fb4ff", fontSize: T.font.base, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 1.4 }}>
                Meta Tree
              </Text>
              <Text style={{ color: T.text.primary, fontSize: T.font.lg, fontFamily: T.mono, fontWeight: "800" }}>
                {architecturePoints} AP Available
              </Text>
            </View>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => ({
                paddingHorizontal: T.space.lg,
                paddingVertical: T.space.md,
                backgroundColor: pressed ? "#2c384e" : "#202838",
                borderRadius: T.radius.sm,
              })}
            >
              <Text style={{ color: T.text.primary, fontFamily: T.mono, fontWeight: "bold" }}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 40 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 40 }}>
              <View style={{ width: TREE_CANVAS_W, height: TREE_CANVAS_H, position: "relative" }}>
                <Svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                  {connections.map((conn) => {
                    const from = getNodeCenter(conn.from);
                    const to = getNodeCenter(conn.to);
                    const active = unlockedMetaNodes.includes(conn.from) && unlockedMetaNodes.includes(conn.to);
                    const fromX = from.cx + NODE_W / 2;
                    const fromY = from.cy;
                    const toX = to.cx - NODE_W / 2;
                    const toY = to.cy;
                    const cp1X = fromX + (toX - fromX) / 2;
                    const cp1Y = fromY;
                    const cp2X = toX - (toX - fromX) / 2;
                    const cp2Y = toY;
                    const color = active ? `${T.accent.green}aa` : `${T.border.default}66`;

                    return (
                      <Path
                        key={`${conn.from}-${conn.to}`}
                        d={`M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                      />
                    );
                  })}
                </Svg>

                {META_NODE_DEFINITIONS.map((node) => {
                  const layout = dynamicLayout[node.id];
                  if (!layout) return null;
                  const unlocked = unlockedMetaNodes.includes(node.id);
                  const prereqsMet = node.requires.every((id) => unlockedMetaNodes.includes(id));
                  const canAfford = architecturePoints >= node.cost;
                  const canBuy = !unlocked && prereqsMet && canAfford;

                  const nodeCenter = getNodeCenter(node.id);
                  const left = nodeCenter.cx - NODE_W / 2;
                  const top = nodeCenter.cy - NODE_H / 2;

                  const borderColor = unlocked ? T.accent.green : canBuy ? T.accent.blueAlt : prereqsMet ? "#33405a" : T.border.subtle;
                  const bg = unlocked ? "#0f2512" : canBuy ? "#0e1d30" : "#161a22";

                  return (
                    <View
                      key={node.id}
                      style={{
                        position: "absolute", left, top, width: NODE_W, height: NODE_H,
                      }}
                    >
                      <Pressable
                        onPress={() => canBuy && purchaseMetaNode(node.id)}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canBuy, selected: unlocked }}
                        accessibilityLabel={`${node.title}: ${node.description}. ${unlocked ? "Owned" : `Costs ${node.cost} AP`}`}
                        style={{
                          width: "100%", height: "100%",
                          borderRadius: T.radius.md,
                          borderWidth: 2,
                          borderStyle: "solid",
                          borderColor,
                          backgroundColor: bg,
                          justifyContent: "center",
                          alignItems: "center",
                          paddingHorizontal: T.space.sm,
                          ...(unlocked ? glowWeb(T.accent.green) : {}),
                        }}
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
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>

          <View style={{ padding: T.space.lg, borderTopWidth: 1, borderTopColor: "#36435c", backgroundColor: "#0e1219" }}>
            <Pressable
              onPress={respecMetaTree}
              style={({ pressed }) => ({
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
        </SafeAreaView>
      </Modal>
    </>
  );
};

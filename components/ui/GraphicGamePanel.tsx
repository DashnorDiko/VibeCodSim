import React from "react";
import { View, Pressable, Text, Image } from "react-native";
import { useGameStore } from "../../store/gameStore";
import { InspirationSpark } from "../game/InspirationSpark";
import { BonusWordTarget } from "../game/BonusWordTarget";

export const GraphicGamePanel: React.FC = () => {
  const tapProgrammer = useGameStore((s) => s.tapProgrammer);
  const activeSparks = useGameStore((s) => s.activeSparks);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4 }}>
        SIMULATION
      </Text>
      <Text style={{ color: '#a0a0a0', marginBottom: 32, textAlign: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
        Interactive Visual Node
      </Text>

      {/* 16-bit Programmer Graphic Area */}
      <Pressable
        onPress={tapProgrammer}
        style={({ pressed }) => ({
          width: 288,
          height: 288,
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#444',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transform: [{ scale: pressed ? 0.95 : 1.0 }],
        })}
      >
        <Image
          source={require("../../assets/images/programmer.png")}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.8 }}
        />
        <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', borderRadius: 6, alignItems: 'center', marginTop: 'auto', marginBottom: 16, borderWidth: 1, borderColor: '#555', position: 'relative', zIndex: 10 }}>
          <Text style={{ color: '#ffffff', fontWeight: 'bold', letterSpacing: 2, fontSize: 12 }}>
            TAP TO EXECUTE
          </Text>
        </View>
      </Pressable>

      {/* Render Active Sparks overlays */}
      {activeSparks.map((spark) => (
        <InspirationSpark key={spark.id} spark={spark} />
      ))}

      {/* Bonus Word Tap Target */}
      <BonusWordTarget />
    </View>
  );
};

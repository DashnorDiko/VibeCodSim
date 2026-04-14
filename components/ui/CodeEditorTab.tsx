import React, { useState } from "react";
import { View, TextInput, Text } from "react-native";
import { useGameStore } from "../../store/gameStore";
import { NeonText } from "./NeonText";
import { GlowContainer } from "./GlowContainer";
import { StrainMeter } from "../game/StrainMeter";

export const CodeEditorTab: React.FC = () => {
  const claimBonusWord = useGameStore((s) => s.claimBonusWord);
  const activeBonusWord = useGameStore((s) => s.activeBonusWord);
  
  const [text, setText] = useState("");

  const handleChangeText = (val: string) => {
    setText(val);
    const tokens = val.split(/[\s\n]+/);
    const lastWord = tokens[tokens.length - 1] || tokens[tokens.length - 2] || ""; 
    
    claimBonusWord();
  };

  return (
    <View className="flex-1 p-4 bg-[#141414]">
      <StrainMeter />
      
      <View className="flex-row justify-between items-center mb-4 border-b border-[#333] pb-2">
        <Text className="text-white font-bold tracking-widest text-sm opacity-90 uppercase">
          index.ts - (Active Buffer)
        </Text>
        {activeBonusWord && (
          <View className="px-4 py-1.5 bg-[#1F4C9D] rounded flex-row items-center border border-[#3E80FB]">
            <Text className="text-white font-bold text-sm tracking-widest">
              TARGET: {activeBonusWord}
            </Text>
          </View>
        )}
      </View>
      
      <View className="flex-1 bg-[#0a0a0a] p-4 relative rounded border border-[#222]">
        <TextInput
          className="flex-1 text-[#4AF626] font-mono text-lg leading-7"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          value={text}
          onChangeText={handleChangeText}
          placeholder="// Start typing code here to generate LoC..."
          placeholderTextColor="#276B1C"
          textAlignVertical="top"
          style={{ fontFamily: 'monospace', outlineStyle: 'none' } as any}
        />
      </View>
    </View>
  );
};

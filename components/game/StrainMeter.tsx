import React from "react";
import { View, Text } from "react-native";
import { useGameStore } from "../../store/gameStore";
import { NeonText } from "../ui/NeonText";

export const StrainMeter: React.FC = () => {
  const strainLevel = useGameStore((s) => s.strainLevel);
  const isBurnedOut = useGameStore((s) => s.isBurnedOut);

  // Determine width percentage
  const widthPct = Math.min(100, Math.max(0, strainLevel));
  
  const barColor = isBurnedOut 
    ? "bg-[#FF073A] shadow-[#FF073A]" 
    : (strainLevel > 80 ? "bg-[#F3F315] shadow-[#F3F315]" : "bg-[#00D4FF] shadow-[#00D4FF]");

  const textColor = isBurnedOut ? "red" : (strainLevel > 80 ? "yellow" : "blue");

  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <NeonText size="sm" color={textColor} className="uppercase font-mono">
          {isBurnedOut ? "SYSTEM OVERHEAT - COOLDOWN REQ" : "SYSTEM STRAIN"}
        </NeonText>
        <Text className="text-white font-mono text-xs opacity-75">
          {Math.floor(widthPct)}%
        </Text>
      </View>
      <View className="h-3 bg-[#111] rounded-full overflow-hidden border border-[#333]">
        <View 
          className={`h-full rounded-full ${barColor}`} 
          style={{ 
            width: `${widthPct}%`, 
            shadowOffset: { width: 0, height: 0 }, 
            shadowOpacity: 0.8, 
            shadowRadius: 5,
            elevation: 3 
          }} 
        />
      </View>
    </View>
  );
};

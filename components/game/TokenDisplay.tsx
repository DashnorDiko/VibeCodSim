import React from "react";
import { View, Text, Image } from "react-native";
import { Zap } from "lucide-react-native";

import { useGameStore } from "../../store/gameStore";
import { formatNumber } from "../../utils/formatNumber";

export const TokenDisplay: React.FC = () => {
  const neuralTokens = useGameStore((s) => s.neuralTokens);
  const energyDrinks = useGameStore((s) => s.energyDrinks);

  return (
    <View className="flex-col gap-2" style={{ flexDirection: 'column', gap: 8 }}>
      {/* LoC Tokens Row */}
      <View className="flex-row items-center gap-3" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Zap size={24} color="#3E80FB" />
        <View>
          <Text className="text-white text-2xl font-bold font-mono" style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
            {formatNumber(neuralTokens)} <Text className="text-[#3E80FB] text-sm" style={{ color: '#3E80FB', fontSize: 14 }}>LoC</Text>
          </Text>
          <Text className="text-[#a0a0a0] text-xs font-mono uppercase tracking-widest mt-0.5" style={{ color: '#a0a0a0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
            Total Generated
          </Text>
        </View>
      </View>

      {/* Energy Drinks Prestige Currency Row */}
      <View className="flex-row items-center gap-2 mt-1 px-1" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingHorizontal: 4 }}>
        <Image 
          source={require("../../assets/images/energy_drink.png")} 
          style={{ width: 18, height: 18, resizeMode: "contain" }}
        />
        <Text className="text-[#39FF14] text-lg font-bold font-mono" style={{ color: '#39FF14', fontSize: 18, fontWeight: 'bold' }}>
          {energyDrinks.toLocaleString()} <Text className="text-[#a0a0a0] text-xs font-mono" style={{ color: '#a0a0a0', fontSize: 12 }}>CANS</Text>
        </Text>
      </View>
    </View>
  );
};

import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Image, Easing, Text } from "react-native";
import { useGameStore, Spark } from "../../store/gameStore";

export const InspirationSpark: React.FC<{ spark: Spark }> = ({ spark }) => {
  const collectSpark = useGameStore((s) => s.collectSpark);
  
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop in
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();

    // Rotate continuously
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(float, { toValue: 10, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handlePress = () => {
    // Animate out before collecting
    Animated.timing(scale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      collectSpark(spark.id);
    });
  };

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: `${spark.y}%`,
        left: `${spark.x}%`,
        transform: [
          { scale },
          { translateY: float }
        ],
        zIndex: 50,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}
      >
        <Animated.Image
          source={require("../../assets/images/energy_drink.png")}
          style={{
            width: 40,
            height: 40,
            transform: [{ rotate: spin }],
            resizeMode: 'contain',
          }}
        />
        <Text style={{ color: '#F3F315', fontSize: 12, fontWeight: 'bold', marginTop: 4, position: 'absolute', bottom: -24, fontFamily: 'monospace' }}>
          +{spark.value}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

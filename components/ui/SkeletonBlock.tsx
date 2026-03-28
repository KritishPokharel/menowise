import { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { radius } from "@/constants/theme";

interface SkeletonBlockProps {
  height: number;
  style?: ViewStyle;
}

export const SkeletonBlock = ({ height, style }: SkeletonBlockProps) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true })
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { height, opacity }]} />;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    backgroundColor: "#F3EAF0"
  }
});

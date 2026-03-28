import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface AppCardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export const AppCard = ({ children, style }: AppCardProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 260, useNativeDriver: true })
    ]).start();
  }, [opacity, slideY]);

  return (
    <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY: slideY }] }]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.xs,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  }
});

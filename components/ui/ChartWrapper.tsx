import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export const ChartWrapper = ({ children }: PropsWithChildren) => {
  return <View style={styles.wrap}>{children}</View>;
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#FFF8FC",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  }
});

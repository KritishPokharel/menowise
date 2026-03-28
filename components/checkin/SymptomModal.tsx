import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { colors, radius, spacing } from "@/constants/theme";

export type SymptomKey =
  | "exhaustion"
  | "jointPain"
  | "hotFlashes"
  | "sleepIssues"
  | "vaginalDryness"
  | "depression";

export type SymptomResponses = Record<SymptomKey, number>;

interface SymptomModalProps {
  visible: boolean;
  values: SymptomResponses;
  onClose: () => void;
  onChange: (key: SymptomKey, value: number) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

const symptomMeta: Array<{ key: SymptomKey; labelKey: string; emoji: string }> = [
  { key: "exhaustion", labelKey: "checkinSymptomsExhaustion", emoji: "🫠" },
  { key: "jointPain", labelKey: "checkinSymptomsJointPain", emoji: "🦴" },
  { key: "hotFlashes", labelKey: "checkinSymptomsHotFlashes", emoji: "🔥" },
  { key: "vaginalDryness", labelKey: "checkinSymptomsVaginalDryness", emoji: "💧" },
  { key: "depression", labelKey: "checkinSymptomsDepression", emoji: "🌧️" },
  { key: "sleepIssues", labelKey: "checkinSymptomsSleepIssues", emoji: "🌙" }
];

const severityColors = ["#6B7280", "#4FAF7A", "#E39C5A", "#D96A4C", "#C2415D"];

export const SymptomModal = ({
  visible,
  values,
  onClose,
  onChange,
  onSubmit,
  submitting = false
}: SymptomModalProps) => {
  const { t } = useTranslation();
  const scaleLabels = [
    t("checkinNone"),
    t("checkinMild"),
    t("checkinModerate"),
    t("checkinSevere"),
    t("checkinVerySevere")
  ];
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    dragY.setValue(0);
  }, [dragY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => gesture.dy > 8,
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) {
            dragY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 1.1) {
            Animated.timing(dragY, { toValue: 380, duration: 180, useNativeDriver: true }).start(onClose);
            return;
          }
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      }),
    [dragY, onClose]
  );

  const answeredCount = symptomMeta.filter((item) => values[item.key] >= 0).length;
  const isComplete = answeredCount === symptomMeta.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>✨ {t("checkinSymptomTitle")}</Text>
          <Text style={styles.sub}>
            {t("checkinSymptomScale")}
          </Text>
          <View style={styles.legendRow}>
            {[0, 1, 2, 3, 4].map((n) => (
              <View key={`legend-${n}`} style={[styles.legendChip, { borderColor: severityColors[n] }]}>
                <Text style={[styles.legendText, { color: severityColors[n] }]}>
                  {n} {scaleLabels[n]}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.progressOverall}>
            {t("checkinProgress", {
              defaultValue: "{{current}} / {{total}} complete",
              current: answeredCount,
              total: symptomMeta.length
            })}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {symptomMeta.map((item, idx) => (
              <View key={item.key} style={styles.questionBlock}>
                <View style={styles.qTop}>
                  <Text style={styles.qLabel}>
                    {item.emoji} {t(item.labelKey)}
                  </Text>
                  <Text style={styles.progressItem}>
                    {idx + 1}/{symptomMeta.length}
                  </Text>
                </View>
                <View style={styles.row}>
                  {[0, 1, 2, 3, 4].map((value) => (
                    <Pressable
                      key={`${item.key}-${value}`}
                      style={[styles.scaleBtn, values[item.key] === value && styles.scaleBtnActive]}
                      onPress={() => onChange(item.key, value)}
                    >
                      <Text style={[styles.scaleText, values[item.key] === value && styles.scaleTextActive]}>
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {values[item.key] >= 0 ? (
                  <View style={styles.badgeWrap}>
                    <View style={[styles.badge, { backgroundColor: `${severityColors[values[item.key]]}22` }]}>
                      <Text style={[styles.badgeText, { color: severityColors[values[item.key]] }]}>
                        {scaleLabels[values[item.key]]}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}

            <AppButton
              label={submitting ? t("loading") : t("checkinSubmit")}
              onPress={onSubmit}
              variant={isComplete ? "primary" : "secondary"}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(22, 10, 16, 0.28)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#FFF7FA",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E9D5DF"
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 24
  },
  sub: {
    color: colors.textMuted,
    marginTop: 2
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  legendChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FFFFFF"
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700"
  },
  progressOverall: {
    color: colors.primaryDark,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6
  },
  listContent: {
    paddingBottom: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#F0DFE8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  questionBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E6EC"
  },
  qTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" },
  qLabel: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
    flex: 1
  },
  progressItem: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  scaleBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center"
  },
  scaleBtnActive: {
    borderColor: colors.primaryDark,
    backgroundColor: "#FDE7F1"
  },
  scaleText: {
    color: colors.text,
    fontWeight: "700"
  },
  scaleTextActive: {
    color: colors.primaryDark
  },
  badgeWrap: {
    marginTop: 8,
    flexDirection: "row"
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12
  }
});

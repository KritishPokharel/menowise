import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, spacing } from "@/constants/theme";

type FamilyMember = {
  id: string;
  name: string;
  relation: string;
};

export default function FamilyScreen() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [shareMood, setShareMood] = useState(true);
  const [shareSymptoms, setShareSymptoms] = useState(false);
  const [shareSleep, setShareSleep] = useState(false);

  const addMember = () => {
    if (!name.trim() || !relation.trim()) return;
    setMembers((prev) => [
      ...prev,
      { id: `${Date.now()}`, name: name.trim(), relation: relation.trim() }
    ]);
    setName("");
    setRelation("");
    setOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBar title={t("family")} subtitle={t("familySubtitle")} />

        <AppCard style={styles.hero}>
          <Text style={styles.heroTitle}>{t("familyTrustedCircle")}</Text>
          <Text style={styles.heroSub}>{t("familyTrustedCircleSub")}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {members.length} {t("familyMembers")}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("familyControlledSharing")}</Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <AppButton label={t("familyAddMember")} onPress={() => setOpen(true)} />
          </View>
        </AppCard>

        <AppCard>
          <SectionHeader title={t("familyShareDataTitle")} />
          <View style={styles.switchList}>
            <Pressable style={styles.switchRow} onPress={() => setShareMood((v) => !v)}>
              <Text style={styles.switchText}>{t("familyShareMood")}</Text>
              <Ionicons name={shareMood ? "checkmark-circle" : "ellipse-outline"} color={shareMood ? colors.primaryDark : colors.textMuted} size={22} />
            </Pressable>
            <Pressable style={styles.switchRow} onPress={() => setShareSymptoms((v) => !v)}>
              <Text style={styles.switchText}>{t("familyShareSymptoms")}</Text>
              <Ionicons name={shareSymptoms ? "checkmark-circle" : "ellipse-outline"} color={shareSymptoms ? colors.primaryDark : colors.textMuted} size={22} />
            </Pressable>
            <Pressable style={styles.switchRow} onPress={() => setShareSleep((v) => !v)}>
              <Text style={styles.switchText}>{t("familyShareSleep")}</Text>
              <Ionicons name={shareSleep ? "checkmark-circle" : "ellipse-outline"} color={shareSleep ? colors.primaryDark : colors.textMuted} size={22} />
            </Pressable>
          </View>
        </AppCard>

        <AppCard>
          <SectionHeader title={t("familyMembersList")} />
          {members.length ? (
            <View style={styles.memberList}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRelation}>{member.relation}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>{t("familyEmptyMembers")}</Text>
          )}
        </AppCard>
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("familyAddMember")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("familyMemberNamePlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={relation}
              onChangeText={setRelation}
              placeholder={t("familyRelationPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <AppButton label={t("save")} onPress={addMember} />
            <View style={{ marginTop: 10 }}>
              <AppButton label={t("back")} variant="secondary" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 110, gap: spacing.sm },
  hero: { backgroundColor: "#FFF0F7", borderWidth: 1, borderColor: "#F5DCE9" },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  heroSub: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  badge: { borderWidth: 1, borderColor: "#EECFE0", backgroundColor: "#FFF7FC", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  switchList: { gap: 8 },
  switchRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  switchText: { color: colors.text, fontWeight: "600" },
  memberList: { gap: 8 },
  memberRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4D5E6",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { color: colors.primaryDark, fontWeight: "800" },
  memberName: { color: colors.text, fontWeight: "700" },
  memberRelation: { color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: "rgba(20,16,20,0.25)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    color: colors.text,
    marginBottom: 10
  }
});

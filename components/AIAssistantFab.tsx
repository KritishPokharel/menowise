import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

type Mode = "text" | "voice";
type ChatItem = { id: string; role: "user" | "assistant"; text: string };

export const AIAssistantFab = () => {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const displayName = profile?.fullName?.trim() || t("notAvailable");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [chat, setChat] = useState<ChatItem[]>([
    {
      id: "greet",
      role: "assistant",
      text: t("aiFabGreeting", { name: displayName })
    }
  ]);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const openPanel = () => {
    setOpen(true);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true })
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.95, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true })
    ]).start(() => setOpen(false));
  };

  const send = (value: string) => {
    if (!value.trim()) return;
    const input = value.trim();
    setChat((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: input },
      { id: `a-${Date.now() + 1}`, role: "assistant", text: `${t("assistantReplyPrefix")} ${t("aiFabActionNudge")}` }
    ]);
    setText("");
  };

  const voiceSuggestion = useMemo(
    () => `${t("aiFabVoicePrompt")} ${t("aiFabActionNudge")}`,
    [t]
  );

  return (
    <>
      <Pressable style={styles.fab} onPress={openPanel}>
        <Ionicons name="sparkles" size={22} color="#FFFFFF" />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={closePanel}>
        <Pressable style={styles.overlay} onPress={closePanel}>
          <Animated.View style={[styles.panelWrap, { opacity, transform: [{ scale }] }]}>
            <Pressable style={styles.panel} onPress={() => undefined}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>{t("aiFabTitle")}</Text>
                  <Text style={styles.subtitle}>{t("aiFabSubtitle")}</Text>
                </View>
                <Pressable onPress={closePanel}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.modeRow}>
                <Pressable style={[styles.modeChip, mode === "text" && styles.modeChipActive]} onPress={() => setMode("text")}>
                  <Text style={[styles.modeLabel, mode === "text" && styles.modeLabelActive]}>{t("aiFabModeText")}</Text>
                </Pressable>
                <Pressable style={[styles.modeChip, mode === "voice" && styles.modeChipActive]} onPress={() => setMode("voice")}>
                  <Text style={[styles.modeLabel, mode === "voice" && styles.modeLabelActive]}>{t("aiFabModeVoice")}</Text>
                </Pressable>
              </View>

              {mode === "text" ? (
                <>
                  <FlatList
                    data={chat}
                    keyExtractor={(item) => item.id}
                    style={styles.chatList}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => (
                      <View style={[styles.bubble, item.role === "assistant" ? styles.bot : styles.user]}>
                        <Text style={styles.bubbleText}>{item.text}</Text>
                      </View>
                    )}
                  />
                  <View style={styles.inputRow}>
                    <TextInput
                      value={text}
                      onChangeText={setText}
                      placeholder={t("shareFeelPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                    <Pressable style={styles.sendBtn} onPress={() => send(text)}>
                      <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.voiceWrap}>
                  <Pressable style={styles.micBtn} onPress={() => setChat((prev) => [...prev, { id: `v-${Date.now()}`, role: "assistant", text: voiceSuggestion }])}>
                    <Ionicons name="mic" size={26} color="#FFFFFF" />
                  </Pressable>
                  <Text style={styles.voiceTitle}>{t("aiFabVoiceTitle")}</Text>
                  <Text style={styles.voiceSub}>{t("aiFabVoiceSub")}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 94,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7A3B62",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 99
  },
  overlay: { flex: 1, backgroundColor: "rgba(14,10,14,0.2)", justifyContent: "flex-end" },
  panelWrap: { padding: spacing.md, paddingBottom: 90 },
  panel: {
    backgroundColor: "#FFF9FD",
    borderWidth: 1,
    borderColor: "#F1DFE8",
    borderRadius: 26,
    padding: spacing.md,
    minHeight: 420,
    maxHeight: 580
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  modeRow: { marginTop: spacing.sm, flexDirection: "row", gap: 8 },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  modeChipActive: { borderColor: colors.primaryDark, backgroundColor: "#FCE8F3" },
  modeLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  modeLabelActive: { color: colors.primaryDark },
  chatList: { marginTop: spacing.sm, flexGrow: 0, minHeight: 240, maxHeight: 320 },
  bubble: { borderRadius: 14, padding: 10, maxWidth: "92%" },
  bot: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border },
  user: { backgroundColor: "#F4D8E7", alignSelf: "flex-end" },
  bubbleText: { color: colors.text, lineHeight: 20 },
  inputRow: { marginTop: spacing.sm, flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center"
  },
  voiceWrap: {
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: 1
  },
  micBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center"
  },
  voiceTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  voiceSub: { color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg, lineHeight: 20 }
});

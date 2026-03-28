import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  text?: string;
  kind?: "greeting" | "reply";
  userText?: string;
}

export default function AssistantScreen() {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const displayName = profile?.fullName?.trim() || t("notAvailable");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      kind: "greeting"
    }
  ]);

  const submit = (value: string) => {
    if (!value.trim()) return;
    const next: Message[] = [
      ...messages,
      { id: `u-${Date.now()}`, role: "user", text: value.trim() },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        kind: "reply",
        userText: value.trim()
      }
    ];
    setMessages(next);
    setText("");
  };

  const data = useMemo(() => messages, [messages]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("ai")} subtitle={t("aiSubtitle")} />
        <AppCard style={styles.card}>
          <SectionHeader title={t("conversationTitle")} />
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === "assistant" ? styles.bot : styles.user]}>
                <Text style={styles.bubbleText}>
                  {item.role === "assistant" && item.kind === "greeting"
                    ? t("assistantGreeting", { name: displayName })
                    : item.role === "assistant" && item.kind === "reply"
                      ? `${t("assistantReplyPrefix")}\n\n${t("assistantYouSaid", { text: item.userText ?? "" })}`
                      : item.text}
                </Text>
              </View>
            )}
          />
          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("shareFeelPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Pressable onPress={() => submit(text)} style={styles.send}>
              <Text style={styles.sendText}>{t("send")}</Text>
            </Pressable>
          </View>
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md, paddingBottom: 100 },
  card: { flex: 1 },
  list: { paddingBottom: spacing.sm },
  bubble: { borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  bot: { backgroundColor: "#FFF8FC", borderWidth: 1, borderColor: colors.border },
  user: { backgroundColor: "#F9DDE9", alignSelf: "flex-end", maxWidth: "88%" },
  bubbleText: { color: colors.text, lineHeight: 20 },
  inputBar: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    color: colors.text
  },
  send: { backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", paddingHorizontal: spacing.md },
  sendText: { color: "#FFF", fontWeight: "700" }
});

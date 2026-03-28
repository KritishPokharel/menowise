import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, radius, spacing } from "@/constants/theme";
import { formatNumber } from "@/utils/formatNumber";

interface Post {
  id: string;
  author: string;
  text: string;
  likes: number;
}

export default function CommunityScreen() {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  const submit = () => {
    if (!draft.trim()) return;
    setPosts((prev) => [{ id: `${Date.now()}`, author: t("youLabel"), text: draft.trim(), likes: 0 }, ...prev]);
    setDraft("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("community")} subtitle={t("communitySubtitle")} />
        <AppCard>
          <SectionHeader title={t("shareWithCommunity")} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            placeholder={t("sharePlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable style={styles.postBtn} onPress={submit}>
            <Text style={styles.postText}>{t("post")}</Text>
          </Pressable>
        </AppCard>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListEmptyComponent={<Text style={styles.empty}>{t("noPostsYet")}</Text>}
          renderItem={({ item }) => (
            <AppCard>
              <Text style={styles.author}>{item.author}</Text>
              <Text style={styles.body}>{item.text}</Text>
              <Text style={styles.meta}>♡ {formatNumber(item.likes, i18n.language)}</Text>
            </AppCard>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#FFF9FD",
    minHeight: 92,
    padding: spacing.sm,
    color: colors.text,
    textAlignVertical: "top"
  },
  postBtn: {
    marginTop: spacing.sm,
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm
  },
  postText: { color: "#FFF", fontWeight: "700" },
  author: { color: colors.primaryDark, fontWeight: "700", marginBottom: 4 },
  body: { color: colors.text, lineHeight: 20 },
  meta: { marginTop: spacing.sm, color: colors.textMuted },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.sm, marginTop: spacing.md }
});

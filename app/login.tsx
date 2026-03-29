import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { AuthLanguageMenu } from "@/components/AuthLanguageMenu";
import { InputField } from "@/components/InputField";
import { AppCard } from "@/components/ui/AppCard";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function LoginScreen() {
  const { t } = useTranslation();
  const signIn = useAppStore((s) => s.signIn);
  const isLoading = useAppStore((s) => s.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    Keyboard.dismiss();
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      return;
    }
    const profile = useAppStore.getState().profile;
    router.replace((profile?.birthYear ? "/(tabs)/home" : "/onboarding") as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AuthLanguageMenu />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <AppCard>
            <Text style={styles.title}>{t("login")}</Text>
            <Text style={styles.subtitle}>{t("authLoginSubtitle", { defaultValue: "Welcome back. Sign in to continue." })}</Text>
            <InputField label={t("email")} value={email} onChangeText={setEmail} placeholder={t("emailPlaceholder")} />
            <InputField
              label={t("password")}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AppButton label={isLoading ? t("loading") : t("login")} onPress={onSubmit} />
            <Pressable style={styles.textLinkBtn} onPress={() => router.push("/forgot-password" as any)}>
              <Text style={styles.textLink}>{t("forgotPassword")}</Text>
            </Pressable>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t("authNoAccount", { defaultValue: "Don't have an account?" })}</Text>
              <Pressable onPress={() => router.push("/signup" as any)}>
                <Text style={styles.switchLink}>{t("signup")}</Text>
              </Pressable>
            </View>
          </AppCard>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  error: { color: "#B83D5B", marginBottom: spacing.sm },
  textLinkBtn: { alignItems: "center", marginTop: spacing.xs },
  textLink: { color: colors.primaryDark, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
  switchText: { color: colors.textMuted },
  switchLink: { color: colors.primaryDark, fontWeight: "700" }
});

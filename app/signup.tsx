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

export default function SignupScreen() {
  const { t } = useTranslation();
  const signUp = useAppStore((s) => s.signUp);
  const signIn = useAppStore((s) => s.signIn);
  const isLoading = useAppStore((s) => s.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    const result = await signUp(email.trim(), password);
    if (result.error) {
      setError(result.error);
      return;
    }

    const loginResult = await signIn(email.trim(), password);
    if (loginResult.error) {
      router.replace("/login" as any);
      return;
    }

    router.replace("/onboarding" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AuthLanguageMenu />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <AppCard>
            <Text style={styles.title}>{t("signup")}</Text>
            <Text style={styles.subtitle}>{t("authSignupSubtitle", { defaultValue: "Create your account to start tracking and support." })}</Text>
            <InputField label={t("email")} value={email} onChangeText={setEmail} placeholder={t("emailPlaceholder")} />
            <InputField
              label={t("password")}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            <InputField
              label={t("confirmPassword")}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AppButton label={isLoading ? t("loading") : t("signup")} onPress={onSubmit} />
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t("authHaveAccount", { defaultValue: "Already have an account?" })}</Text>
              <Pressable onPress={() => router.push("/login" as any)}>
                <Text style={styles.switchLink}>{t("login")}</Text>
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
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
  switchText: { color: colors.textMuted },
  switchLink: { color: colors.primaryDark, fontWeight: "700" }
});

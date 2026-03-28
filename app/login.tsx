import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableWithoutFeedback, View, Keyboard } from "react-native";
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
            <AppButton label={t("forgotPassword")} variant="secondary" onPress={() => router.push("/forgot-password" as any)} />
            <AppButton label={t("signup")} variant="secondary" onPress={() => router.push("/signup" as any)} />
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
  error: { color: "#B83D5B", marginBottom: spacing.sm }
});

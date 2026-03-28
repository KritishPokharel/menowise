import { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/AppButton";
import { AuthLanguageMenu } from "@/components/AuthLanguageMenu";
import { InputField } from "@/components/InputField";
import { AppCard } from "@/components/ui/AppCard";
import { colors, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const resetPassword = useAppStore((s) => s.resetPassword);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    Keyboard.dismiss();
    const result = await resetPassword(email.trim());
    setMessage(result.error ? result.error : t("resetEmailSent"));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AuthLanguageMenu />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <AppCard>
            <Text style={styles.title}>{t("resetPassword")}</Text>
            <InputField label={t("email")} value={email} onChangeText={setEmail} placeholder={t("emailPlaceholder")} />
            {message ? <Text style={styles.msg}>{message}</Text> : null}
            <AppButton label={t("resetPassword")} onPress={onSubmit} />
          </AppCard>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  msg: { color: colors.textMuted, marginBottom: spacing.sm }
});

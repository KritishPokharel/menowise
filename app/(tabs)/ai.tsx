import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { colors, spacing } from "@/constants/theme";

const getConversationUrl = (language: string) =>
  language === "ne"
    ? "https://inartistic-cristopher-certifiable.ngrok-free.dev/conversation/nepali"
    : "https://inartistic-cristopher-certifiable.ngrok-free.dev/conversation/english";

export default function AIScreen() {
  const { t, i18n } = useTranslation();
  const url = getConversationUrl(i18n.language);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("ai")}
          subtitle={t("aiSubtitle", { defaultValue: "Supportive, practical, concise guidance." })}
        />
        <View style={styles.card}>
          <WebView
            originWhitelist={["*"]}
            source={{ uri: url }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
                <Text style={styles.loaderText}>{t("loading", { defaultValue: "Loading..." })}</Text>
              </View>
            )}
            style={styles.webview}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  card: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFDDE6",
    backgroundColor: "#FFFFFF"
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent"
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF9FD"
  },
  loaderText: {
    color: colors.textMuted
  }
});

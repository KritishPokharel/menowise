import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { colors } from "@/constants/theme";

const ELEVENLABS_AGENT_ID = "agent_0301kmty44s1fwf9vq5b34v5sw9s";

const buildWidgetHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    />
    <style>
      :root { color-scheme: light; }
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }
      body {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
      }
      .widget-wrap {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div class="widget-wrap">
        <elevenlabs-convai agent-id="${ELEVENLABS_AGENT_ID}"></elevenlabs-convai>
    </div>
    <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
  </body>
</html>`;

export const AIAssistantFab = () => {
  useTranslation();

  const html = useMemo(
    () => buildWidgetHtml(),
    []
  );

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    right: 14,
    bottom: 112,
    width: 76,
    height: 76,
    zIndex: 99
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  }
});

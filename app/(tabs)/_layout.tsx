import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AIAssistantFab } from "@/components/AIAssistantFab";
import { colors } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function TabsLayout() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const bootstrapping = useAppStore((s) => s.isBootstrapping);

  if (bootstrapping) return null;
  if (!user) return <Redirect href="/" />;
  if (!profile?.birthYear || !profile?.lifecycleStage) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: "#A38D9E",
          tabBarStyle: {
            backgroundColor: "#FFF9FD",
            borderTopColor: colors.border,
            height: 78,
            paddingBottom: 10,
            paddingTop: 8
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600"
          }
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("home"),
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="checkin"
          options={{
            title: t("checkin"),
            tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: t("insights"),
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t("community"),
            tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="family"
          options={{
            title: t("family"),
            tabBarIcon: ({ color, size }) => <Ionicons name="people-circle-outline" color={color} size={size} />
          }}
        />
      </Tabs>
      <AIAssistantFab />
    </View>
  );
}

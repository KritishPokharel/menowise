import { Redirect } from "expo-router";
import { useAppStore } from "@/store/useAppStore";

export default function IndexScreen() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isBootstrapping = useAppStore((s) => s.isBootstrapping);

  if (isBootstrapping) return null;
  if (user && profile?.birthYear) return <Redirect href={"/(tabs)/home" as any} />;
  return <Redirect href={"/onboarding" as any} />;
}

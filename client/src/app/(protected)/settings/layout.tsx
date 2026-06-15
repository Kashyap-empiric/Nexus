import { SettingsLayout } from "@/modules/settings/components/SettingsLayout";

export default function StandaloneSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}

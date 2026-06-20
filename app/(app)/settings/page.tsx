import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/session";
import { SettingsView } from "@/components/settings/SettingsView";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <SettingsView
      base={ctx.base}
      displayName={ctx.displayName}
      canWrite={ctx.role !== "guest"}
    />
  );
}

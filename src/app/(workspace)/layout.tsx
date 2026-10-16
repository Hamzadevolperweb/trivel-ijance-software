import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  if (!hasSupabasePublicEnv()) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: notifications, count, error } = await supabase
    .from("notifications")
    .select("id,title,message,created_at", { count: "exact" })
    .or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(`Unable to load notifications: ${error.message}`);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
      <AppShell user={user} notifications={notifications ?? []} unreadNotificationCount={count ?? 0}>{children}</AppShell>
    </Suspense>
  );
}

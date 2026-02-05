import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireDashboardAccess() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "trader")) {
    redirect("/access-denied");
  }
}

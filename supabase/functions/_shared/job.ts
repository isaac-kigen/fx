import { createAdminClient } from "./supabase.ts";

export async function startJob(functionName: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("job_runs")
    .insert({ function_name: functionName })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function finishJob(params: { id: string; rows: number; credits: number; errorSummary?: string }) {
  const supabase = createAdminClient();
  await supabase.from("job_runs").update({
    finished_at: new Date().toISOString(),
    rows_processed: params.rows,
    credits_used: params.credits,
    error_summary: params.errorSummary ?? null
  }).eq("id", params.id);
}

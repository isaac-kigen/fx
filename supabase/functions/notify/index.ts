import { createAdminClient } from "../_shared/supabase.ts";
import { configureWebPush, sendResendEmail, sendTelegram, sendWebPush } from "../_shared/notify.ts";
import { startJob, finishJob } from "../_shared/job.ts";

const MAX_ATTEMPTS = 5;

Deno.serve(async () => {
  const jobId = await startJob("notify");
  let rowsProcessed = 0;

  try {
    const supabase = createAdminClient();

    const { data: events } = await supabase
      .from("notification_events")
      .select("id, event_type, payload, status")
      .in("status", ["pending", "partial"])
      .order("created_at", { ascending: true })
      .limit(20);

    if (!events || events.length === 0) {
      await finishJob({ id: jobId, rows: 0, credits: 0 });
      return new Response(JSON.stringify({ ok: true, rowsProcessed: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");
    const resendTo = Deno.env.get("RESEND_TO");

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (vapidPublic && vapidPrivate && vapidSubject) {
      configureWebPush({ publicKey: vapidPublic, privateKey: vapidPrivate, subject: vapidSubject });
    }

    for (const event of events) {
      const { data: deliveries } = await supabase
        .from("notification_deliveries")
        .select("id, channel, status, attempts")
        .eq("event_id", event.id);

      const delivered = new Set(deliveries?.filter((d) => d.status === "sent").map((d) => d.channel) ?? []);
      const channels = ["telegram", "email", "push"] as const;

      const results: Array<{ channel: string; status: "sent" | "failed"; error?: string }> = [];

      for (const channel of channels) {
        if (delivered.has(channel)) continue;
        const existing = deliveries?.find((d) => d.channel === channel);
        if (existing && existing.attempts >= MAX_ATTEMPTS) continue;

        try {
          if (channel === "telegram") {
            if (!telegramToken || !telegramChatId) throw new Error("Missing Telegram config");
            await sendTelegram({ token: telegramToken, chatId: telegramChatId, text: formatMessage(event.payload) });
          }

          if (channel === "email") {
            if (!resendKey || !resendFrom || !resendTo) throw new Error("Missing Resend config");
            await sendResendEmail({
              apiKey: resendKey,
              from: resendFrom,
              to: resendTo,
              subject: event.payload.title ?? "Trade Alert",
              html: formatEmailHtml(event.payload),
              text: formatMessage(event.payload)
            });
          }

          if (channel === "push") {
            if (!vapidPublic || !vapidPrivate || !vapidSubject) throw new Error("Missing VAPID config");
            const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
            if (subs && subs.length) {
              await Promise.all(subs.map((sub) => sendWebPush({
                subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload: {
                  title: event.payload.title,
                  body: `${event.payload.symbol} ${event.payload.side} @ ${event.payload.entry}`,
                  url: event.payload.url
                }
              })));
            }
          }

          results.push({ channel, status: "sent" });
        } catch (error) {
          results.push({ channel, status: "failed", error: (error as Error).message });
        }
      }

      for (const result of results) {
        if (result.status === "sent") {
          await supabase.from("notification_deliveries").upsert({
            event_id: event.id,
            channel: result.channel,
            status: "sent",
            attempts: (deliveries?.find((d) => d.channel === result.channel)?.attempts ?? 0) + 1,
            sent_at: new Date().toISOString(),
            last_error: null
          }, { onConflict: "event_id,channel" });
        } else {
          await supabase.from("notification_deliveries").upsert({
            event_id: event.id,
            channel: result.channel,
            status: "failed",
            attempts: (deliveries?.find((d) => d.channel === result.channel)?.attempts ?? 0) + 1,
            last_error: result.error ?? "Unknown error"
          }, { onConflict: "event_id,channel" });
        }
      }

      const updatedDeliveries = await supabase
        .from("notification_deliveries")
        .select("status")
        .eq("event_id", event.id);

      const statuses = updatedDeliveries.data?.map((d) => d.status) ?? [];
      const allSent = statuses.length > 0 && statuses.every((s) => s === "sent");
      const someSent = statuses.some((s) => s === "sent");
      const newStatus = allSent ? "sent" : someSent ? "partial" : "failed";

      await supabase.from("notification_events").update({ status: newStatus }).eq("id", event.id);
      rowsProcessed += 1;
    }

    await finishJob({ id: jobId, rows: rowsProcessed, credits: 0 });
    return new Response(JSON.stringify({ ok: true, rowsProcessed }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    await finishJob({ id: jobId, rows: rowsProcessed, credits: 0, errorSummary: (error as Error).message });
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

function formatMessage(payload: Record<string, any>) {
  return [
    payload.title,
    `Symbol: ${payload.symbol}`,
    `Side: ${payload.side}`,
    `Entry: ${payload.entry}`,
    `SL: ${payload.sl}`,
    `TP: ${payload.tp1}`,
    `RR: ${payload.rr}`,
    `Lots: ${payload.lots}`,
    `Expires: ${payload.expires_at}`,
    payload.url ? `Link: ${payload.url}` : null
  ].filter(Boolean).join("\n");
}

function formatEmailHtml(payload: Record<string, any>) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>${payload.title}</h2>
      <p><strong>Symbol:</strong> ${payload.symbol}</p>
      <p><strong>Side:</strong> ${payload.side}</p>
      <p><strong>Entry:</strong> ${payload.entry}</p>
      <p><strong>Stop:</strong> ${payload.sl}</p>
      <p><strong>TP:</strong> ${payload.tp1}</p>
      <p><strong>RR:</strong> ${payload.rr}</p>
      <p><strong>Lots:</strong> ${payload.lots}</p>
      <p><strong>Expires:</strong> ${payload.expires_at}</p>
      ${payload.url ? `<p><a href="${payload.url}">Open dashboard</a></p>` : ""}
    </div>
  `;
}

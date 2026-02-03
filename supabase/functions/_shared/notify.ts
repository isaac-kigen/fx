import webpush from "https://esm.sh/web-push@3.6.7";

export async function sendTelegram(params: { token: string; chatId: string; text: string }) {
  const url = `https://api.telegram.org/bot${params.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: params.chatId, text: params.text, disable_web_page_preview: true })
  });
  if (!res.ok) {
    throw new Error(`Telegram error: ${res.status}`);
  }
  return await res.json();
}

export async function sendResendEmail(params: { apiKey: string; from: string; to: string; subject: string; html: string; text: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text
    })
  });
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status}`);
  }
  return await res.json();
}

export function configureWebPush(vapid: { publicKey: string; privateKey: string; subject: string }) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
}

export async function sendWebPush(params: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; payload: Record<string, unknown> }) {
  return await webpush.sendNotification(params.subscription, JSON.stringify(params.payload));
}

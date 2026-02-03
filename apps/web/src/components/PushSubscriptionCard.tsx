"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscriptionCard() {
  const [status, setStatus] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    client.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubscribe = async () => {
    try {
      setStatus("Requesting permission...");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Push permission denied.");
        return;
      }

      if (!userId) {
        setStatus("Sign in to register this device.");
        return;
      }

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });

      setStatus("Registering subscription...");
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to subscribe");
      }

      setStatus("Push subscription saved.");
    } catch (error) {
      setStatus(`Subscription failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Push Notifications</h3>
      <p className="small">Register your device for web push alerts (PWA). Requires VAPID public key.</p>
      <div className="grid" style={{ gap: 10 }}>
        <div className="small">User: <span className="mono">{userId ?? "Not signed in"}</span></div>
        <button type="button" onClick={handleSubscribe}>Enable Push</button>
        <div className="small">{status}</div>
      </div>
    </div>
  );
}

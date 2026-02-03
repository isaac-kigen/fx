"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export default function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
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

  const handleSignIn = async () => {
    try {
      setStatus("Signing in...");
      const client = createSupabaseBrowserClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus("Signed in.");
    } catch (error) {
      setStatus(`Sign-in failed: ${(error as Error).message}`);
    }
  };

  const handleSignOut = async () => {
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    setStatus("Signed out.");
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Auth</h3>
      {userId ? (
        <>
          <p className="small">User: <span className="mono">{userId}</span></p>
          <button type="button" className="secondary" onClick={handleSignOut}>Sign out</button>
        </>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={handleSignIn}>Sign in</button>
        </div>
      )}
      <div className="small" style={{ marginTop: 8 }}>{status}</div>
    </div>
  );
}

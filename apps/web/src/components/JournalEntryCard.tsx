"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export default function JournalEntryCard() {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    intent_id: "",
    filled_entry: "",
    filled_stop: "",
    lots: "",
    opened_at: "",
    closed_at: "",
    result_r: "",
    pnl_amount: "",
    notes: ""
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setStatus("Saving...");
    const client = createSupabaseBrowserClient();
    const { data: session } = await client.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      setStatus("Sign in first.");
      return;
    }

    const payload = {
      user_id: userId,
      intent_id: form.intent_id,
      filled_entry: Number(form.filled_entry),
      filled_stop: Number(form.filled_stop),
      lots: Number(form.lots),
      opened_at: form.opened_at || new Date().toISOString(),
      closed_at: form.closed_at || null,
      result_r: form.result_r ? Number(form.result_r) : null,
      pnl_amount: form.pnl_amount ? Number(form.pnl_amount) : null,
      notes: form.notes || null
    };

    const { error } = await client.from("executed_trades").insert(payload);
    if (error) {
      setStatus(`Save failed: ${error.message}`);
      return;
    }
    setStatus("Saved.");
    setForm({
      intent_id: "",
      filled_entry: "",
      filled_stop: "",
      lots: "",
      opened_at: "",
      closed_at: "",
      result_r: "",
      pnl_amount: "",
      notes: ""
    });
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Trade Journal Entry</h3>
      <div className="grid" style={{ gap: 10 }}>
        <input placeholder="Intent ID (uuid)" value={form.intent_id} onChange={(e) => update("intent_id", e.target.value)} />
        <input placeholder="Filled entry" value={form.filled_entry} onChange={(e) => update("filled_entry", e.target.value)} />
        <input placeholder="Filled stop" value={form.filled_stop} onChange={(e) => update("filled_stop", e.target.value)} />
        <input placeholder="Lots" value={form.lots} onChange={(e) => update("lots", e.target.value)} />
        <input placeholder="Opened at (ISO)" value={form.opened_at} onChange={(e) => update("opened_at", e.target.value)} />
        <input placeholder="Closed at (ISO, optional)" value={form.closed_at} onChange={(e) => update("closed_at", e.target.value)} />
        <input placeholder="Result R (optional)" value={form.result_r} onChange={(e) => update("result_r", e.target.value)} />
        <input placeholder="PNL amount (optional)" value={form.pnl_amount} onChange={(e) => update("pnl_amount", e.target.value)} />
        <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        <button type="button" onClick={handleSubmit}>Save trade</button>
        <div className="small">{status}</div>
      </div>
    </div>
  );
}

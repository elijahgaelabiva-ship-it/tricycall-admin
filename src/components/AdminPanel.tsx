"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Admin = {
  user_id: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
};

const PERMS = [
  ["complaints", "Resolve complaints"],
  ["drivers", "Manage drivers"],
  ["trips_edit", "Cancel / edit trips"],
  ["subscriptions", "Subscriptions"],
  ["fares", "Fare settings"],
];

export default function AdminPanel() {
  const [isOwner, setIsOwner] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ email: "", password: "", role: "viewer" });
  const [msg, setMsg] = useState("");

  async function call(method: string, body?: object) {
    const res = await fetch("/api/admins", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function load(t: string) {
    const res = await fetch("/api/admins", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    setAdmins((await res.json()).admins ?? []);
    setIsOwner(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (!t) return;
      setToken(t);
      load(t);
    });
  }, []);

  async function add() {
    const r = await call("POST", form);
    setMsg(r.error ?? "Admin added");
    if (!r.error) setForm({ email: "", password: "", role: "viewer" });
    load(token);
  }

  async function toggle(a: Admin, key: string) {
    const next = { ...a.permissions, [key]: !a.permissions?.[key] };
    setAdmins(prev => prev.map(x => x.user_id === a.user_id ? { ...x, permissions: next } : x));
    await call("PATCH", { user_id: a.user_id, permissions: next });
  }

  if (!isOwner) return null;

  return (
    <div className="mt-8 space-y-4 text-gray-800">
      <h2 className="text-xl font-bold text-green-700 text-center">Manage Admins</h2>

      <div className="space-y-2 border rounded-xl p-3 bg-white">
        <input className="border p-2 w-full rounded" placeholder="Email"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="border p-2 w-full rounded" placeholder="Temporary password"
          type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <select className="border p-2 w-full rounded" value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="viewer">Viewer</option>
          <option value="support">Support</option>
        </select>
        <button onClick={add} className="bg-green-600 text-white px-4 py-3 rounded-xl w-full font-semibold">
          Add admin
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>

      {admins.map(a => (
        <div key={a.user_id} className="border rounded-xl p-3 bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm break-all">{a.email}</div>
            {a.role === "owner" && <span className="text-xs font-semibold">OWNER</span>}
          </div>

          {a.role !== "owner" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <select value={a.role} className="border p-1 rounded text-sm"
                  onChange={async e => { await call("PATCH", { user_id: a.user_id, role: e.target.value }); load(token); }}>
                  <option value="viewer">Viewer</option>
                  <option value="support">Support</option>
                </select>
                <button className="text-red-600 text-sm"
                  onClick={async () => { if (confirm("Remove this admin?")) { await call("DELETE", { user_id: a.user_id }); load(token); } }}>
                  Remove
                </button>
              </div>

              <div className="divide-y border rounded-lg">
                {PERMS.map(([key, label]) => (
                  <button key={key} onClick={() => toggle(a, key)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm">
                    <span>{label}</span>
                    <span className="text-lg">{a.permissions?.[key] ? "✅" : "❌"}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
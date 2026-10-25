"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Admin = {
  user_id: string;
  email: string;
  role: string;
  avatar_url?: string | null;
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
    <section className="w-full text-gray-800">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
        Manage Admins
      </h2>

      {/* Add admin */}
      <div className="bg-[color:var(--card)] border border-gray-200 rounded-2xl shadow-sm p-4 space-y-2.5 mb-3 md:max-w-xl">
        <input
          className="border border-gray-300 rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border border-gray-300 rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
          placeholder="Temporary password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-xl px-3 py-2.5 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
          value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value })}
        >
          <option value="viewer">Viewer</option>
          <option value="support">Support</option>
        </select>
        <button
          onClick={add}
          className="bg-[color:var(--brand)] text-white px-4 py-3 rounded-xl w-full font-semibold hover:bg-[color:var(--brand-dark)] transition"
        >
          Add admin
        </button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </div>

      {/* Admin list */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {admins.map(a => (
          <div
            key={a.user_id}
            className="bg-[color:var(--card)] border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              {a.avatar_url ? (
                <img
                  src={a.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-gray-100 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[color:var(--brand)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {a.email.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 break-all">{a.email}</p>
              </div>
              {a.role === "owner" && (
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-200">
                  Owner
                </span>
              )}
            </div>

            {a.role !== "owner" && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={a.role}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                    onChange={async e => {
                      await call("PATCH", { user_id: a.user_id, role: e.target.value });
                      load(token);
                    }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="support">Support</option>
                  </select>
                  <button
                    className="text-sm font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                    onClick={async () => {
                      if (confirm("Remove this admin?")) {
                        await call("DELETE", { user_id: a.user_id });
                        load(token);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {PERMS.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggle(a, key)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="text-gray-700">{label}</span>
                      <span className="text-lg">{a.permissions?.[key] ? "✅" : "❌"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

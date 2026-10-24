"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // your existing client

type Admin = { user_id: string; email: string; role: string };

export default function AdminsPage() {
  const router = useRouter();
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
    if (res.status === 403) return router.replace("/");
    setAdmins((await res.json()).admins);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (!t) return router.replace("/");
      setToken(t);
      load(t);
    });
  }, []);

  async function add() {
    const r = await call("POST", form);
    setMsg(r.error ?? "Admin added");
    setForm({ email: "", password: "", role: "viewer" });
    load(token);
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Manage Admins</h1>

      <div className="space-y-2 border rounded p-3">
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
        <button onClick={add} className="bg-black text-white px-4 py-2 rounded w-full">
          Add admin
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>

      {admins.map(a => (
        <div key={a.user_id} className="border rounded p-3 flex items-center justify-between gap-2">
          <div className="text-sm break-all">{a.email}</div>
          {a.role === "owner" ? (
            <span className="text-xs font-semibold">OWNER</span>
          ) : (
            <div className="flex gap-2">
              <select value={a.role} className="border p-1 rounded"
                onChange={async e => { await call("PATCH", { user_id: a.user_id, role: e.target.value }); load(token); }}>
                <option value="viewer">Viewer</option>
                <option value="support">Support</option>
              </select>
              <button className="text-red-600"
                onClick={async () => { if (confirm("Remove this admin?")) { await call("DELETE", { user_id: a.user_id }); load(token); } }}>
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KEYS = ["complaints", "drivers", "trips_edit", "subscriptions", "fares"];

const DEFAULTS: Record<string, Record<string, boolean>> = {
  viewer: { complaints: false, drivers: false, trips_edit: false, subscriptions: false, fares: false },
  support: { complaints: true, drivers: true, trips_edit: true, subscriptions: true, fares: false },
};

async function requireOwner(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.from("admin_roles")
    .select("role").eq("user_id", user.id).single();
  return data?.role === "owner" ? user : null;
}

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await admin.from("admin_roles").select("*").order("created_at");
  return NextResponse.json({ admins: data });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email, password, role } = await req.json();
  if (!DEFAULTS[role]) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, role: "admin" });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "Profile: " + pErr.message }, { status: 400 });
  }
  await admin.from("admin_roles").insert({
    user_id: data.user.id, email, role, permissions: DEFAULTS[role],
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user_id, role, permissions } = await req.json();
  if (user_id === owner.id)
    return NextResponse.json({ error: "Not allowed" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (role) {
    if (!DEFAULTS[role]) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    update.role = role;
    update.permissions = DEFAULTS[role];
  }
  if (permissions) {
    const clean: Record<string, boolean> = {};
    for (const k of KEYS) clean[k] = permissions[k] === true;
    update.permissions = clean;
  }
  await admin.from("admin_roles").update(update).eq("user_id", user_id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user_id } = await req.json();
  if (user_id === owner.id)
    return NextResponse.json({ error: "Can't remove yourself" }, { status: 400 });
  await admin.auth.admin.deleteUser(user_id);
  return NextResponse.json({ ok: true });
}

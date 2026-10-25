import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await admin
    .from("admin_roles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    role: data?.role ?? null,
    permissions: data?.permissions ?? {},
    avatar_url: data?.avatar_url ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { avatar_url } = await req.json();
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
  if (typeof avatar_url !== "string" || !avatar_url.startsWith(prefix))
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });

  await admin.from("admin_roles").update({ avatar_url }).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

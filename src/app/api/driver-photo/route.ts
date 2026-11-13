import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Owners, or admins who have the "drivers" permission, may review photos.
async function requireDriverManager(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin
    .from("admin_roles")
    .select("role, permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  const ok = data.role === "owner" || data.permissions?.drivers === true;
  return ok ? user : null;
}

export async function POST(req: NextRequest) {
  const reviewer = await requireDriverManager(req);
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driver_id, action } = await req.json();
  if (typeof driver_id !== "string" || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles")
    .select("pending_avatar_at")
    .eq("id", driver_id)
    .maybeSingle();
  if (!profile?.pending_avatar_at)
    return NextResponse.json({ error: "No photo is waiting for this driver" }, { status: 400 });

  const pendingPath = `${driver_id}/pending.jpg`;
  const livePath = `${driver_id}/avatar.jpg`;

  if (action === "approve") {
    // The file is read from storage by path (the stored value is never trusted
    // as a URL), then saved over the live photo.
    const { data: file, error: dlError } = await admin.storage.from("avatars").download(pendingPath);
    if (dlError || !file)
      return NextResponse.json({ error: "The new photo file could not be found" }, { status: 404 });

    const { error: upError } = await admin.storage
      .from("avatars")
      .upload(livePath, file, { upsert: true, contentType: "image/jpeg" });
    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 });

    const { data: pub } = admin.storage.from("avatars").getPublicUrl(livePath);
    const { error: updError } = await admin
      .from("profiles")
      .update({ avatar_url: `${pub.publicUrl}?v=${Date.now()}`, pending_avatar_at: null })
      .eq("id", driver_id);
    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });
  } else {
    const { error: updError } = await admin
      .from("profiles")
      .update({ pending_avatar_at: null })
      .eq("id", driver_id);
    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });
  }

  await admin.storage.from("avatars").remove([pendingPath]);
  return NextResponse.json({ ok: true });
}

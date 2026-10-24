export async function GET(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await admin.from("admin_roles")
    .select("*").order("created_at");
  return NextResponse.json({ admins: data });
}

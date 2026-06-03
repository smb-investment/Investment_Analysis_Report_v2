import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("html_path")
    .eq("id", params.id)
    .maybeSingle();

  if (!proposal?.html_path) return new NextResponse("Not found", { status: 404 });

  const { data, error: dlErr } = await supabase.storage
    .from("proposals-html")
    .download(proposal.html_path);

  if (dlErr || !data) return new NextResponse("File not found", { status: 404 });

  const html = await data.text();
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

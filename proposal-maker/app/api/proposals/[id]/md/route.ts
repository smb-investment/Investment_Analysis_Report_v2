import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("md_path, company_name")
    .eq("id", params.id)
    .maybeSingle();

  if (!proposal?.md_path) return new NextResponse("Not found", { status: 404 });

  const { data, error: dlErr } = await supabase.storage
    .from("proposals-md")
    .download(proposal.md_path);

  if (dlErr || !data) return new NextResponse("File not found", { status: 404 });

  const text = await data.text();
  const fileName = `${proposal.company_name}_투자요청서.md`;
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

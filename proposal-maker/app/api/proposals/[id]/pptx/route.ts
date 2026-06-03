import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("pptx_path, company_name")
    .eq("id", params.id)
    .maybeSingle();

  if (!proposal?.pptx_path) return new NextResponse("Not found", { status: 404 });

  const { data, error: dlErr } = await supabase.storage
    .from("proposals-pptx")
    .download(proposal.pptx_path);

  if (dlErr || !data) return new NextResponse("File not found", { status: 404 });

  const fileName = `${proposal.company_name}_투자요청서.pptx`;
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

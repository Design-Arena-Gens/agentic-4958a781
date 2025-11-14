import { NextRequest } from "next/server";
import { getWikiSummary } from "@/lib/tools";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const reply = await getWikiSummary(q);
  return Response.json({ reply });
}

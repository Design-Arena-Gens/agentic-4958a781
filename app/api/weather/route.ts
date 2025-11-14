import { NextRequest } from "next/server";
import { getWeatherForCity } from "@/lib/tools";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const reply = await getWeatherForCity(city);
  return Response.json({ reply });
}

import { getMatches } from "@/lib/supabase/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getMatches();
  return Response.json({ data });
}

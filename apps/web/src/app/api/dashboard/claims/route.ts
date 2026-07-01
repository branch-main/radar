import { getClaims } from "@/lib/supabase/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getClaims();
  return Response.json({ data });
}

import { getNotifications } from "@/lib/supabase/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getNotifications();
  return Response.json({ data });
}

import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sidebarUser = {
    email: user?.email ?? "",
    name:
      user?.user_metadata?.full_name ??
      user?.user_metadata?.name ??
      user?.email ??
      "Usuario",
    avatarUrl: user?.user_metadata?.avatar_url,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

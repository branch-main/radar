import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { DashboardQueryProvider } from "@/app/dashboard/_components/dashboard-query-provider";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
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
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar user={sidebarUser} />
      <SidebarInset className="min-h-svh">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-[#dae9eb] px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            Panel de control
          </span>
        </header>
        <div className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
          <DashboardQueryProvider>{children}</DashboardQueryProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

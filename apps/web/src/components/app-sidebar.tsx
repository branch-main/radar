"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Building2,
  LayoutDashboard,
  LogOut,
  Package,
  PackageCheck,
  Radar,
  Search,
  Settings,
  Wrench,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = { title: string; href: string; icon: React.ComponentType };

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "General",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Mantenimiento",
    items: [
      { title: "Incidencias", href: "/dashboard/mantenimiento", icon: AlertTriangle },
      { title: "Técnicos", href: "/dashboard/mantenimiento/tecnicos", icon: Wrench },
      { title: "Edificios", href: "/dashboard/mantenimiento/edificios", icon: Building2 },
    ],
  },
  {
    label: "Objetos Perdidos",
    items: [
      { title: "Catálogo", href: "/dashboard/objetos-perdidos", icon: Package },
      { title: "Matches", href: "/dashboard/objetos-perdidos/matches", icon: Search },
      { title: "Entregas", href: "/dashboard/objetos-perdidos/entregas", icon: PackageCheck },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
      { title: "Configuración", href: "/dashboard/configuracion", icon: Settings },
    ],
  },
];

export function AppSidebar({
  user,
}: {
  user: { email: string; name: string; avatarUrl?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 pt-3 pb-1">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Radar className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-[0.15em] uppercase">Radar</span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[11px] font-medium tracking-wider text-muted-foreground/60 uppercase">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar size="sm">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

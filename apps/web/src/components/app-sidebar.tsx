"use client";

import { Fragment } from "react";
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
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
  const { isMobile, setOpen, state } = useSidebar();

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

  const activeHref = navSections
    .flatMap((section) => section.items)
    .map((item) => item.href)
    .filter((href) => {
      if (pathname === href) return true;
      if (href === "/dashboard") return false;

      return pathname.startsWith(`${href}/`);
    })
    .sort((a, b) => b.length - a.length)[0];

  function isActive(href: string) {
    return activeHref === href;
  }

  function expandCollapsedSidebar(event: React.MouseEvent<HTMLDivElement>) {
    if (isMobile || state !== "collapsed" || event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(
        "a, button, input, textarea, select, [role='button'], [role='menuitem']",
      )
    ) {
      return;
    }

    setOpen(true);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className="group-data-[collapsible=icon]:cursor-e-resize group-data-[collapsible=icon]:p-1.5"
        onClick={expandCollapsedSidebar}
      >
        <div className="flex items-center gap-2.5 px-2 pt-3 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
          >
            <Radar className="size-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold tracking-[0.15em] uppercase group-data-[collapsible=icon]:hidden">
              Radar
            </span>
          </Link>
          <SidebarTrigger className="ml-auto size-9! p-2! text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent
        className="pt-2 md:pt-1 group-data-[collapsible=icon]:cursor-e-resize group-data-[collapsible=icon]:pt-2"
        onClick={expandCollapsedSidebar}
      >
        {navSections.map((section, index) => (
          <Fragment key={section.label}>
            {index > 0 && (
              <div
                aria-hidden="true"
                className="mx-1.5 hidden h-px shrink-0 bg-[#e7f0f2] group-data-[collapsible=icon]:block"
              />
            )}
            <SidebarGroup>
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
          </Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter
        className="group-data-[collapsible=icon]:cursor-e-resize group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-1.5"
        onClick={expandCollapsedSidebar}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:hover:bg-transparent! group-data-[collapsible=icon]:hover:text-sidebar-foreground!"
                  />
                }
              >
                <Avatar className="size-9">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
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
      <SidebarRail className="sm:hidden md:flex" />
    </Sidebar>
  );
}

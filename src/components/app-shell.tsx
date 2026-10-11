import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, LogOut, Menu, ShieldCheck, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand";
import { useAuth, useSignOut } from "@/hooks/use-auth";

/** Dashboard layout: sidebar on desktop, slide-out menu on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const signOut = useSignOut();

  const nav = (
    <nav className="flex flex-col gap-1">
      <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
      <NavItem to="/elections" icon={<ListChecks />} label="All elections" />
      <NavItem to="/results" icon={<BarChart3 />} label="Results" />
      {me?.isAdmin && <NavItem to="/admin" icon={<ShieldCheck />} label="Admin" />}
    </nav>
  );
  const account = (
    <div className="rounded-xl border bg-card p-3">
      <p className="truncate text-sm font-semibold">{me?.profile?.full_name ?? "…"}</p>
      <p className="truncate text-xs text-muted-foreground">{me?.profile?.student_id}</p>
      <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
        <LogOut /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r bg-sidebar p-5 lg:flex">
        <div className="space-y-8"><Logo />{nav}</div>
        {account}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:hidden">
          <Logo />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col justify-between bg-sidebar p-5">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="space-y-8 pt-6">{nav}</div>
              {account}
            </SheetContent>
          </Sheet>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: "/dashboard" | "/elections" | "/results" | "/admin"; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent [&_svg]:h-4 [&_svg]:w-4"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
    >
      {icon}
      {label}
    </Link>
  );
}

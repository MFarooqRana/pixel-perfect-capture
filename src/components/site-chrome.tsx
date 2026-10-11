import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";

/** Public header: the right side follows the session (Sign in vs Dashboard). */
export function SiteHeader() {
  const { me } = useAuth();
  const links = (
    <>
      <Link to="/elections" className="text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Elections</Link>
      <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>How it works</Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">{links}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {me ? (
            <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
              <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-6 pt-12">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {links}
            {me ? (
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <Button asChild><Link to="/auth">Sign in</Link></Button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            An online voting system for electing class representatives, society presidents and student leaders.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Project</p>
          <p className="mt-2 text-muted-foreground">University semester project — Web Engineering.</p>
          <p className="text-muted-foreground">Built with React, TypeScript & Tailwind CSS.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
            <Link to="/elections" className="hover:text-foreground">Elections</Link>
            <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
            <Link to="/auth" className="hover:text-foreground">Student sign in</Link>
          </div>
        </div>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} CampusVote</p>
    </footer>
  );
}

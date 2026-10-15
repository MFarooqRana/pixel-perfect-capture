import { Link } from "@tanstack/react-router";
import { Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/elections";
import { initials } from "@/lib/elections";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display font-bold text-lg text-primary", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow-card">
        <Vote className="h-5 w-5" />
      </span>
      <span>Campus<span className="text-violet">Vote</span></span>
    </Link>
  );
}

const statusStyles: Record<DisplayStatus, string> = {
  active: "bg-success-soft text-success",
  upcoming: "bg-warning-soft text-warning",
  completed: "bg-secondary text-muted-foreground",
  draft: "bg-violet-soft text-accent-foreground",
};
const statusLabels: Record<DisplayStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
  draft: "Draft",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}

export function CandidateAvatar({ name, photo, size = "md" }: { name: string; photo?: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  if (photo) return <img src={photo} alt={name} className={cn("rounded-full object-cover", cls)} loading="lazy" />;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-brand-gradient font-display font-bold text-primary-foreground", cls)}>
      {initials(name)}
    </span>
  );
}

export function EmptyState({ title, description, children }: { title: string; description?: string | undefined; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/50 p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

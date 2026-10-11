import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/brand";
import { formatDateTime, getDisplayStatus, resultsVisible, type Election } from "@/lib/elections";

/** Card summarising one election. `voted` shows the "You voted" indicator. */
export function ElectionCard({ election, voted, signedIn = true }: { election: Election; voted?: boolean; signedIn?: boolean }) {
  const status = getDisplayStatus(election);
  return (
    <article className="group flex flex-col rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={status} />
        {voted && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> You voted
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-violet">{election.position}</p>
      <h3 className="mt-1 text-lg font-semibold leading-snug">{election.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{election.description}</p>
      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Starts {formatDateTime(election.start_at)}</p>
        <p className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Ends {formatDateTime(election.end_at)}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 pt-2">
        {signedIn ? (
          <Button asChild size="sm" variant={status === "active" && !voted ? "default" : "outline"}>
            <Link to="/election/$id" params={{ id: election.id }}>
              {status === "active" && !voted ? "Vote now" : "View details"} <ArrowRight />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline"><Link to="/auth">Sign in to vote</Link></Button>
        )}
        {resultsVisible(election) && (
          <Button asChild size="sm" variant="soft">
            <Link to="/results/$id" params={{ id: election.id }}>Results</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

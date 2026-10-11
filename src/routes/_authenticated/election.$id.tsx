import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Loader2, ArrowLeft, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CandidateAvatar, EmptyState, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { formatDateTime, getDisplayStatus, resultsVisible } from "@/lib/elections";

export const Route = createFileRoute("/_authenticated/election/$id")({
  head: () => ({
    meta: [
      { title: "Election details — CampusVote" },
      { name: "description", content: "Meet the candidates and cast your vote." },
      { property: "og:title", content: "Election details — CampusVote" },
      { property: "og:description", content: "Meet the candidates and cast your vote." },
    ],
  }),
  component: ElectionDetail,
});

function ElectionDetail() {
  const { id } = Route.useParams();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["election", id],
    queryFn: async () => {
      const [e, c, r] = await Promise.all([
        supabase.from("elections").select("*").eq("id", id).maybeSingle(),
        supabase.from("candidates").select("*").eq("election_id", id).order("full_name"),
        supabase.from("vote_receipts").select("id").eq("election_id", id).maybeSingle(),
      ]);
      if (e.error) throw e.error;
      return { election: e.data, candidates: c.data ?? [], hasVoted: !!r.data };
    },
  });

  // Submit through the cast_vote database function, which re-validates
  // eligibility, dates, candidate and the one-vote rule inside a transaction.
  async function castVote() {
    if (!selected) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("cast_vote", { _election_id: id, _candidate_id: selected });
    setSubmitting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message || "Your vote could not be recorded.");
    } else {
      toast.success("Your vote has been recorded. Thank you for voting!");
      qc.invalidateQueries({ queryKey: ["election", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }

  if (isLoading) return <AppShell><Skeleton className="h-40 rounded-2xl" /><Skeleton className="mt-6 h-64 rounded-2xl" /></AppShell>;
  if (error || !data?.election)
    return <AppShell><EmptyState title="Election not found" description="It may have been removed or isn't published yet."><Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button></EmptyState></AppShell>;

  const { election, candidates, hasVoted } = data;
  const status = getDisplayStatus(election);
  const canVote = status === "active" && !hasVoted && !!me?.isEligible;
  const chosen = candidates.find((c) => c.id === selected);

  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="mt-4 rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={status} /><span className="text-xs font-semibold uppercase tracking-wider text-violet">{election.position}</span></div>
        <h1 className="mt-3 text-3xl font-bold">{election.title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{election.description}</p>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4" /> {formatDateTime(election.start_at)} — {formatDateTime(election.end_at)}</p>
        {resultsVisible(election) && <Button asChild variant="soft" size="sm" className="mt-4"><Link to="/results/$id" params={{ id }}>View results</Link></Button>}
      </div>

      {hasVoted && (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-5 w-5" /> You have already voted in this election. Your choice is secret and cannot be changed.
        </div>
      )}
      {!hasVoted && status === "active" && me && !me.isEligible && (
        <p className="mt-6 rounded-xl bg-warning-soft p-4 text-sm">Your account isn't approved to vote yet. Please contact the election office.</p>
      )}
      {status === "upcoming" && <p className="mt-6 rounded-xl bg-warning-soft p-4 text-sm">Voting opens {formatDateTime(election.start_at)}.</p>}

      <h2 className="mt-10 text-xl font-semibold">Candidates</h2>
      {candidates.length === 0 ? (
        <div className="mt-4"><EmptyState title="No candidates yet" /></div>
      ) : (
        <div role="radiogroup" aria-label="Candidates" className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((c) => {
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!canVote}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex flex-col rounded-2xl border-2 bg-card p-6 text-left shadow-card transition enabled:hover:border-violet/50 disabled:cursor-default",
                  active ? "border-violet ring-4 ring-violet/15" : "border-transparent",
                )}
              >
                <div className="flex items-center gap-4">
                  <CandidateAvatar name={c.full_name} photo={c.photo_url} size="lg" />
                  <div>
                    <p className="font-display font-semibold">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.department}</p>
                    <p className="text-xs font-medium text-violet">{c.position}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{c.manifesto}</p>
                {active && <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet"><CheckCircle2 className="h-4 w-4" /> Selected</p>}
              </button>
            );
          })}
        </div>
      )}

      {canVote && (
        <div className="sticky bottom-4 mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-elevated sm:flex-row">
          <p className="text-sm">{chosen ? <>Your selection: <strong>{chosen.full_name}</strong></> : "Select a candidate to continue."}</p>
          <Button variant="hero" disabled={!chosen} onClick={() => setConfirmOpen(true)}>Review & submit vote</Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
            <AlertDialogDescription>
              You are voting for <strong>{chosen?.full_name}</strong> in “{election.title}”. Votes are final and cannot be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); castVote(); }} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />} Cast my vote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

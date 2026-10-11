import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CandidateAvatar, EmptyState } from "@/components/brand";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { percentOf } from "@/lib/elections";

export const Route = createFileRoute("/results/$id")({
  head: () => ({
    meta: [
      { title: "Election Result — CampusVote" },
      { name: "description", content: "Vote counts and percentages for a campus election." },
      { property: "og:title", content: "Election Result — CampusVote" },
      { property: "og:description", content: "Vote counts and percentages for a campus election." },
    ],
  }),
  component: ResultDetail,
});

function ResultDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["results", id],
    queryFn: async () => {
      const [e, r] = await Promise.all([
        supabase.from("elections").select("title, position").eq("id", id).maybeSingle(),
        // get_results returns aggregated totals only and refuses if results aren't public.
        supabase.rpc("get_results", { _election_id: id }),
      ]);
      if (r.error) throw r.error;
      return { election: e.data, rows: r.data ?? [] };
    },
    retry: false,
  });

  const total = data?.rows.reduce((s, r) => s + Number(r.votes), 0) ?? 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 py-14">
        <Link to="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All results</Link>
        {isLoading && <Skeleton className="mt-6 h-64 rounded-2xl" />}
        {error && <div className="mt-6"><EmptyState title="Results not available" description={error.message} /></div>}
        {data && (
          <>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-violet">{data.election?.position}</p>
            <h1 className="mt-1 text-3xl font-bold">{data.election?.title}</h1>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Total votes cast" value={total.toLocaleString()} />
              <Stat label="Candidates" value={String(data.rows.length)} />
            </div>
            <div className="mt-8 space-y-4">
              {data.rows.map((r, i) => {
                const pct = percentOf(Number(r.votes), total);
                return (
                  <div key={r.candidate_id} className="rounded-2xl border bg-card p-5 shadow-card">
                    <div className="flex items-center gap-4">
                      <CandidateAvatar name={r.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-semibold">{r.full_name}{i === 0 && total > 0 && <Trophy className="h-4 w-4 text-warning" aria-label="Leading" />}</p>
                        <p className="text-xs text-muted-foreground">{r.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-primary">{pct}%</p>
                        <p className="text-xs text-muted-foreground">{Number(r.votes).toLocaleString()} votes</p>
                      </div>
                    </div>
                    <Progress value={pct} className="mt-4 h-2.5" aria-label={`${r.full_name} ${pct}%`} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

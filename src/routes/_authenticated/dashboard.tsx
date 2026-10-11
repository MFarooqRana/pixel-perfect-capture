import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ElectionCard } from "@/components/election-card";
import { EmptyState } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getDisplayStatus, type Election } from "@/lib/elections";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CampusVote" },
      { name: "description", content: "Your elections and voting status." },
      { property: "og:title", content: "Dashboard — CampusVote" },
      { property: "og:description", content: "Your elections and voting status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { me } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [el, rc] = await Promise.all([
        supabase.from("elections").select("*").neq("status", "draft").order("end_at"),
        supabase.from("vote_receipts").select("election_id"), // RLS returns only my own receipts
      ]);
      if (el.error) throw el.error;
      return { elections: el.data, voted: new Set((rc.data ?? []).map((r) => r.election_id)) };
    },
  });

  const groups: Record<"active" | "upcoming" | "completed", Election[]> = { active: [], upcoming: [], completed: [] };
  data?.elections.forEach((e) => {
    const s = getDisplayStatus(e);
    if (s !== "draft") groups[s].push(e);
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Welcome{me?.profile ? `, ${me.profile.full_name.split(" ")[0]}` : ""} 👋</h1>
      <p className="mt-1 text-muted-foreground">Here are the elections you can take part in.</p>

      {me && !me.isEligible && (
        <div role="status" className="mt-6 flex gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p>Your account is waiting for approval by the election office. You can browse elections, but voting unlocks once you're marked eligible.</p>
        </div>
      )}

      {error && <p className="mt-6 text-destructive">Couldn't load elections. Please refresh.</p>}
      {isLoading && <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>}

      {data && (["active", "upcoming", "completed"] as const).map((k) => (
        <section key={k} className="mt-10">
          <h2 className="text-xl font-semibold capitalize">{k} elections <span className="text-muted-foreground">({groups[k].length})</span></h2>
          {groups[k].length === 0 ? (
            <div className="mt-4"><EmptyState title={`No ${k} elections`} /></div>
          ) : (
            <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {groups[k].map((e) => <ElectionCard key={e.id} election={e} voted={data.voted.has(e.id)} />)}
            </div>
          )}
        </section>
      ))}
    </AppShell>
  );
}

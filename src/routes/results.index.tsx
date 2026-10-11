import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { EmptyState } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/elections";

export const Route = createFileRoute("/results/")({
  head: () => ({
    meta: [
      { title: "Election Results — CampusVote" },
      { name: "description", content: "Published results of completed campus elections." },
      { property: "og:title", content: "Election Results — CampusVote" },
      { property: "og:description", content: "Published results of completed campus elections." },
    ],
  }),
  component: ResultsList,
});

function ResultsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["results-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("elections").select("*").or("results_published.eq.true,status.eq.closed").order("end_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">Results</h1>
        <p className="mt-2 text-muted-foreground">Totals only — individual choices are never shown.</p>
        <div className="mt-8 space-y-3">
          {isLoading && <Skeleton className="h-20 rounded-2xl" />}
          {data?.length === 0 && <EmptyState title="No results published yet" />}
          {data?.map((e) => (
            <Link key={e.id} to="/results/$id" params={{ id: e.id }} className="flex items-center justify-between rounded-2xl border bg-card p-5 shadow-card transition hover:shadow-elevated">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">Ended {formatDateTime(e.end_at)}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-violet" />
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ElectionCard } from "@/components/election-card";
import { EmptyState } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/elections")({
  head: () => ({
    meta: [
      { title: "Elections — CampusVote" },
      { name: "description", content: "Browse active, upcoming and completed student elections." },
      { property: "og:title", content: "Elections — CampusVote" },
      { property: "og:description", content: "Browse active, upcoming and completed student elections." },
    ],
  }),
  component: ElectionsPage,
});

function ElectionsPage() {
  const { me } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["elections", "public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("elections").select("*").neq("status", "draft").order("start_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">Elections</h1>
        <p className="mt-2 text-muted-foreground">Every election on campus, in one place.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          {error && <p className="text-destructive">Couldn't load elections. Please refresh.</p>}
          {data?.map((e) => <ElectionCard key={e.id} election={e} signedIn={!!me} />)}
        </div>
        {data && data.length === 0 && <EmptyState title="No elections yet" description="Check back soon." />}
      </section>
      <SiteFooter />
    </div>
  );
}

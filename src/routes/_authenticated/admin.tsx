import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CandidateAvatar, EmptyState, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getDisplayStatus, toLocalInput, type Election } from "@/lib/elections";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — CampusVote" },
      { name: "description", content: "Manage elections, candidates and eligible students." },
      { property: "og:title", content: "Admin — CampusVote" },
      { property: "og:description", content: "Manage elections, candidates and eligible students." },
    ],
  }),
  component: AdminPage,
});

/*
 * Admin dashboard. Hiding this page is only UI convenience — every write below
 * is checked again by database policies that require the 'admin' role.
 */
function AdminPage() {
  const { me, loading } = useAuth();
  if (loading) return <AppShell><Skeleton className="h-64" /></AppShell>;
  if (!me?.isAdmin) return <AppShell><EmptyState title="Administrators only" description="Your account does not have admin permissions." /></AppShell>;
  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <p className="mt-1 text-muted-foreground">Run elections, manage candidates and approve voters.</p>
      <Tabs defaultValue="elections" className="mt-6">
        <TabsList><TabsTrigger value="elections">Elections</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList>
        <TabsContent value="elections"><ElectionsAdmin /></TabsContent>
        <TabsContent value="students"><StudentsAdmin /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

const electionSchema = z.object({
  title: z.string().trim().min(3, "Title too short").max(150),
  position: z.string().trim().min(2, "Position required").max(100),
  description: z.string().trim().max(2000),
  start_at: z.string().min(1, "Start required"),
  end_at: z.string().min(1, "End required"),
}).refine((v) => new Date(v.end_at) > new Date(v.start_at), { message: "End must be after start", path: ["end_at"] });

function ElectionsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Election> | null>(null);
  const [managing, setManaging] = useState<Election | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "elections"],
    queryFn: async () => {
      const [e, s] = await Promise.all([
        supabase.from("elections").select("*").order("start_at", { ascending: false }),
        supabase.rpc("admin_stats"),
      ]);
      if (e.error) throw e.error;
      const stats = new Map((s.data ?? []).map((r) => [r.election_id, r]));
      return { elections: e.data, stats };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };

  async function update(id: string, patch: Partial<Election>, msg: string) {
    const { error } = await supabase.from("elections").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this election and all its votes?")) return;
    const { error } = await supabase.from("elections").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Election deleted"); refresh(); }
  }

  const totalVotes = [...(data?.stats.values() ?? [])].reduce((s, r) => s + Number(r.votes_cast), 0);
  const eligible = Number([...(data?.stats.values() ?? [])][0]?.eligible ?? 0);

  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Elections" value={data?.elections.length ?? 0} />
        <Stat label="Votes cast (all)" value={totalVotes} />
        <Stat label="Eligible students" value={eligible} />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setEditing({})}><Plus /> New election</Button>
      </div>
      {isLoading && <Skeleton className="h-40" />}
      {data?.elections.length === 0 && <EmptyState title="No elections" description="Create your first election." />}
      <div className="space-y-4">
        {data?.elections.map((e) => {
          const st = data.stats.get(e.id);
          const votes = Number(st?.votes_cast ?? 0);
          const turnout = eligible ? Math.round((votes / eligible) * 100) : 0;
          return (
            <div key={e.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><StatusBadge status={getDisplayStatus(e)} /><span className="text-xs text-muted-foreground">DB status: {e.status}</span></div>
                  <h3 className="mt-2 font-semibold">{e.title}</h3>
                  <p className="text-xs text-muted-foreground">{votes} votes · {turnout}% turnout</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setManaging(e)}><Users /> Candidates</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(e)}><Pencil /> Edit</Button>
                  {e.status !== "open" && <Button size="sm" variant="violet" onClick={() => update(e.id, { status: "open" }, "Election opened")}>Open</Button>}
                  {e.status === "open" && <Button size="sm" variant="secondary" onClick={() => update(e.id, { status: "closed" }, "Election closed")}>Close</Button>}
                  <label className="flex items-center gap-2 rounded-lg border px-3 text-xs">
                    <Switch checked={e.results_published} onCheckedChange={(v) => update(e.id, { results_published: v }, v ? "Results published" : "Results hidden")} aria-label="Publish results" />
                    Publish results
                  </label>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(e.id)}><Trash2 /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <ElectionDialog initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {managing && <CandidatesDialog election={managing} onClose={() => setManaging(null)} />}
    </div>
  );
}

function ElectionDialog({ initial, onClose, onSaved }: { initial: Partial<Election>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "",
    position: initial.position ?? "",
    description: initial.description ?? "",
    start_at: initial.start_at ? toLocalInput(initial.start_at) : "",
    end_at: initial.end_at ? toLocalInput(initial.end_at) : "",
  });
  const [err, setErr] = useState<Errs>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const p = electionSchema.safeParse(f);
    if (!p.success) { setErr(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setSaving(true);
    const row = { ...p.data, start_at: new Date(f.start_at).toISOString(), end_at: new Date(f.end_at).toISOString() };
    const { error } = initial.id
      ? await supabase.from("elections").update(row).eq("id", initial.id)
      : await supabase.from("elections").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial.id ? "Election updated" : "Election created as draft");
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial.id ? "Edit election" : "New election"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <F label="Title" error={err.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></F>
          <F label="Position" error={err.position}><Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></F>
          <F label="Description" error={err.description}><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Starts" error={err.start_at}><Input type="datetime-local" value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} /></F>
            <F label="Ends" error={err.end_at}><Input type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} /></F>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const candidateSchema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(100),
  department: z.string().trim().max(100),
  manifesto: z.string().trim().max(2000),
  photo_url: z.string().trim().url("Must be a valid URL").or(z.literal("")),
});

function CandidatesDialog({ election, onClose }: { election: Election; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ["admin", "candidates", election.id];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("candidates").select("*").eq("election_id", election.id).order("full_name")).data ?? [],
  });
  const [f, setF] = useState({ full_name: "", department: "", manifesto: "", photo_url: "" });
  const [err, setErr] = useState<Errs>({});

  async function add() {
    const p = candidateSchema.safeParse(f);
    if (!p.success) { setErr(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErr({});
    const { error } = await supabase.from("candidates").insert({ ...p.data, photo_url: p.data.photo_url || null, position: election.position, election_id: election.id });
    if (error) return toast.error(error.message);
    toast.success("Candidate added");
    setF({ full_name: "", department: "", manifesto: "", photo_url: "" });
    qc.invalidateQueries({ queryKey: key });
  }
  async function del(id: string) {
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: key });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Candidates — {election.title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {data?.length === 0 && <p className="text-sm text-muted-foreground">No candidates yet.</p>}
          {data?.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
              <CandidateAvatar name={c.full_name} photo={c.photo_url} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.full_name}</p><p className="truncate text-xs text-muted-foreground">{c.department}</p></div>
              <Button size="icon" variant="ghost" aria-label={`Remove ${c.full_name}`} onClick={() => del(c.id)}><Trash2 /></Button>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">Add candidate</p>
          <F label="Full name" error={err.full_name}><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></F>
          <F label="Department" error={err.department}><Input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></F>
          <F label="Photo URL (optional)" error={err.photo_url}><Input value={f.photo_url} onChange={(e) => setF({ ...f, photo_url: e.target.value })} /></F>
          <F label="Manifesto" error={err.manifesto}><Textarea value={f.manifesto} onChange={(e) => setF({ ...f, manifesto: e.target.value })} /></F>
          <Button onClick={add}><Plus /> Add candidate</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const [p, e] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("eligible_voters").select("user_id"),
      ]);
      if (p.error) throw p.error;
      return { profiles: p.data, eligible: new Set((e.data ?? []).map((r) => r.user_id)) };
    },
  });
  async function toggle(id: string, on: boolean) {
    const { error } = on
      ? await supabase.from("eligible_voters").insert({ user_id: id })
      : await supabase.from("eligible_voters").delete().eq("user_id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  const rows = data?.profiles.filter((p) => `${p.full_name} ${p.email} ${p.student_id}`.toLowerCase().includes(q.toLowerCase())) ?? [];
  return (
    <div className="mt-4 space-y-4">
      <Input placeholder="Search by name, email or student ID" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" aria-label="Search students" />
      {isLoading && <Skeleton className="h-40" />}
      {data && rows.length === 0 && <EmptyState title="No students found" />}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 border-b p-4 last:border-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.student_id} · {p.email}</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              Eligible
              <Switch checked={data!.eligible.has(p.id)} onCheckedChange={(v) => toggle(p.id, v)} aria-label={`Eligible: ${p.full_name}`} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-card"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold text-primary">{value}</p></div>;
}
function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

type Errs = { [K in "title" | "position" | "description" | "start_at" | "end_at" | "full_name" | "department" | "manifesto" | "photo_url"]?: string };

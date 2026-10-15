import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s.mode === "signup" ? ("signup" as const) : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — CampusVote" },
      { name: "description", content: "Sign in or register your student account to vote." },
      { property: "og:title", content: "Sign in — CampusVote" },
      { property: "og:description", content: "Sign in or register your student account to vote." },
    ],
  }),
  component: AuthPage,
});

// Client-side validation (the database re-checks the same rules).
const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  studentId: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, "Student ID: 3–20 letters, numbers or dashes"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
const signInSchema = signUpSchema.pick({ email: true, password: true });

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode === "signup" ? "signup" : "signin");
  const [form, setForm] = useState({ fullName: "", studentId: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errs>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = (mode === "signup" ? signUpSchema : signInSchema).safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: form.fullName.trim(), student_id: form.studentId.trim().toUpperCase() },
          },
        });
        if (error) throw error;
        setSentTo(form.email.trim());
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg.includes("Database error") ? "That student ID is already registered." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-gradient p-12 text-primary-foreground lg:flex">
        <Logo className="text-primary-foreground [&_span:last-child]:text-primary-foreground" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Every voice on campus counts.</h2>
          <p className="mt-3 max-w-sm opacity-80">Sign in with your student account to vote in active elections.</p>
        </div>
        <p className="text-sm opacity-70">CampusVote · University elections</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          {sentTo ? (
            <div className="mt-10 text-center">
              <MailCheck className="mx-auto h-12 w-12 text-violet" />
              <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <strong>{sentTo}</strong>. Click it to activate your account.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>Back to sign in</Button>
            </div>
          ) : (
            <>
              <h1 className="mt-10 text-3xl font-bold">{mode === "signup" ? "Create student account" : "Welcome back"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "signup" ? "Register to take part in campus elections." : "Sign in to continue to your dashboard."}</p>
              <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
                {mode === "signup" && (
                  <>
                    <Field id="fullName" label="Full name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" />
                    <Field id="studentId" label="Student ID" value={form.studentId} onChange={set("studentId")} error={errors.studentId} placeholder="e.g. FA23-BCS-042" />
                  </>
                )}
                <Field id="email" label="University email" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" />
                <Field id="password" label="Password" type="password" value={form.password} onChange={set("password")} error={errors.password} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} {mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already registered?" : "New to CampusVote?"}{" "}
                <button type="button" className="font-semibold text-violet hover:underline" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErrors({}); }}>
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </p>
              <p className="mt-2 text-center text-xs"><Link to="/" className="text-muted-foreground hover:underline">← Back to home</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, error, ...props }: { id: string; label: string; error?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="h-11" {...props} />
      {error && <p id={`${id}-err`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type Errs = { fullName?: string; studentId?: string; email?: string; password?: string };

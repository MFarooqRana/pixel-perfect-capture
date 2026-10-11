import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Eye, Smartphone, UserPlus, BadgeCheck, MousePointerClick, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import hero from "@/assets/hero-campus.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusVote — Online Campus Elections" },
      { name: "description", content: "Vote for class representatives, society presidents and student leaders securely online." },
      { property: "og:title", content: "CampusVote — Online Campus Elections" },
      { property: "og:description", content: "Vote for class representatives, society presidents and student leaders securely online." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ShieldCheck, title: "Secure voting", text: "Verified student accounts, one vote per election enforced by the database." },
  { icon: Eye, title: "Transparent results", text: "Live tallies with vote counts and percentages once the election closes." },
  { icon: Smartphone, title: "Easy access", text: "Vote from any phone, tablet or laptop — no queues at the polling booth." },
];

export const steps = [
  { icon: UserPlus, title: "Register", text: "Create your account with your university email and student ID." },
  { icon: BadgeCheck, title: "Get approved", text: "The election office confirms you're an eligible voter." },
  { icon: MousePointerClick, title: "Cast your vote", text: "Read manifestos, pick a candidate, review and confirm." },
  { icon: BarChart3, title: "See results", text: "Results are published when voting closes." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden bg-soft-gradient">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-violet-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
              Student elections 2026
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Your campus. <span className="text-brand-gradient">Your vote.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              CampusVote lets every student elect class representatives, society presidents and student leaders —
              securely, fairly and from anywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg"><Link to="/elections">View elections <ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
            </div>
          </div>
          <div className="relative">
            <img src={hero} alt="Students walking across a university campus at sunset" width={1536} height={1024} className="rounded-3xl shadow-elevated" />
            <div className="absolute -bottom-6 left-6 rounded-2xl border bg-card p-4 shadow-elevated">
              <p className="text-xs text-muted-foreground">Turnout this week</p>
              <p className="font-display text-2xl font-bold text-primary">68%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Built for fair elections</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-7 shadow-card">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-soft text-violet"><f.icon className="h-6 w-6" /></span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-gradient">
        <div className="mx-auto max-w-6xl px-4 py-20 text-primary-foreground">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-6">
                <p className="font-display text-sm opacity-70">Step {i + 1}</p>
                <s.icon className="mt-3 h-6 w-6" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm opacity-80">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

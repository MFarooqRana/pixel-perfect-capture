import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Fingerprint, EyeOff, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How CampusVote Works" },
      { name: "description", content: "Registration, eligibility, voting and results — step by step." },
      { property: "og:title", content: "How CampusVote Works" },
      { property: "og:description", content: "Registration, eligibility, voting and results — step by step." },
    ],
  }),
  component: HowItWorks,
});

const items = [
  { icon: Fingerprint, title: "Verified identities", text: "Each account is tied to a unique student ID. An administrator approves eligible voters." },
  { icon: Lock, title: "One vote, enforced", text: "A database rule makes a second vote in the same election impossible — even if someone bypasses the website." },
  { icon: EyeOff, title: "Secret ballot", text: "Who voted and what they chose are stored separately. Results only ever show totals." },
  { icon: ServerCog, title: "Checks on the server", text: "Election dates, eligibility and candidate validity are checked on the server before a vote is saved." },
];

function HowItWorks() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-extrabold md:text-5xl">How CampusVote works</h1>
        <p className="mt-4 text-lg text-muted-foreground">Register, get approved, vote once, and see transparent results.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <i.icon className="h-6 w-6 text-violet" />
              <h2 className="mt-4 text-lg font-semibold">{i.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </div>
        <Button asChild className="mt-10" variant="hero" size="lg"><Link to="/auth" search={{ mode: "signup" }}>Create your account</Link></Button>
      </section>
      <SiteFooter />
    </div>
  );
}

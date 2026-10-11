/**
 * Shared election helpers used by student, results and admin pages.
 * The database stores a manual `status` (draft/open/closed) set by admins,
 * plus a start and end time. What students see is derived from both.
 */
import type { Database } from "@/integrations/supabase/types";

export type Election = Database["public"]["Tables"]["elections"]["Row"];
export type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
export type DisplayStatus = "draft" | "upcoming" | "active" | "completed";

/** Work out what phase an election is in right now. */
export function getDisplayStatus(
  e: Pick<Election, "status" | "start_at" | "end_at">,
  now: Date = new Date(),
): DisplayStatus {
  if (e.status === "draft") return "draft";
  if (e.status === "closed") return "completed";
  const start = new Date(e.start_at);
  const end = new Date(e.end_at);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

/** Results are visible once an admin closes the election or publishes results. */
export function resultsVisible(e: Pick<Election, "status" | "results_published">): boolean {
  return e.results_published || e.status === "closed";
}

/** Percentage of votes, rounded to one decimal. Returns 0 when nobody voted. */
export function percentOf(votes: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((votes / total) * 1000) / 10;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Convert an ISO string to the value format of <input type="datetime-local">. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

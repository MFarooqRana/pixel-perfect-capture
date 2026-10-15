# CampusVote — Online Voting System

A university semester project: students register, get approved as eligible voters, and vote for class representatives, society presidents and other student leaders.

## Tech
React 19 + TypeScript, TanStack Start (Vite), Tailwind CSS v4, shadcn/ui, Lovable Cloud (Postgres database + authentication).

## Pages
| Path | Who | Purpose |
|---|---|---|
| `/` | everyone | Landing page |
| `/elections` | everyone | All published elections |
| `/how-it-works` | everyone | Security explanation |
| `/auth` | everyone | Register / sign in (email + password, student ID) |
| `/dashboard` | students | Active / upcoming / completed elections, "You voted" indicators |
| `/election/:id` | students | Candidates, select → review → confirm vote |
| `/results`, `/results/:id` | everyone | Totals, percentages, progress bars |
| `/admin` | admins | Create/edit elections, candidates, open/close, publish results, turnout, eligible students |

## Database (see `drizzle/migrations/`)
- `profiles` — name, email, unique student ID (auto-created on signup by trigger)
- `user_roles` + `has_role()` — `admin` / `student`. **The first account ever registered becomes admin.**
- `elections`, `candidates`
- `eligible_voters` — students approved to vote
- `vote_receipts` — *who* voted; `UNIQUE (election_id, voter_id)` = one vote per student per election
- `ballots` — *what* was chosen, with **no voter column** (secret ballot; date-only timestamp to reduce correlation)

### Security
- Row Level Security on every table. Admin writes require `has_role(auth.uid(),'admin')` in the database, not just the UI.
- No insert/update/delete policies exist on votes → submitted votes cannot be changed or deleted.
- `cast_vote()` (security definer) checks sign-in, eligibility, election open + inside time window, candidate belongs to election, and the unique constraint — in one transaction.
- `get_results()` returns only aggregate counts, and only once results are published or the election is closed.
- No service-role keys in frontend code; only the publishable key is used in the browser.

## Running locally
```bash
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # unit tests for status/results rules
```
Environment variables (`.env`, generated automatically by Lovable Cloud): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Demo walkthrough
1. Register the first account → it becomes **admin**. Confirm the email link.
2. Register a second (student) account in another browser.
3. As admin → Admin → Students → switch **Eligible** on for both.
4. As the student → Dashboard → open "Student Union President 2026" → pick a candidate → Review → Confirm.
5. Try voting again → blocked ("already voted").
6. As admin → Close the election or toggle **Publish results** → `/results` shows totals.

## Limitations
Not production-ready: no audit logging, no email-domain restriction, admin can still see that a student voted (not what). Test thoroughly before real use.

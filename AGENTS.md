<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Voting goes only through the `cast_vote` DB function; `vote_receipts` (who) and `ballots` (what) stay unlinked — keeps ballots secret and one-vote enforced in the database.
- Admin permissions are enforced by RLS using `has_role`; UI checks are convenience only — the browser client is untrusted.
- Results are read only via `get_results` aggregate function — never expose ballot rows.
- Displayed election phase is derived in `src/lib/elections.ts` from DB status + time window — one source of truth for UI.

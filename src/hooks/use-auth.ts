/**
 * useAuth — the signed-in student's account, profile, roles and voting eligibility.
 * Roles are read from the protected user_roles table (never from editable metadata).
 * Note: hiding admin UI is only convenience — the database enforces permissions.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const meQueryKey = ["me"] as const;

async function fetchMe() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [profile, roles, eligible] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("eligible_voters").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const roleList = (roles.data ?? []).map((r) => r.role);
  return {
    user,
    profile: profile.data,
    isAdmin: roleList.includes("admin"),
    isEligible: !!eligible.data,
  };
}

export function useAuth() {
  const q = useQuery({ queryKey: meQueryKey, queryFn: fetchMe, staleTime: 30_000 });
  return { me: q.data ?? null, loading: q.isLoading };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

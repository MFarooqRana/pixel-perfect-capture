-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.election_status AS ENUM ('draft', 'open', 'closed');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  email text NOT NULL,
  student_id text NOT NULL UNIQUE CHECK (student_id ~ '^[A-Za-z0-9-]{3,20}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer so RLS policies can check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== Elections & candidates =====
CREATE TABLE public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  position text NOT NULL DEFAULT '' CHECK (char_length(position) <= 100),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.election_status NOT NULL DEFAULT 'draft',
  results_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  department text NOT NULL DEFAULT '' CHECK (char_length(department) <= 100),
  position text NOT NULL DEFAULT '' CHECK (char_length(position) <= 100),
  manifesto text NOT NULL DEFAULT '' CHECK (char_length(manifesto) <= 2000),
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Students allowed to vote (managed by admins)
CREATE TABLE public.eligible_voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Votes (identity separated from choice) =====
-- vote_receipts records WHO voted (one per election, enforced by UNIQUE)
CREATE TABLE public.vote_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, voter_id)
);
-- ballots records WHAT was chosen, with no link to the voter
CREATE TABLE public.ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at date NOT NULL DEFAULT current_date
);

-- ===== Grants =====
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.eligible_voters TO authenticated;
GRANT SELECT ON public.vote_receipts TO authenticated;
GRANT SELECT ON public.elections, public.candidates TO anon;
GRANT ALL ON public.profiles, public.user_roles, public.elections, public.candidates, public.eligible_voters, public.vote_receipts, public.ballots TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligible_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY "own profile or admin read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "read own roles or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public elections visible" ON public.elections FOR SELECT TO anon, authenticated
  USING (status <> 'draft' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert elections" ON public.elections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update elections" ON public.elections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete elections" ON public.elections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "candidates visible" ON public.candidates FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND (e.status <> 'draft' OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "admin insert candidates" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update candidates" ON public.candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete candidates" ON public.candidates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own eligibility or admin" ON public.eligible_voters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin add eligibility" ON public.eligible_voters FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin remove eligibility" ON public.eligible_voters FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Students see only their own receipts; no INSERT/UPDATE/DELETE policies => votes immutable
CREATE POLICY "own receipts" ON public.vote_receipts FOR SELECT TO authenticated
  USING (voter_id = auth.uid());
-- ballots: no policies at all => only reachable through security definer functions

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_elections BEFORE UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_candidates BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Signup: create profile + role. First user ever becomes admin (demo bootstrap). =====
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid text;
BEGIN
  sid := COALESCE(NULLIF(NEW.raw_user_meta_data->>'student_id', ''), 'U-' || substr(NEW.id::text, 1, 8));
  INSERT INTO public.profiles (id, full_name, email, student_id)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)), NEW.email, sid);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Cast vote: validates everything server-side inside one transaction =====
CREATE OR REPLACE FUNCTION public.cast_vote(_election_id uuid, _candidate_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.elections; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in to vote'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.eligible_voters WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Your account is not yet approved to vote. Please contact the election office.';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = _election_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Election not found'; END IF;
  IF e.status <> 'open' OR now() < e.start_at OR now() > e.end_at THEN
    RAISE EXCEPTION 'This election is not currently open for voting';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = _candidate_id AND election_id = _election_id) THEN
    RAISE EXCEPTION 'Invalid candidate for this election';
  END IF;
  BEGIN
    INSERT INTO public.vote_receipts (election_id, voter_id) VALUES (_election_id, uid);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already voted in this election';
  END;
  INSERT INTO public.ballots (election_id, candidate_id) VALUES (_election_id, _candidate_id);
END $$;
REVOKE ALL ON FUNCTION public.cast_vote(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid) TO authenticated;

-- ===== Results: aggregate only; visible when closed/ended+published, or to admins =====
CREATE OR REPLACE FUNCTION public.get_results(_election_id uuid)
RETURNS TABLE (candidate_id uuid, full_name text, department text, votes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.elections;
BEGIN
  SELECT * INTO e FROM public.elections WHERE id = _election_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Election not found'; END IF;
  IF NOT (e.results_published OR e.status = 'closed' OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Results are not available yet';
  END IF;
  RETURN QUERY
    SELECT c.id, c.full_name, c.department, COUNT(b.id)
    FROM public.candidates c LEFT JOIN public.ballots b ON b.candidate_id = c.id
    WHERE c.election_id = _election_id
    GROUP BY c.id ORDER BY COUNT(b.id) DESC, c.full_name;
END $$;
GRANT EXECUTE ON FUNCTION public.get_results(uuid) TO anon, authenticated;

-- ===== Admin stats: turnout per election =====
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE (election_id uuid, votes_cast bigint, eligible bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT e.id,
    (SELECT COUNT(*) FROM public.vote_receipts r WHERE r.election_id = e.id),
    (SELECT COUNT(*) FROM public.eligible_voters)
  FROM public.elections e;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

-- ===== Sample data =====
INSERT INTO public.elections (id, title, description, position, start_at, end_at, status, results_published) VALUES
('11111111-1111-1111-1111-111111111111', 'Student Union President 2026', 'Elect the president who will represent all students to the university senate and lead the Student Union for the 2026–27 academic year.', 'President', now() - interval '2 days', now() + interval '12 days', 'open', false),
('22222222-2222-2222-2222-222222222222', 'BS Computer Science — Class Representative', 'Choose the class representative for the 5th semester Computer Science cohort.', 'Class Representative', now() - interval '1 day', now() + interval '5 days', 'open', false),
('33333333-3333-3333-3333-333333333333', 'Debating Society President', 'Select the next leader of the University Debating Society.', 'Society President', now() + interval '7 days', now() + interval '14 days', 'open', false),
('44444444-4444-4444-4444-444444444444', 'Sports Council Secretary 2025', 'Annual election for the Sports Council secretary.', 'Secretary', now() - interval '30 days', now() - interval '20 days', 'closed', true);

INSERT INTO public.candidates (id, election_id, full_name, department, position, manifesto) VALUES
('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ayesha Khan', 'Business Administration', 'President', 'Transparent budgets, extended library hours during exams, and a monthly open forum with the administration.'),
('a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Bilal Ahmed', 'Electrical Engineering', 'President', 'Better campus Wi-Fi, a student mental-health helpline, and more funding for societies.'),
('a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Sara Malik', 'Psychology', 'President', 'A safer, greener campus with improved transport routes and accessible facilities for all.'),
('a2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Hamza Raza', 'Computer Science', 'Class Representative', 'Weekly coding clinics, shared past papers, and quick communication with faculty.'),
('a2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Fatima Noor', 'Computer Science', 'Class Representative', 'Fair assignment scheduling, an internship board, and a class mentorship program.'),
('a3000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Usman Tariq', 'Law', 'Society President', 'Host an inter-university championship and weekly practice rounds open to beginners.'),
('a3000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Zainab Hussain', 'English Literature', 'Society President', 'Public-speaking workshops and a bilingual debate league.'),
('a4000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Ali Hassan', 'Sports Sciences', 'Secretary', 'Organise more intramural tournaments and upgrade the gym.'),
('a4000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Maryam Iqbal', 'Physiotherapy', 'Secretary', 'Women''s sports teams and injury-prevention sessions.');

-- Anonymous historical ballots for the completed sample election
INSERT INTO public.ballots (election_id, candidate_id)
SELECT '44444444-4444-4444-4444-444444444444', 'a4000000-0000-0000-0000-000000000001' FROM generate_series(1, 142);
INSERT INTO public.ballots (election_id, candidate_id)
SELECT '44444444-4444-4444-4444-444444444444', 'a4000000-0000-0000-0000-000000000002' FROM generate_series(1, 118);
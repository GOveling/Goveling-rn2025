-- ================================================================
-- MIGRATION: Group Features - Trip Expenses & Group Decisions
-- Date: 2025-10-19
-- Description: Creates tables for split costs (expenses) and group voting (decisions)
-- ================================================================

-- STEP 1: Create trip_expenses table for split costs
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_by text[] NOT NULL, -- Array of participant names who paid
  split_between text[] NOT NULL, -- Array of participant names to split the cost
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON public.trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_created_by ON public.trip_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_created_at ON public.trip_expenses(created_at DESC);

-- Enable RLS
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_expenses
-- Policy: Users can view expenses if they own the trip or are collaborators
CREATE POLICY "Users can view trip expenses for their trips" ON public.trip_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_expenses.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_expenses.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can insert expenses for trips they have access to
CREATE POLICY "Users can create trip expenses for their trips" ON public.trip_expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = trip_expenses.trip_id 
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.trip_collaborators tc 
        WHERE tc.trip_id = trip_expenses.trip_id 
        AND tc.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update expenses for trips they have access to
CREATE POLICY "Users can update trip expenses for their trips" ON public.trip_expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_expenses.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_expenses.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can delete expenses for trips they have access to
CREATE POLICY "Users can delete trip expenses for their trips" ON public.trip_expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_expenses.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_expenses.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- STEP 2: Create trigger to update updated_at on trip_expenses
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_trip_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_expenses_updated_at ON public.trip_expenses;

CREATE TRIGGER trip_expenses_updated_at
  BEFORE UPDATE ON public.trip_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_expenses_updated_at();

-- STEP 3: Create trip_decisions table for group voting
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  options text[] NOT NULL, -- Array of decision options
  end_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  selected_participants text[] NOT NULL, -- Array of participant names who can vote
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_decisions_trip_id ON public.trip_decisions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_decisions_status ON public.trip_decisions(status);
CREATE INDEX IF NOT EXISTS idx_trip_decisions_created_by ON public.trip_decisions(created_by);
CREATE INDEX IF NOT EXISTS idx_trip_decisions_created_at ON public.trip_decisions(created_at DESC);

-- Enable RLS
ALTER TABLE public.trip_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_decisions
-- Policy: Users can view decisions if they own the trip or are collaborators
CREATE POLICY "Users can view trip decisions for their trips" ON public.trip_decisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_decisions.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_decisions.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can insert decisions for trips they have access to
CREATE POLICY "Users can create trip decisions for their trips" ON public.trip_decisions
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = trip_decisions.trip_id 
        AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.trip_collaborators tc 
        WHERE tc.trip_id = trip_decisions.trip_id 
        AND tc.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update decisions for trips they have access to
CREATE POLICY "Users can update trip decisions for their trips" ON public.trip_decisions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_decisions.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_decisions.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can delete decisions for trips they have access to
CREATE POLICY "Users can delete trip decisions for their trips" ON public.trip_decisions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = trip_decisions.trip_id 
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_collaborators tc 
      WHERE tc.trip_id = trip_decisions.trip_id 
      AND tc.user_id = auth.uid()
    )
  );

-- STEP 4: Create trigger to update updated_at on trip_decisions
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_trip_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_decisions_updated_at ON public.trip_decisions;

CREATE TRIGGER trip_decisions_updated_at
  BEFORE UPDATE ON public.trip_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_decisions_updated_at();

-- STEP 5: Create trip_decision_votes table for storing votes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_decision_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id uuid NOT NULL REFERENCES public.trip_decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(decision_id, user_id) -- Only one vote per user per decision
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_decision_votes_decision_id ON public.trip_decision_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_trip_decision_votes_user_id ON public.trip_decision_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_decision_votes_unique ON public.trip_decision_votes(decision_id, user_id);

-- Enable RLS
ALTER TABLE public.trip_decision_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_decision_votes
-- Policy: Users can view votes if they own the trip or are collaborators
CREATE POLICY "Users can view trip decision votes for their trips" ON public.trip_decision_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_decisions d
      INNER JOIN public.trips t ON d.trip_id = t.id
      WHERE d.id = trip_decision_votes.decision_id
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.trip_decisions d
      INNER JOIN public.trip_collaborators tc ON d.trip_id = tc.trip_id
      WHERE d.id = trip_decision_votes.decision_id
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can insert votes only for themselves
CREATE POLICY "Users can vote on decisions" ON public.trip_decision_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trip_decisions d
      INNER JOIN public.trips t ON d.trip_id = t.id
      WHERE d.id = decision_id
      AND (t.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.trip_decisions d
      INNER JOIN public.trip_collaborators tc ON d.trip_id = tc.trip_id
      WHERE d.id = decision_id
      AND tc.user_id = auth.uid()
    )
  );

-- Policy: Users can update only their own votes
CREATE POLICY "Users can update their own votes" ON public.trip_decision_votes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete only their own votes
CREATE POLICY "Users can delete their own votes" ON public.trip_decision_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 6: Create trigger to update updated_at on trip_decision_votes
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_trip_decision_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_decision_votes_updated_at ON public.trip_decision_votes;

CREATE TRIGGER trip_decision_votes_updated_at
  BEFORE UPDATE ON public.trip_decision_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_decision_votes_updated_at();

-- STEP 7: Grant permissions
-- ================================================================
GRANT ALL ON public.trip_expenses TO authenticated;
GRANT ALL ON public.trip_decisions TO authenticated;
GRANT ALL ON public.trip_decision_votes TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- Summary of changes:
-- ✅ Created trip_expenses table for tracking shared costs
-- ✅ Created trip_decisions table for group voting
-- ✅ Created trip_decision_votes table for storing votes
-- ✅ Added RLS policies for all three tables
-- ✅ Added indexes for performance
-- ✅ Added auto-update triggers for updated_at columns
-- ✅ Granted necessary permissions to authenticated users
-- ================================================================

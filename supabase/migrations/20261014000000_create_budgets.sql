CREATE TABLE IF NOT EXISTS public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL
        CHECK (char_length(trim(category)) BETWEEN 1 AND 60),
    amount numeric(14, 2) NOT NULL
        CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT budgets_user_category_unique
        UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS budgets_user_id_idx
    ON public.budgets (user_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own budgets"
    ON public.budgets;
CREATE POLICY "Users can view own budgets"
    ON public.budgets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own budgets"
    ON public.budgets;
CREATE POLICY "Users can create own budgets"
    ON public.budgets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets"
    ON public.budgets;
CREATE POLICY "Users can update own budgets"
    ON public.budgets
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets"
    ON public.budgets;
CREATE POLICY "Users can delete own budgets"
    ON public.budgets
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.budgets TO authenticated;
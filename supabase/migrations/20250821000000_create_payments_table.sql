-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT ('pay_' || replace(gen_random_uuid()::text, '-', '')),
  order_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" 
  ON public.payments 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id"
  ON public.payments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.payments
  FOR DELETE
  USING (auth.uid() = user_id);

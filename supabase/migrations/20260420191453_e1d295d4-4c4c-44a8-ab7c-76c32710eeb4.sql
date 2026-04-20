
-- Create push_notifications table
CREATE TABLE public.push_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  target_platform text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read push_notifications"
  ON public.push_notifications FOR SELECT
  USING (true);

CREATE INDEX idx_push_notifications_active ON public.push_notifications (is_active, target_platform);

-- Add platform column to wallet_users
ALTER TABLE public.wallet_users ADD COLUMN platform text DEFAULT 'web';


CREATE TABLE public.builds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  status text DEFAULT 'pending'::text,
  artifact_url text,
  build_log text,
  error_message text,
  runpod_pod_id text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.builds FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.builds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.builds FOR UPDATE USING (true);

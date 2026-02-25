CREATE TABLE public.builds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  artifact_url TEXT,
  build_log TEXT,
  error_message TEXT,
  runpod_pod_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.builds FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.builds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.builds FOR UPDATE USING (true);
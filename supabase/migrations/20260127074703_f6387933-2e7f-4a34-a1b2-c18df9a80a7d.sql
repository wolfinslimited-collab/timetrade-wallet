-- Create storage bucket for wallet avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wallet-avatars', 'wallet-avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Wallet avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'wallet-avatars');

-- Allow service role to upload avatars
CREATE POLICY "Service role can upload wallet avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wallet-avatars');

-- Allow service role to update avatars
CREATE POLICY "Service role can update wallet avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wallet-avatars');
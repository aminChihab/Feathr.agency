-- Create private buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-history', 'chat-history', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false);

-- chat-history policies
CREATE POLICY "Users read own chat-history files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-history' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own chat-history files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-history' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own chat-history files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-history' AND auth.uid()::text = (storage.foldername(name))[1]);

-- media policies
CREATE POLICY "Users read own media files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own media files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own media files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

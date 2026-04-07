-- profiles (uses id, not profile_id)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- platforms (read-only for all authenticated users)
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read platforms" ON platforms FOR SELECT TO authenticated USING (true);

-- Standard CRUD for profile_id tables: platform_accounts, content_library, clients,
-- content_calendar, posts, conversations, leads, research_reports, analytics, listings, touring_trips
-- Each gets SELECT/INSERT/UPDATE/DELETE policies using auth.uid() = profile_id

-- platform_accounts
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own platform_accounts" ON platform_accounts FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own platform_accounts" ON platform_accounts FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own platform_accounts" ON platform_accounts FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own platform_accounts" ON platform_accounts FOR DELETE USING (auth.uid() = profile_id);

-- content_library
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own content_library" ON content_library FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own content_library" ON content_library FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own content_library" ON content_library FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own content_library" ON content_library FOR DELETE USING (auth.uid() = profile_id);

-- clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = profile_id);

-- content_calendar
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own content_calendar" ON content_calendar FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own content_calendar" ON content_calendar FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own content_calendar" ON content_calendar FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own content_calendar" ON content_calendar FOR DELETE USING (auth.uid() = profile_id);

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own posts" ON posts FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = profile_id);

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid() = profile_id);

-- messages (join-based through conversations)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.profile_id = auth.uid()));
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.profile_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.profile_id = auth.uid()));
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.profile_id = auth.uid()));

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = profile_id);

-- research_reports
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own research_reports" ON research_reports FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own research_reports" ON research_reports FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own research_reports" ON research_reports FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own research_reports" ON research_reports FOR DELETE USING (auth.uid() = profile_id);

-- analytics
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own analytics" ON analytics FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own analytics" ON analytics FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own analytics" ON analytics FOR DELETE USING (auth.uid() = profile_id);

-- listings
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own listings" ON listings FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own listings" ON listings FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own listings" ON listings FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own listings" ON listings FOR DELETE USING (auth.uid() = profile_id);

-- touring_trips
ALTER TABLE touring_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own touring_trips" ON touring_trips FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own touring_trips" ON touring_trips FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own touring_trips" ON touring_trips FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own touring_trips" ON touring_trips FOR DELETE USING (auth.uid() = profile_id);

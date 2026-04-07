DO $$
DECLARE
  v_profile_id uuid;
  v_tryst_platform_id uuid;
  v_slixa_platform_id uuid;
  v_ege_platform_id uuid;
  v_adultwork_platform_id uuid;
  v_day date;
  v_followers int;
  v_engagement int;
BEGIN
  SELECT id INTO v_profile_id FROM profiles LIMIT 1;
  IF v_profile_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_tryst_platform_id FROM platforms WHERE slug = 'tryst';
  SELECT id INTO v_slixa_platform_id FROM platforms WHERE slug = 'slixa';
  SELECT id INTO v_ege_platform_id FROM platforms WHERE slug = 'eurogirlescorts';
  SELECT id INTO v_adultwork_platform_id FROM platforms WHERE slug = 'adultwork';

  INSERT INTO platform_accounts (id, profile_id, platform_id, username, status)
  VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', v_profile_id, v_tryst_platform_id, 'evahunter', 'connected'),
    ('aaaaaaaa-0000-0000-0000-000000000002', v_profile_id, v_slixa_platform_id, 'eva-hunter', 'connected'),
    ('aaaaaaaa-0000-0000-0000-000000000003', v_profile_id, v_ege_platform_id, 'EvaHunter', 'connected'),
    ('aaaaaaaa-0000-0000-0000-000000000004', v_profile_id, v_adultwork_platform_id, 'Eva_Hunter', 'connected')
  ON CONFLICT (profile_id, platform_id) DO NOTHING;

  v_followers := 340;
  FOR i IN 0..13 LOOP
    v_day := CURRENT_DATE - (13 - i);
    v_followers := v_followers + (random() * 8)::int;
    v_engagement := 15 + (random() * 25)::int;
    INSERT INTO analytics (profile_id, platform_account_id, date, followers, impressions, engagement, revenue_cents)
    VALUES (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_day, v_followers, 200 + (random() * 300)::int, v_engagement, 0)
    ON CONFLICT (platform_account_id, date) DO NOTHING;
  END LOOP;

  v_followers := 180;
  FOR i IN 0..13 LOOP
    v_day := CURRENT_DATE - (13 - i);
    v_followers := v_followers + (random() * 5)::int;
    v_engagement := 8 + (random() * 15)::int;
    INSERT INTO analytics (profile_id, platform_account_id, date, followers, impressions, engagement, revenue_cents)
    VALUES (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000002', v_day, v_followers, 100 + (random() * 200)::int, v_engagement, 0)
    ON CONFLICT (platform_account_id, date) DO NOTHING;
  END LOOP;

  INSERT INTO listings (profile_id, platform_account_id, listing_url, status, expires_at, renewal_status, performance)
  VALUES
    (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000001', 'https://tryst.link/escort/evahunter', 'active', CURRENT_DATE + 25, 'none', '{"views": 342, "clicks": 47}'),
    (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000002', 'https://slixa.com/eva-hunter', 'expiring', CURRENT_DATE + 3, 'pending', '{"views": 128, "clicks": 19}'),
    (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000003', 'https://eurogirlescorts.com/EvaHunter', 'active', CURRENT_DATE + 45, 'none', '{"views": 510, "clicks": 63}'),
    (v_profile_id, 'aaaaaaaa-0000-0000-0000-000000000004', 'https://adultwork.com/Eva_Hunter', 'expired', CURRENT_DATE - 5, 'failed', '{"views": 89, "clicks": 8}')
  ON CONFLICT DO NOTHING;
END $$;

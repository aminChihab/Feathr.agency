ALTER TABLE platform_accounts ADD CONSTRAINT platform_accounts_profile_platform_unique
  UNIQUE (profile_id, platform_id);

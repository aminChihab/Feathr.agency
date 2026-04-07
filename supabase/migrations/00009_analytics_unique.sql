ALTER TABLE analytics ADD CONSTRAINT analytics_account_date_unique
  UNIQUE (platform_account_id, date);

-- Add is_staff flag to subscriptions
-- Users with is_staff = true bypass all search quotas and plan restrictions.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT false;

-- To grant staff access to a user, run:
-- UPDATE subscriptions SET is_staff = true WHERE user_id = '<user-uuid>';

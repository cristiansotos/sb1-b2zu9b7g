/*
  # Add Rate Limiting System

  ## Overview
  Implements database-backed rate limiting for API requests and Edge Functions
  to prevent abuse and ensure fair usage.

  ## Changes

  ### 1. Rate Limit Tracking Table
  - Creates `rate_limit_requests` table to track API requests
  - Stores user_id, endpoint, request count, and time window
  - Automatically cleans up old records

  ### 2. Rate Limit Check Function
  - Function to check if user has exceeded rate limit
  - Configurable limits per endpoint
  - Returns true if allowed, false if rate limited

  ### 3. Rate Limit Configuration Table
  - Stores rate limit settings per endpoint
  - Admin-configurable limits
  - Default limits for common operations

  ## Security Impact
  - Prevents brute force attacks
  - Protects against API abuse
  - Ensures fair resource usage
  - Prevents denial of service

  ## Rate Limits (Defaults)
  - Transcription: 20 requests per hour
  - Memoir Generation: 10 requests per hour
  - File Upload: 50 requests per hour
  - General API: 100 requests per hour
*/

-- Create rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  max_requests integer NOT NULL DEFAULT 100,
  window_minutes integer NOT NULL DEFAULT 60,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read config
CREATE POLICY "Authenticated users can read rate limit config"
  ON rate_limit_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify config
CREATE POLICY "Admins can manage rate limit config"
  ON rate_limit_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Insert default rate limit configurations
INSERT INTO rate_limit_config (endpoint, max_requests, window_minutes, enabled)
VALUES
  ('transcribe', 20, 60, true),
  ('generate-memoir', 10, 60, true),
  ('file-upload', 50, 60, true),
  ('api-general', 100, 60, true),
  ('auth-login', 5, 15, true),
  ('auth-signup', 3, 60, true)
ON CONFLICT (endpoint) DO NOTHING;

-- Create rate limit requests tracking table
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limit data"
  ON rate_limit_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all rate limit data
CREATE POLICY "Service role manages rate limit data"
  ON rate_limit_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_user_endpoint
  ON rate_limit_requests(user_id, endpoint, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_cleanup
  ON rate_limit_requests(window_start) WHERE window_start < now() - interval '24 hours';

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config record;
  v_request_count integer;
  v_window_start timestamptz;
  v_is_allowed boolean;
  v_retry_after integer;
BEGIN
  -- Get rate limit configuration
  SELECT max_requests, window_minutes, enabled
  INTO v_config
  FROM rate_limit_config
  WHERE endpoint = p_endpoint;

  -- If no config found or disabled, allow request
  IF NOT FOUND OR v_config.enabled = false THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', 100,
      'remaining', 100,
      'reset_at', now() + interval '1 hour'
    );
  END IF;

  -- Calculate window start time
  v_window_start := now() - (v_config.window_minutes || ' minutes')::interval;

  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_request_count
  FROM rate_limit_requests
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > v_window_start;

  -- Check if limit exceeded
  v_is_allowed := v_request_count < v_config.max_requests;

  -- If allowed, increment counter
  IF v_is_allowed THEN
    -- Try to update existing record or insert new one
    INSERT INTO rate_limit_requests (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, now())
    ON CONFLICT (user_id, endpoint)
      WHERE window_start > now() - (SELECT window_minutes FROM rate_limit_config WHERE endpoint = p_endpoint) * interval '1 minute'
    DO UPDATE SET
      request_count = rate_limit_requests.request_count + 1;
  ELSE
    -- Calculate retry after in seconds
    SELECT EXTRACT(EPOCH FROM (MIN(window_start) + (v_config.window_minutes || ' minutes')::interval - now()))::integer
    INTO v_retry_after
    FROM rate_limit_requests
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND window_start > v_window_start;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'limit', v_config.max_requests,
    'remaining', GREATEST(0, v_config.max_requests - v_request_count - 1),
    'reset_at', now() + (v_config.window_minutes || ' minutes')::interval,
    'retry_after', COALESCE(v_retry_after, v_config.window_minutes * 60)
  );
END;
$$;

-- Function to clean up old rate limit records (run via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_requests
  WHERE window_start < now() - interval '24 hours';
END;
$$;

-- Add unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint_window
  ON rate_limit_requests(user_id, endpoint)
  WHERE window_start > now() - interval '24 hours';

COMMENT ON TABLE rate_limit_config IS 'Configuration for API rate limiting per endpoint';
COMMENT ON TABLE rate_limit_requests IS 'Tracks API requests for rate limiting enforcement';
COMMENT ON FUNCTION check_rate_limit IS 'Checks if a user has exceeded the rate limit for an endpoint';
COMMENT ON FUNCTION cleanup_rate_limit_requests IS 'Removes old rate limit tracking records (run via cron)';

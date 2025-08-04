-- Create webhook test data table
CREATE TABLE IF NOT EXISTS webhook_test_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_data JSONB,
  headers JSONB,
  raw_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_test_data_created_at ON webhook_test_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_test_data_received_at ON webhook_test_data(received_at DESC);

-- Add comments for documentation
COMMENT ON TABLE webhook_test_data IS 'Test table to store MX Merchant webhook data for testing purposes';
COMMENT ON COLUMN webhook_test_data.webhook_data IS 'Parsed JSON data from webhook payload';
COMMENT ON COLUMN webhook_test_data.headers IS 'HTTP headers from webhook request';
COMMENT ON COLUMN webhook_test_data.raw_body IS 'Raw request body as received';
COMMENT ON COLUMN webhook_test_data.received_at IS 'Timestamp when webhook was received';
COMMENT ON COLUMN webhook_test_data.created_at IS 'Database record creation timestamp';
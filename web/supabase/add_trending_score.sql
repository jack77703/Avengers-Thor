-- Add trending_score column to stock_snapshots table
ALTER TABLE stock_snapshots 
ADD COLUMN IF NOT EXISTS trending_score DECIMAL(5, 2);

-- Create index for faster trend queries
CREATE INDEX IF NOT EXISTS idx_symbol_timestamp_score 
ON stock_snapshots(symbol, timestamp DESC, trending_score);

COMMENT ON COLUMN stock_snapshots.trending_score IS 'StockTwits trending score (0-100) for momentum analysis';

-- MomenTracker Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Table: stock_snapshots
-- Stores historical stock data for trend analysis and Z-score calculations
CREATE TABLE IF NOT EXISTS stock_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  price DECIMAL(12, 2),
  percent_change DECIMAL(8, 4),
  volume BIGINT,
  message_volume INTEGER,
  rank INTEGER,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_symbol_timestamp ON stock_snapshots(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timestamp ON stock_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON stock_snapshots(created_at DESC);

-- Function: Automatic cleanup of old data (>7 days)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_snapshots 
  WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000;
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule automatic cleanup (run daily at midnight)
-- Note: You can set this up in Supabase Dashboard > Database > Cron Jobs
-- SELECT cron.schedule('cleanup-snapshots', '0 0 * * *', 'SELECT cleanup_old_snapshots()');

COMMENT ON TABLE stock_snapshots IS 'Historical stock trading data and social sentiment snapshots';
COMMENT ON COLUMN stock_snapshots.timestamp IS 'Unix timestamp in milliseconds';
COMMENT ON COLUMN stock_snapshots.message_volume IS 'Social media mention volume (StockTwits watchlist count)';

-- Table: stock_ohlcv
-- Stores daily OHLC (Open, High, Low, Close) + Volume data
-- Updated once per day when market closes
CREATE TABLE IF NOT EXISTS stock_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL UNIQUE,
  open_price DECIMAL(12, 2) NOT NULL,
  high_price DECIMAL(12, 2) NOT NULL,
  low_price DECIMAL(12, 2) NOT NULL,
  close_price DECIMAL(12, 2) NOT NULL,
  volume BIGINT,
  previous_close DECIMAL(12, 2),
  percent_change DECIMAL(8, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- Indexes for fast OHLC queries
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_date ON stock_ohlcv(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol ON stock_ohlcv(symbol);
CREATE INDEX IF NOT EXISTS idx_ohlcv_date ON stock_ohlcv(date DESC);

COMMENT ON TABLE stock_ohlcv IS 'Daily OHLC (Open, High, Low, Close) and Volume data for historical analysis';
COMMENT ON COLUMN stock_ohlcv.date IS 'Trading date (YYYY-MM-DD)';
COMMENT ON COLUMN stock_ohlcv.previous_close IS 'Previous trading day close price (for calculating percent change)';

-- Table: stock_fundamentals
-- Stores company fundamental data (PE ratio, market cap, dividend yield, etc.)
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255),
  industry VARCHAR(100),
  sector VARCHAR(100),
  market_cap DECIMAL(20, 2),
  pe_ratio DECIMAL(10, 2),
  peg_ratio DECIMAL(10, 2),
  eps DECIMAL(10, 4),
  dividend_yield DECIMAL(10, 4),
  debt_to_equity DECIMAL(10, 2),
  current_ratio DECIMAL(10, 2),
  roe DECIMAL(10, 2),
  roa DECIMAL(10, 2),
  profit_margin DECIMAL(10, 2),
  revenue_growth DECIMAL(10, 2),
  earnings_growth DECIMAL(10, 2),
  book_value DECIMAL(12, 2),
  week_52_high DECIMAL(12, 2),
  week_52_low DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON stock_fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_updated_at ON stock_fundamentals(updated_at DESC);

COMMENT ON TABLE stock_fundamentals IS 'Company fundamental metrics and ratios';

-- Table: stock_earnings
-- Stores historical earnings data and surprises
CREATE TABLE IF NOT EXISTS stock_earnings (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  period_date DATE NOT NULL,
  eps_actual DECIMAL(10, 4),
  eps_estimate DECIMAL(10, 4),
  eps_surprise DECIMAL(10, 4),
  eps_surprise_pct DECIMAL(10, 4),
  quarter INTEGER,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, period_date)
);

CREATE INDEX IF NOT EXISTS idx_earnings_symbol_date ON stock_earnings(symbol, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_symbol ON stock_earnings(symbol);

COMMENT ON TABLE stock_earnings IS 'Historical earnings data and EPS surprises';

-- Table: stock_news
-- Stores company news articles
CREATE TABLE IF NOT EXISTS stock_news (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  news_id BIGINT UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT,
  source VARCHAR(100),
  url TEXT,
  category VARCHAR(50),
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_symbol_published ON stock_news(symbol, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_symbol ON stock_news(symbol);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON stock_news(published_at DESC);

COMMENT ON TABLE stock_news IS 'Company news articles and press releases';

-- Table: stock_recommendations
-- Stores analyst recommendation trends
CREATE TABLE IF NOT EXISTS stock_recommendations (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  period_date DATE NOT NULL,
  strong_buy INTEGER DEFAULT 0,
  buy INTEGER DEFAULT 0,
  hold INTEGER DEFAULT 0,
  sell INTEGER DEFAULT 0,
  strong_sell INTEGER DEFAULT 0,
  consensus VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, period_date)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_symbol_date ON stock_recommendations(symbol, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_symbol ON stock_recommendations(symbol);

COMMENT ON TABLE stock_recommendations IS 'Analyst recommendation trends';

-- Table: stock_insider_transactions
-- Stores insider trading transactions
CREATE TABLE IF NOT EXISTS stock_insider_transactions (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  insider_name VARCHAR(255),
  title VARCHAR(255),
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(10), -- BUY or SELL
  shares BIGINT,
  price DECIMAL(12, 2),
  change_shares BIGINT,
  filing_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insider_symbol_date ON stock_insider_transactions(symbol, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_symbol ON stock_insider_transactions(symbol);

COMMENT ON TABLE stock_insider_transactions IS 'Insider trading transactions';

-- Table: stock_dividends
-- Stores dividend payment information
CREATE TABLE IF NOT EXISTS stock_dividends (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  ex_date DATE NOT NULL,
  amount DECIMAL(10, 4),
  pay_date DATE,
  record_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, ex_date)
);

CREATE INDEX IF NOT EXISTS idx_dividends_symbol_date ON stock_dividends(symbol, ex_date DESC);
CREATE INDEX IF NOT EXISTS idx_dividends_symbol ON stock_dividends(symbol);

COMMENT ON TABLE stock_dividends IS 'Dividend payment information';

-- Table: stock_splits
-- Stores stock split information
CREATE TABLE IF NOT EXISTS stock_splits (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  split_date DATE NOT NULL,
  from_factor DECIMAL(10, 4),
  to_factor DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_splits_symbol_date ON stock_splits(symbol, split_date DESC);
CREATE INDEX IF NOT EXISTS idx_splits_symbol ON stock_splits(symbol);

COMMENT ON TABLE stock_splits IS 'Historical stock split information';

-- Table: economic_data
-- Stores macroeconomic indicators
CREATE TABLE IF NOT EXISTS economic_data (
  id BIGSERIAL PRIMARY KEY,
  country VARCHAR(10) NOT NULL,
  indicator_code VARCHAR(50) NOT NULL,
  indicator_name VARCHAR(255),
  data_date DATE NOT NULL,
  value DECIMAL(20, 4),
  unit VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(indicator_code, data_date)
);

CREATE INDEX IF NOT EXISTS idx_economic_code_date ON economic_data(indicator_code, data_date DESC);
CREATE INDEX IF NOT EXISTS idx_economic_country ON economic_data(country);

COMMENT ON TABLE economic_data IS 'Macroeconomic indicators and data';

-- Table: stock_trending_snapshots
-- Stores StockTwits trending data snapshots (only when symbol is in trending list)
-- Used to calculate real-time, 6-hour, and 24-hour trending dimensions
CREATE TABLE IF NOT EXISTS stock_trending_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  rank INTEGER NOT NULL,
  trending_score DECIMAL(10, 2) NOT NULL,
  message_volume INTEGER,
  bullish_count INTEGER,
  bearish_count INTEGER,
  watchlist_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_trending_symbol_ts ON stock_trending_snapshots(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_timestamp ON stock_trending_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_symbol ON stock_trending_snapshots(symbol);

-- Unique constraint to prevent duplicate entries in same minute
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_unique_symbol_minute 
ON stock_trending_snapshots(symbol, date_trunc('minute', created_at));

COMMENT ON TABLE stock_trending_snapshots IS 'Trending data snapshots from StockTwits (only active trending symbols recorded)';
COMMENT ON COLUMN stock_trending_snapshots.rank IS 'Rank in trending list (1-30)';
COMMENT ON COLUMN stock_trending_snapshots.trending_score IS 'StockTwits trending score (0-100)';
COMMENT ON COLUMN stock_trending_snapshots.message_volume IS 'Message volume in last 24 hours';
COMMENT ON COLUMN stock_trending_snapshots.created_at IS 'When this snapshot was recorded';



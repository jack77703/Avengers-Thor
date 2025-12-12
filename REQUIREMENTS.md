# Financial Data System - Complete Requirements

## Overview
Build a stock trending and data management system that displays the top 30 trending stocks from StockTwits with smart symbol retention using a rolling window approach, OHLCV data management, and real-time price updates via WebSocket.

---

## Core Flow

```
1. Get Top 30 Trending Stocks
   └─> StockTwits API
       └─> Get trending symbols with metadata (rank, watchlist_count, sentiment)

2. Apply Rolling Window (Symbol Retention)
   └─> Real-time: Is symbol currently in top 30?
   └─> 6-hour: Average trending score over last 6 hours
   └─> 24-hour: Average trending score over last 24 hours
   └─> Decision: Keep symbol if meets thresholds
       └─> Currently trending OR
       └─> 6h avg score > 50 OR
       └─> 24h avg score > 40

3. Fetch OHLCV Data (Database-First)
   └─> Check Supabase for today's OHLCV
   └─> If found: Use database
   └─> If not found: Fetch from Finnhub API → Save to database
   └─> Get previous close price from database
   └─> Calculate percentage change from previous close (not last update)

4. Real-time Price Updates (WebSocket)
   └─> Finnhub WebSocket connection
   └─> Stream live prices for subscribed symbols
   └─> Calculate % change from previous close (NOT from last price update)
   └─> Update UI with live prices

5. Display Dashboard
   └─> Show top trending symbols
   └─> Real-time price updates via WebSocket
   └─> Sort by rank, watchers, trending score, market cap, % change
   └─> Card view or table view
```

---

## Requirement Details

### 1. Trending Symbol Management (Approach B)

**Implementation**: `symbol-manager.ts`

#### What it does:
- Saves snapshots of top 30 trending symbols from StockTwits API
- Only records symbols when they appear in trending list (no zeros)
- Keeps historical data for 24 hours minimum
- Automatically calculates 3-dimension trending metrics

#### Database Table: `stock_trending_snapshots`
```sql
- symbol: string (PK)
- rank: integer (1-30)
- trending_score: float
- message_volume: integer (optional)
- bullish_count: integer (optional)
- bearish_count: integer (optional)
- watchlist_count: integer (optional)
- created_at: timestamp
```

#### Key Functions:
```typescript
// Save trending data from StockTwits API
saveTrendingSnapshots(snapshots: TrendingSnapshot[]): Promise<boolean>

// Calculate 3-dimension trending metrics for a symbol
calculateTrendingDimensions(symbol: string): Promise<TrendingDimensions>

// Get symbols that should stay in dashboard
getStableSymbols(currentTrendingSymbols: string[]): Promise<string[]>

// Get detailed metrics for all symbols
getAllTrendingMetrics(symbols: string[]): Promise<TrendingDimensions[]>

// Clean up old snapshots (older than 30 days)
cleanupOldSnapshots(daysToKeep: number = 30): Promise<boolean>
```

#### TrendingDimensions Response:
```typescript
{
  symbol: string;
  
  // Real-time dimension
  realTime: {
    rank: number;              // Current rank in top 30
    score: number;             // Current trending score
    isCurrentlyTrending: boolean; // In top 30 right now
    lastSeen: Date;           // When last seen in trending
  };
  
  // 6-hour dimension
  sixHour: {
    avgScore: number;         // Average score last 6 hours
    avgRank: number;          // Average rank last 6 hours
    snapshotCount: number;    // How many snapshots in 6h
    trend: 'up' | 'down' | 'stable'; // Direction vs 24h
    volatility: number;       // Std dev of scores
  };
  
  // 24-hour dimension
  twentyFourHour: {
    avgScore: number;         // Average score last 24h
    avgRank: number;          // Average rank last 24h
    peakScore: number;        // Highest score in 24h
    peakTime: Date;          // When peak occurred
    snapshotCount: number;    // Total snapshots in 24h
    consistency: number;      // % of snapshots in trending (0-100)
  };
  
  // Decision logic
  keepSymbol: boolean;        // Should stay in dashboard?
  keepReason: string;         // Why keep or remove
}
```

#### Keep Decision Logic:
```typescript
if (realTime.isCurrentlyTrending) {
  keepSymbol = true;  // Currently in top 30
} else if (sixHourAvgScore > 50) {
  keepSymbol = true;  // Strong 6h momentum
} else if (twentyFourHourAvgScore > 40) {
  keepSymbol = true;  // Sustained 24h interest
} else {
  keepSymbol = false; // Below all thresholds
}
```

---

### 2. OHLCV Data Management

**Implementation**: `data-fetcher.ts`

#### What it does:
- Checks Supabase for today's OHLCV data FIRST
- Falls back to Finnhub API if not in database
- Automatically saves API data to database
- Returns previous close price for percentage calculations

#### Database Table: `stock_ohlcv`
```sql
- symbol: string (PK)
- date: date (PK)
- open_price: float
- high_price: float
- low_price: float
- close_price: float
- previous_close: float (IMPORTANT for % change calc)
- volume: integer
- percent_change: float (from previous close)
- created_at: timestamp
- updated_at: timestamp
```

#### Data Fetching Flow:
```typescript
1. Check if symbol has OHLCV for today
   ├─ Found in DB? → Return it + get current price from API
   └─ Not found?
      ├─ Fetch from Finnhub API (quote endpoint)
      ├─ Save to database
      └─ Return combined data

2. Return StockDataWithOHLCV:
   {
     symbol: string;
     price: number;              // Current price (from API)
     previousClosePrice: number; // Previous close (for % calc)
     percentChange: number;      // (price - previousClose) / previousClose * 100
     open: number;
     high: number;
     low: number;
     close: number;
     volume: number;
     date: string;               // Today's date (YYYY-MM-DD)
     source: 'database' | 'api'; // Where data came from
     fetchedAt: string;          // ISO timestamp
   }
```

#### Key Functions:
```typescript
// Try DB first, then API
getStockDataWithOHLCV(symbol: string): Promise<StockDataWithOHLCV | null>

// Batch fetch for multiple symbols
getStocksDataWithOHLCV(symbols: string[]): Promise<StockDataWithOHLCV[]>

// Save OHLCV data to database
saveBatchOHLCVData(data: OHLCVData[]): Promise<boolean>
```

---

### 3. Real-time Price Updates (WebSocket)

**Implementation**: `useFinnhubWebSocket.ts`

#### What it does:
- Opens persistent WebSocket connection to Finnhub
- Subscribes to live price updates for trending symbols
- **Calculates % change from PREVIOUS CLOSE price, NOT from last update**
- Updates UI with live prices every 100-200ms
- Auto-reconnects on disconnect

#### WebSocket Flow:
```
Finnhub WebSocket
    ↓
Every trade update (100-200ms)
    ↓
Calculate % change from previousClosePrice (stored in priceReferenceMap)
    ↓
Update React state (Map<symbol, PriceUpdate>)
    ↓
Component re-renders with new price
```

#### PriceUpdate Data Structure:
```typescript
{
  symbol: string;
  price: number;                    // Latest trade price
  timestamp: number;                // Trade timestamp (ms)
  change?: number;                  // Point change from last update (for animation)
  percentChange?: number;           // % change from previousClosePrice ← KEY
  previousClosePrice?: number;      // Previous close (reference)
}
```

#### Key Functions:
```typescript
// Subscribe to symbols with their previous close prices
subscribe(symbols: Array<{
  symbol: string;
  previousClosePrice: number;  // MUST be passed from DB
}>): void

// Unsubscribe from symbols
unsubscribe(symbols: string[]): void

// Get all current prices
prices: Map<string, PriceUpdate>

// Check if connected
isConnected: boolean
```

#### CRITICAL: Percentage Change Calculation
```typescript
// ✅ CORRECT - Use previous close price
const percentChange = ((currentPrice - previousClosePrice) / previousClosePrice) * 100;

// ❌ WRONG - Do NOT use last update
const percentChange = ((currentPrice - lastUpdatePrice) / lastUpdatePrice) * 100;
```

---

### 4. Dashboard Display

**Implementation**: `stock-dashboard.tsx`

#### What it does:
- Displays top 30 trending stocks in card or table view
- Subscribes to WebSocket for real-time prices
- Sorts by: rank, watchers, trending score, market cap, % change
- Updates UI when real-time prices arrive
- Shows trending indicators from 3-dimension analysis

#### Stock Data Model:
```typescript
interface Stock {
  ticker: string;
  company: string;
  sector: string;
  marketCap: number;
  
  // From database
  price: number;
  previousClosePrice: number;  // For WebSocket % calc
  percentChange: number;       // From previous close
  volume: number;
  
  // From trending analysis
  rank: number;                 // Current rank (1-30)
  trendingScore: number;        // Current trending score
  watchers: number;             // Watchlist count
  
  // WebSocket metadata
  lastUpdated: string;          // ISO timestamp
  _priceChange?: number;        // Point change (for animation)
}
```

#### Sort Options:
- `rank`: 1-30 (ascending = best)
- `watchers`: High watchers first
- `trending`: High score first
- `marketCap`: Large cap first
- `percentChange`: Large % change first

#### View Modes:
- `card`: Card grid view (3 columns)
- `table`: Sortable table view

---

### 5. API Routes

#### POST `/api/stocks/trending`
- Fetches top 30 from StockTwits
- Saves trending snapshots
- Calculates 3-dimension metrics
- Returns stable symbols to display

**Request:**
```json
{
  "includeMetrics": true  // Optional, calculate full dimensions
}
```

**Response:**
```json
{
  "symbols": ["TSLA", "NVDA", ...],
  "count": 30,
  "metrics": [
    {
      "symbol": "TSLA",
      "realTime": {...},
      "sixHour": {...},
      "twentyFourHour": {...},
      "keepSymbol": true,
      "keepReason": "Currently in top 30"
    }
  ]
}
```

#### GET `/api/stocks/ohlcv?symbols=AAPL,TSLA,NVDA`
- Returns OHLCV + previous close for symbols
- Database-first approach
- Fetches missing data from API

**Response:**
```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "price": 150.25,
      "previousClosePrice": 149.50,
      "percentChange": 0.5,
      "open": 149.75,
      "high": 151.00,
      "low": 149.25,
      "close": 150.25,
      "volume": 50000000,
      "date": "2025-12-12",
      "source": "database",
      "fetchedAt": "2025-12-12T10:30:00Z"
    }
  ]
}
```

---

## Database Schema

### stock_trending_snapshots
```sql
CREATE TABLE stock_trending_snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  rank INTEGER NOT NULL,
  trending_score FLOAT NOT NULL,
  message_volume INTEGER,
  bullish_count INTEGER,
  bearish_count INTEGER,
  watchlist_count INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(symbol, created_at)
);

CREATE INDEX idx_trending_symbol_date ON stock_trending_snapshots(symbol, created_at DESC);
CREATE INDEX idx_trending_date ON stock_trending_snapshots(created_at DESC);
```

### stock_ohlcv
```sql
CREATE TABLE stock_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open_price FLOAT,
  high_price FLOAT,
  low_price FLOAT,
  close_price FLOAT,
  previous_close FLOAT NOT NULL,
  volume BIGINT,
  percent_change FLOAT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(symbol, date)
);

CREATE INDEX idx_ohlcv_symbol_date ON stock_ohlcv(symbol, date DESC);
```

---

## Environment Variables Required

```bash
# API Keys
NEXT_PUBLIC_FINNHUB_API_KEY=xxxxx  # Finnhub API key (public for WebSocket)
FINNHUB_API_KEY=xxxxx               # Finnhub API key (server-side)

# Database
SUPABASE_URL=xxxxx
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx          # For server-side operations

# Optional
ENABLE_CRON_SCHEDULER=true          # Enable scheduled data updates
```

---

## Implementation Status

### ✅ Completed
- [x] StockTwits API integration (fetch top 30)
- [x] Symbol manager with 3-dimension trending (Approach B)
- [x] Trending snapshots storage
- [x] OHLCV data fetching (DB-first + API fallback)
- [x] WebSocket real-time price updates
- [x] % change calculation from previous close
- [x] Dashboard display with sorting
- [x] Database schema

### 🔄 In Progress / Ready for Review
- [ ] Integration testing (all components together)
- [ ] Performance optimization (high-volume symbol updates)
- [ ] Error handling refinements
- [ ] Monitoring & logging

### 📋 Future Enhancements
- Scheduled OHLCV updates (daily, hourly)
- Economic indicators data
- Sentiment analysis from StockTwits
- ML-based trend prediction
- Alert system

---

## Testing Checklist

### Unit Testing
- [ ] Symbol retention logic (keep/remove decisions)
- [ ] Percentage change calculations
- [ ] OHLCV data fetching fallback
- [ ] WebSocket subscription/unsubscription

### Integration Testing
- [ ] Full flow: Trending → OHLCV → WebSocket → UI
- [ ] Database saves and retrieves correctly
- [ ] API fallback works when DB is empty
- [ ] WebSocket reconnection on disconnect
- [ ] % change consistent between DB and WebSocket

### Manual Testing
- [ ] Run dashboard, verify top 30 display
- [ ] Check real-time prices update every 100-200ms
- [ ] Verify % change from previous close
- [ ] Check trending symbols stay/disappear based on thresholds
- [ ] Test sorting by different criteria
- [ ] Toggle between card and table views

---

## Performance Targets
- WebSocket latency: <500ms from trade to UI update
- API response: <2 seconds for OHLCV fetch
- Dashboard load: <3 seconds (initial)
- Real-time updates: 100-200ms cadence

---

## Notes for Development Agent
- **Approach B**: Only record symbols when trending (no zeros)
- **% Change**: Always from previousClosePrice, never from last update
- **Database-First**: Always check DB before API call
- **Scaling**: System designed to handle 30+ symbols efficiently
- **Key Files**:
  - `symbol-manager.ts`: Trending logic
  - `data-fetcher.ts`: OHLCV management
  - `useFinnhubWebSocket.ts`: Real-time updates
  - `stock-dashboard.tsx`: UI display

/**
 * Smart Data Fetching
 * 
 * For each symbol:
 * 1. Check if OHLCV exists in database
 * 2. If missing → fetch from Finnhub → save to DB
 * 3. Return data for UI
 */

import { supabase } from './supabase';
import { getFinnhubQuote } from './finnhub';
import { saveBatchOHLCVData } from './ohlcv';

export interface StockDataWithOHLCV {
  symbol: string;
  price: number;
  previousClosePrice: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string; // YYYY-MM-DD (today's date)
  source: 'database' | 'api'; // Where data came from
  fetchedAt: string; // ISO timestamp
}

/**
 * Get stock data - tries DB first, then API
 */
export async function getStockDataWithOHLCV(symbol: string): Promise<StockDataWithOHLCV | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Try to get from database
    console.log(`🔍 Checking database for ${symbol} (${today})`);
    const { data: dbData, error: dbError } = await supabase
      .from('stock_ohlcv')
      .select('*')
      .eq('symbol', symbol)
      .eq('date', today)
      .single();

    if (dbData && !dbError) {
      console.log(`✅ Found ${symbol} in database`);
      
      // Get current price from API to calculate latest percentChange
      const quote = await getFinnhubQuote(symbol);
      
      return {
        symbol,
        price: quote?.price || dbData.close_price,
        previousClosePrice: dbData.previous_close,
        percentChange: quote?.percentChange || dbData.percent_change,
        open: dbData.open_price,
        high: dbData.high_price,
        low: dbData.low_price,
        close: dbData.close_price,
        volume: dbData.volume,
        date: today,
        source: 'database',
        fetchedAt: new Date().toISOString(),
      };
    }

    // Step 2: Database miss - fetch from API
    console.log(`🌐 Database miss, fetching from API for ${symbol}`);
    const quote = await getFinnhubQuote(symbol);
    
    if (!quote) {
      console.error(`❌ No data from API for ${symbol}`);
      return null;
    }

    // Step 3: Save to database for future use
    console.log(`💾 Saving ${symbol} to database`);
    await saveBatchOHLCVData([
      {
        symbol,
        date: today,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: quote.volume,
        previousClose: quote.previousClosePrice,
        percentChange: quote.percentChange,
      },
    ]);

    return {
      symbol,
      price: quote.price,
      previousClosePrice: quote.previousClosePrice,
      percentChange: quote.percentChange,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.price,
      volume: quote.volume,
      date: today,
      source: 'api',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get data for multiple symbols efficiently
 * Parallel fetch from DB and API
 */
export async function getStockDataForMultipleSymbols(
  symbols: string[]
): Promise<StockDataWithOHLCV[]> {
  console.log(`📦 Fetching data for ${symbols.length} symbols...`);
  
  const results = await Promise.all(
    symbols.map(symbol => getStockDataWithOHLCV(symbol))
  );

  return results.filter((data): data is StockDataWithOHLCV => data !== null);
}

/**
 * Initialize trending symbols with complete data
 * This is what you call from your dashboard
 */
export async function initializeTrendingStocks(trendingSymbols: string[]): Promise<StockDataWithOHLCV[]> {
  console.log(`\n📊 Initializing ${trendingSymbols.length} trending stocks...`);
  
  const stocks = await getStockDataForMultipleSymbols(trendingSymbols);
  
  // Summary
  const fromDb = stocks.filter(s => s.source === 'database').length;
  const fromApi = stocks.filter(s => s.source === 'api').length;
  
  console.log(`✅ Loaded ${stocks.length} stocks (${fromDb} from DB, ${fromApi} from API)\n`);
  
  return stocks;
}

/**
 * Refresh a single stock (used when price updates or reloading)
 */
export async function refreshStockData(symbol: string): Promise<StockDataWithOHLCV | null> {
  console.log(`🔄 Refreshing ${symbol}...`);
  
  // Always get fresh quote from API
  const quote = await getFinnhubQuote(symbol);
  
  if (!quote) {
    console.error(`❌ Could not refresh ${symbol}`);
    return null;
  }

  // Try to get today's OHLCV from database
  const today = new Date().toISOString().split('T')[0];
  const { data: dbData } = await supabase
    .from('stock_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .eq('date', today)
    .single();

  return {
    symbol,
    price: quote.price,
    previousClosePrice: quote.previousClosePrice,
    percentChange: quote.percentChange,
    open: dbData?.open_price || quote.open,
    high: dbData?.high_price || quote.high,
    low: dbData?.low_price || quote.low,
    close: dbData?.close_price || quote.price,
    volume: dbData?.volume || quote.volume,
    date: today,
    source: dbData ? 'database' : 'api',
    fetchedAt: new Date().toISOString(),
  };
}

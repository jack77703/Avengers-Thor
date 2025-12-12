/**
 * Data Collection API Route
 * Triggered by cron jobs or manual calls to fetch and update all financial data
 * 
 * Usage:
 * - Manual: GET /api/data-collection?symbols=AAPL,TSLA&types=fundamentals,ohlcv
 * - Cron: Set up external cron service to call this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  collectAllStockData,
  collectEconomicData,
} from '@/lib/finnhub-comprehensive';
import { saveBatchOHLCVData } from '@/lib/ohlcv';
import { getFinnhubQuote } from '@/lib/finnhub';
import { getTrendingStocks } from '@/lib/stocktwits';
import { saveTrendingSnapshots, getStableSymbols } from '@/lib/symbol-manager';
import { getStockDataWithOHLCV } from '@/lib/data-fetcher';

async function runTrendingCollection() {
  const trending = await getTrendingStocks();
  const snapshotRecords = trending.symbols.map(symbol => ({
    symbol: symbol.symbol,
    rank: symbol.rank || 0,
    trendingScore: symbol.trending_score || 0,
    messageVolume: symbol.messageVolume || symbol.watchlist_count,
    bullishCount: symbol.sentiment?.bullish ?? undefined,
    bearishCount: symbol.sentiment?.bearish ?? undefined,
    watchlistCount: symbol.watchlist_count,
  }));

  await saveTrendingSnapshots(snapshotRecords);
  const currentSymbolList = trending.symbols.map(symbol => symbol.symbol);
  const stableSymbols = await getStableSymbols(currentSymbolList);

  const ohlcvResults = await Promise.all(
    stableSymbols.map(async symbol => ({
      symbol,
      ohlcv: await getStockDataWithOHLCV(symbol),
    }))
  );

  return {
    timestamp: new Date().toISOString(),
    action: 'trending',
    marketStatus: trending.marketStatus,
    trendingCount: currentSymbolList.length,
    stableSymbols,
    ohlcv: ohlcvResults.filter(result => result.ohlcv !== null),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols')?.split(',') || ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN'];
    const types = searchParams.get('types')?.split(',') || ['fundamentals', 'earnings', 'news', 'recommendations', 'dividends', 'ohlcv'];
    const action = searchParams.get('action') || 'all'; // all, fundamentals, ohlcv, economic, cleanup, trending

    if (action === 'trending') {
      const trendingResult = await runTrendingCollection();
      return NextResponse.json(trendingResult, { status: 200 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      symbols,
      types,
      results: {},
    };

    // Action: Collect all data for stocks
    if (action === 'all' || action === 'stocks') {
      results.results.stocks = {};
      for (const symbol of symbols) {
        try {
          const data = await collectAllStockData(symbol);
          results.results.stocks[symbol] = data;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.results.stocks[symbol] = { error: String(error) };
        }
      }
    }

    // Action: Update OHLCV data from live quotes
    if (action === 'all' || action === 'ohlcv') {
      results.results.ohlcv = {};
      for (const symbol of symbols) {
        try {
          const quote = await getFinnhubQuote(symbol);
          if (quote) {
            // Convert quote to OHLCV format (today's data)
            const today = new Date().toISOString().split('T')[0];
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
            results.results.ohlcv[symbol] = 'Updated';
          }
        } catch (error) {
          results.results.ohlcv[symbol] = { error: String(error) };
        }
      }
    }

    // Action: Collect economic indicators
    if (action === 'all' || action === 'economic') {
      try {
        const success = await collectEconomicData();
        results.results.economic = success ? 'Collected' : 'Failed';
      } catch (error) {
        results.results.economic = { error: String(error) };
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Data collection failed',
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for scheduled data collection
 * Can be triggered by external cron services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols = ['AAPL', 'TSLA'], action = 'all' } = body;

    const results = {
      timestamp: new Date().toISOString(),
      action,
      symbols,
      status: 'Processing...',
    };

    // Delegate to GET logic
    const url = new URL(request.url);
    url.pathname = '/api/data-collection';
    url.searchParams.set('action', action);
    if (action !== 'trending') {
      url.searchParams.set('symbols', symbols.join(','));
    }

    const getRequest = new NextRequest(url, { method: 'GET' });
    return GET(getRequest);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'POST request failed',
        details: String(error),
      },
      { status: 400 }
    );
  }
}

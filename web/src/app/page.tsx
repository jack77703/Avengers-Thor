import { StockCard } from '@/components/stock-card';
import { ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getTrendingStocks, StockTwitsSymbol } from '@/lib/stocktwits';

// Helper to map StockTwits data to our Stock interface
function mapStockTwitsToStock(stStock: StockTwitsSymbol) {
  return {
    ticker: stStock.symbol,
    companyName: stStock.title,
    watchers: stStock.watchlist_count || 0,
    sentimentScore: 0, // Placeholder as trending endpoint doesn't give sentiment
    lastMentionedAt: new Date().toISOString(),
    price: stStock.price,
    percentChange: stStock.percent_change,
    rank: stStock.rank,
    rankDelta: stStock.rankDelta, // Added mapping
    trendingScore: stStock.trending_score,
    sector: stStock.sector || stStock.fundamentals?.SectorName,
    industry: stStock.industry || stStock.fundamentals?.IndustryName,
    marketCap: stStock.fundamentals?.MarketCap,
    hasNews: stStock.has_news,
    latestHeadline: stStock.latestHeadline, // Added mapping
    sentiment: stStock.sentiment,
    volume: stStock.volume,
    messageVolume: stStock.messageVolume, // Added mapping
    intradayVolatility: stStock.intraday_volatility
  };
}

import { Stock } from '@/lib/types';
import { StockDashboard } from '@/components/stock-dashboard';

export default async function Home() {
  let trendingStocks: Stock[] = [];
  let errorMsg = '';
  let marketStatus: { isOpen: boolean; message: string; lastClose?: Date } | undefined;

  try {
    const data = await getTrendingStocks();
    if (data && data.symbols) {
      trendingStocks = data.symbols.slice(0, 20).map(mapStockTwitsToStock); // Show all 20 symbols
      marketStatus = data.marketStatus;
    }
  } catch (e) {
    console.error("Failed to fetch StockTwits data", e);
    errorMsg = e instanceof Error ? e.message : 'Failed to load data';
  }

  return (
    <div className="space-y-8 px-4 sm:px-0">
      {/* Trending Stocks */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            {marketStatus && (
              <span className={`${marketStatus.isOpen ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'} text-xs font-medium px-2.5 py-0.5 rounded flex items-center gap-1`}>
                {marketStatus.isOpen && <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>}
                {marketStatus.message}
              </span>
            )}
          </div>
          <Link href="/stocks" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {trendingStocks.length > 0 ? (
          <StockDashboard initialStocks={trendingStocks} />
        ) : (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {errorMsg ? (
              <div className="text-red-500 dark:text-red-400">
                <p className="font-bold">Error loading data</p>
                <p className="text-sm mt-1">{errorMsg}</p>
                <p className="text-xs mt-2 text-gray-500">Check your internet connection or try again later.</p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Loading trending stocks...</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

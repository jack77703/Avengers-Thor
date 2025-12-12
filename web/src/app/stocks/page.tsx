import { MOCK_STOCKS } from '@/lib/mock-data';
import { StockCard } from '@/components/stock-card';
import { getTrendingStocks, StockTwitsSymbol } from '@/lib/stocktwits';
import { Stock } from '@/lib/types';
import { getStockDataForMultipleSymbols } from '@/lib/data-fetcher';

function mapStockTwitsToStock(
    stStock: StockTwitsSymbol,
    ohlcvMap: Map<string, { price: number; previousClosePrice: number; percentChange: number; volume: number }>
): Stock {
    const ohlcv = ohlcvMap.get(stStock.symbol);
    return {
        ticker: stStock.symbol,
        companyName: stStock.title,
        mentions: stStock.watchlist_count,
        sentimentScore: 0,
        lastMentionedAt: new Date().toISOString(),
        price: ohlcv?.price ?? stStock.price,
        percentChange: ohlcv?.percentChange ?? stStock.percent_change ?? stStock.percentChange,
        previousClosePrice: ohlcv?.previousClosePrice,
        volume: ohlcv?.volume ?? stStock.volume,
    };
}

export default async function StocksPage() {
    let stocks: Stock[] = [];
    try {
        const data = await getTrendingStocks();
        if (data && data.symbols) {
            const symbols = data.symbols;
            const ohlcvData = await getStockDataForMultipleSymbols(symbols.map(s => s.symbol));
            const ohlcvMap = new Map(
                ohlcvData.map(d => [d.symbol, {
                    price: d.price,
                    previousClosePrice: d.previousClosePrice,
                    percentChange: d.percentChange,
                    volume: d.volume,
                }])
            );

            stocks = symbols.map(s => mapStockTwitsToStock(s, ohlcvMap));
        }
    } catch (e) {
        console.error("Failed to fetch StockTwits data", e);
        stocks = MOCK_STOCKS; // Fallback to mock data if API fails
    }

    return (
        <div className="space-y-6 px-4 sm:px-0">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trending Stocks</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Real-time trending stocks from StockTwits.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stocks.map((stock) => (
                    <StockCard key={stock.ticker} stock={stock} />
                ))}
            </div>
        </div>
    );
}

export interface StockTwitsSymbol {
    id: number;
    symbol: string;
    title: string;
    aliases: string[];
    is_following: boolean;
    watchlist_count: number;
    percent_change?: number; // Added for UI demonstration
    percentChange?: number; // Optional camelCase variant
    price?: number; // Enriched with quote
    rank?: number;
    rankDelta?: number; // Enriched delta vs previous rank
    trending_score?: number;
    previousClosePrice?: number; // From quote enrichment
    sector?: string;
    industry?: string;
    fundamentals?: {
        MarketCap?: number;
        SectorName?: string;
        IndustryName?: string;
    };
    has_news?: boolean;
    sentiment?: {
        bullish: number;
        bearish: number;
    };
    volume?: number;
    intraday_volatility?: number;
    latestHeadline?: string; // Latest news headline
    messageVolume?: number; // Enriched message volume
}

export interface StockTwitsMessage {
    id: number;
    body: string;
    created_at: string;
    user: {
        id: number;
        username: string;
        name: string;
        avatar_url: string;
    };
    source: {
        id: number;
        title: string;
        url: string;
    };
    symbols: StockTwitsSymbol[];
    entities?: {
        sentiment?: {
            basic: 'Bullish' | 'Bearish';
        };
    };
}

export interface StockTwitsTrendingResponse {
    response: {
        status: number;
    };
    symbols: (StockTwitsSymbol & {
        sentiment?: 'Bullish' | 'Bearish' | null; // Derived field we might add
        message_volume?: number; // Derived or fetched separately
    })[];
    marketStatus?: {
        isOpen: boolean;
        message: string;
        lastClose?: Date;
    };
}

import { saveTrendingData, calculateZScoreAsync, getVolumeHistoryAsync, getPreviousRankAsync } from './storage';
import { getFinnhubQuote } from './finnhub'; // getCompanyNews removed - news disabled to save API quota
import { getMarketStatus, getOptimalCacheDuration } from './market-hours';

// Helper to fetch sentiment AND extended data from StockTwits streams
async function getStockTwitsExtendedData(symbol: string) {
    try {
        const res = await fetch(`https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 120 } // Cache for 2 mins to avoid rate limits
        });

        if (!res.ok) return null;
        const data = await res.json();
        const messages = data.messages || [];
        const symbolData = data.symbol; // Extract symbol metadata

        let bullish = 0;
        let bearish = 0;

        messages.forEach((msg: any) => {
            const s = msg.entities?.sentiment?.basic;
            if (s === 'Bullish') bullish++;
            if (s === 'Bearish') bearish++;
        });

        const total = bullish + bearish;

        // MINIMUM THRESHOLD: Only return sentiment if we have at least 10 tagged messages
        // This prevents misleading 100% signals from tiny samples (2-3 posts)
        const MIN_SENTIMENT_MESSAGES = 10;

        return {
            sentiment: total >= MIN_SENTIMENT_MESSAGES ? {
                bullishPercent: bullish / total,
                bearishPercent: bearish / total
            } : undefined,
            extended: {
                price: symbolData?.price,
                volume: symbolData?.volume,
                prevClose: symbolData?.previous_close
            }
        };
    } catch (e) {
        console.error(`Failed to fetch extended data for ${symbol}`, e);
        return null;
    }
}

export async function getTrendingStocks() {
    // Smart caching based on market hours
    const cacheDuration = getOptimalCacheDuration();

    const res = await fetch('https://api.stocktwits.com/api/2/trending/symbols.json', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        next: { revalidate: cacheDuration }, // Dynamic cache: 5 min (open) or 1 hour (closed)
    });

    if (!res.ok) {
        throw new Error('Failed to fetch trending stocks from StockTwits');
    }

    const data = await res.json();

    // Enrich with real-time quotes, news, and sentiment
    if (data.symbols) {
        // We only fetch quotes for the top 20 to avoid hitting rate limits too hard/fast
        // and to keep page load reasonable.
        const symbolsToFetch = data.symbols.slice(0, 20);

        // Fetch quotes and extended data in parallel (NEWS DISABLED to save API quota)
        const [quotes, extendedResults] = await Promise.all([
            Promise.all(symbolsToFetch.map((s: any) => getFinnhubQuote(s.symbol))),
            Promise.all(symbolsToFetch.map((s: any) => getStockTwitsExtendedData(s.symbol))) // Use StockTwits for sentiment & fallback data
        ]);

        // Map quotes back to symbols
        const quoteMap = new Map(quotes.map((q, i) => [symbolsToFetch[i].symbol, q]));
        const extendedMap = new Map(extendedResults.map((e, i) => [symbolsToFetch[i].symbol, e]));

        // Use Promise.all to fetch all historical data concurrently
        const enrichedSymbols = await Promise.all(data.symbols.map(async (s: any, index: number) => {
            const quote = quoteMap.get(s.symbol);
            const extendedData = extendedMap.get(s.symbol);
            const sentiment = extendedData?.sentiment;

            // Fallback Logic: Use Finnhub first, then StockTwits Extended
            const finalPrice = quote?.price || extendedData?.extended?.price || 0;
            const finalVolume = quote?.volume || extendedData?.extended?.volume || 0;

            // Calculate % change fallback if needed
            let finalPercentChange = quote ? parseFloat(quote.percentChange.toFixed(2)) : 0;
            if (!quote && extendedData?.extended?.price && extendedData?.extended?.prevClose) {
                finalPercentChange = ((extendedData.extended.price - extendedData.extended.prevClose) / extendedData.extended.prevClose) * 100;
            }

            let volatility = 0;
            if (quote && quote.open > 0) {
                volatility = (quote.high - quote.low) / quote.open;
            }

            // Calculate real metrics from history using ASYNC Supabase functions
            const [realZScore, realHistory, prevRank] = await Promise.all([
                calculateZScoreAsync(s.symbol, s.watchlist_count),
                getVolumeHistoryAsync(s.symbol),
                getPreviousRankAsync(s.symbol)
            ]);

            const rankDelta = prevRank ? (prevRank - (index + 1)) : 0; // Positive = Improved rank (e.g. 5 -> 2 = +3)

            return {
                ...s,
                // Use real quote if available, otherwise fallback to 0
                price: finalPrice,
                percentChange: parseFloat(finalPercentChange.toFixed(2)),
                previousClosePrice: quote?.previousClosePrice || 0,
                rank: index + 1,
                rankDelta: rankDelta,
                has_news: false, // News disabled to save API quota
                sentiment: sentiment ? {
                    bullish: sentiment.bullishPercent,
                    bearish: sentiment.bearishPercent
                } : undefined,
                volume: finalVolume,
                intraday_volatility: volatility,

                // Advanced Metrics (Real)
                messageVolume: s.watchlist_count,
                messageVolumeHistory: realHistory.length > 0 ? realHistory : Array.from({ length: 24 }, () => s.watchlist_count), // Fallback to flat line if no history
                zScore: realZScore,
                newsImpact: 'None', // News disabled
                latestHeadline: undefined, // News disabled
                lastUpdated: new Date().toISOString(),
                confidence: 0.95
            };
        }));

        // Assign enriched symbols back to data
        data.symbols = enrichedSymbols;
    }

    // Save data synchronously to ensure it happens
    try {
        await saveTrendingData(data);
    } catch (err) {
        console.error("Save failed:", err);
    }

    // Attach market status to response for UI
    const marketStatus = getMarketStatus();
    return {
        ...data,
        marketStatus
    };
}

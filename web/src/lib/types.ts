export interface KOL {
    id: string;
    username: string;
    name: string;
    description: string;
    avatarUrl: string;
    followers: number;
}

export interface Tweet {
    id: string;
    kolId: string;
    text: string;
    createdAt: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    stocks: string[];
    likes: number;
    retweets: number;
}

export interface Stock {
    ticker: string;
    companyName: string;
    watchers: number;
    sentimentScore: number; // -1 to 1
    lastMentionedAt: string;
    price?: number;
    percentChange?: number;
    previousClosePrice?: number; // Yesterday's close price for accurate percentage calculation
    messageVolume?: number; // StockTwits message volume (last 24h or current stream count)
    messageVolumeHistory?: number[]; // For sparkline (mock/real)
    zScore?: number; // 24h delta mentions z-score
    latestHeadline?: string; // Added for tooltip
    lastUpdated?: string; // ISO timestamp
    confidence?: number; // 0-1 source confidence
    hasNews?: boolean;
    sentiment?: {
        bullish: number;
        bearish: number;
    };
    rank?: number;
    rankDelta?: number; // Added for Rank Delta
    trendingScore?: number;
    sector?: string;
    industry?: string;
    marketCap?: number;
    volume?: number;
    intradayVolatility?: number; // Calculated as (High - Low) / Open

    // Advanced Metrics
    messageVolume?: number; // StockTwits message volume (last 24h or current stream count)
    messageVolumeHistory?: number[]; // For sparkline (mock/real)
    zScore?: number; // 24h delta mentions z-score
    newsImpact?: 'High' | 'Medium' | 'Low' | 'None';
    lastUpdated?: string; // ISO timestamp
    confidence?: number; // 0-1 source confidence
}

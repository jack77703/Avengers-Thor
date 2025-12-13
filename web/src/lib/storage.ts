import { supabase } from './supabase';
import { StockTwitsTrendingResponse, StockTwitsSymbol } from './stocktwits';

// --- Types ---
export interface HistorySnapshot {
    timestamp: number;
    messageVolume: number;
    price: number;
    sentiment?: number;
    rank?: number;
}

export interface StockHistory {
    symbol: string;
    snapshots: HistorySnapshot[];
}

// --- Public API ---

export async function saveTrendingData(data: StockTwitsTrendingResponse) {
    if (!data.symbols) return;

    const now = Date.now();

    // Prepare batch insert data with trending score
    const snapshots = data.symbols.map((stock: StockTwitsSymbol) => ({
        symbol: stock.symbol,
        price: stock.price || null,
        percent_change: stock.percentChange || null,
        volume: stock.volume || null,
        message_volume: stock.watchlist_count || null,
        rank: stock.rank || null,
        trending_score: stock.trending_score || null, // Added for momentum tracking
        timestamp: now
    }));

    try {
        // Insert all snapshots in one batch
        const { error } = await supabase
            .from('stock_snapshots')
            .insert(snapshots);

        if (error) {
            console.error('Failed to save snapshots to Supabase:', error);
        }
    } catch (e) {
        console.error('Supabase insert error:', e);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateZScore(_symbol: string, _currentVolume: number): number {
    // Z-Score calculation will need to fetch from Supabase
    // For now, return 0 until we implement async version
    return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getVolumeHistory(_symbol: string): number[] {
    // Volume history will need to fetch from Supabase
    // For now, return empty array until we implement async version
    return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getPreviousRank(_symbol: string): number | null {
    // Previous rank will need to fetch from Supabase
    // For now, return null until we implement async version
    return null;
}

// --- New Async Versions for Supabase ---

export async function calculateZScoreAsync(symbol: string, currentVolume: number): Promise<number> {
    try {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('message_volume')
            .eq('symbol', symbol)
            .gte('timestamp', oneDayAgo)
            .order('timestamp', { ascending: false });

        if (error || !data || data.length === 0) return 0;

        const volumes = data.map(d => d.message_volume || 0);
        const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const variance = volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;
        const stdDev = Math.sqrt(variance);

        return stdDev === 0 ? 0 : (currentVolume - mean) / stdDev;
    } catch (e) {
        console.error('Z-Score calculation error:', e);
        return 0;
    }
}

export async function getVolumeHistoryAsync(symbol: string): Promise<number[]> {
    try {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('message_volume, timestamp')
            .eq('symbol', symbol)
            .gte('timestamp', oneDayAgo)
            .order('timestamp', { ascending: true })
            .limit(24);

        if (error || !data) return [];

        return data.map(d => d.message_volume || 0);
    } catch (e) {
        console.error('Volume history fetch error:', e);
        return [];
    }
}

export async function getPreviousRankAsync(symbol: string): Promise<number | null> {
    try {
        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('rank, timestamp')
            .eq('symbol', symbol)
            .order('timestamp', { ascending: false })
            .limit(2);

        if (error || !data || data.length < 2) return null;

        return data[1].rank;
    } catch (e) {
        console.error('Previous rank fetch error:', e);
        return null;
    }
}

// --- Momentum Tracking Functions ---

export interface MomentumMetrics {
    positionStability: {
        hoursInTop20: number;
        avgRank: number;
        isNew: boolean; // Just appeared in last hour
    };
    scoreTrend: {
        current: number;
        hourlyChange: number;
        dailyChange: number;
        direction: 'rising' | 'falling' | 'stable';
        sparkline: number[]; // Last 6 hours of scores
    };
    watchlistVelocity: {
        currentCount: number;
        hourlyGrowth: number;
        dailyGrowth: number;
        growthRate: number; // Percentage per hour
    };
}

export async function getMomentumMetrics(symbol: string): Promise<MomentumMetrics | null> {
    try {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const sixHoursAgo = now - (6 * 60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        // Fetch all data in one query
        const { data, error } = await supabase
            .from('stock_snapshots')
            .select('*')
            .eq('symbol', symbol)
            .gte('timestamp', oneDayAgo)
            .order('timestamp', { ascending: true });

        if (error || !data || data.length === 0) return null;

        const current = data[data.length - 1];
        const oneHourAgoData = data.find(d => d.timestamp >= oneHourAgo);
        const oneDayAgoData = data[0];

        // 1. Position Stability
        const hoursInTop20 = (data.length * 5) / 60; // Each snapshot is ~5 min apart
        const avgRank = data.reduce((sum, d) => sum + (d.rank || 99), 0) / data.length;
        const isNew = hoursInTop20 < 1;

        // 2. Score Trend
        const currentScore = current.trending_score || 0;
        const hourlyChange = oneHourAgoData
            ? currentScore - (oneHourAgoData.trending_score || 0)
            : 0;
        const dailyChange = currentScore - (oneDayAgoData.trending_score || 0);

        let direction: 'rising' | 'falling' | 'stable' = 'stable';
        if (hourlyChange > 2) direction = 'rising';
        else if (hourlyChange < -2) direction = 'falling';

        // Sparkline: Last 6 hours (every hour = 12 snapshots)
        const sixHourData = data.filter(d => d.timestamp >= sixHoursAgo);
        const sparkline = [];
        for (let i = 0; i < 6; i++) {
            const hourStart = sixHoursAgo + (i * 60 * 60 * 1000);
            const hourEnd = hourStart + (60 * 60 * 1000);
            const hourData = sixHourData.filter(d => d.timestamp >= hourStart && d.timestamp < hourEnd);
            const avgScore = hourData.length > 0
                ? hourData.reduce((sum, d) => sum + (d.trending_score || 0), 0) / hourData.length
                : 0;
            sparkline.push(Math.round(avgScore));
        }

        // 3. Watchlist Velocity
        const currentCount = current.message_volume || 0;
        const hourlyGrowth = oneHourAgoData
            ? currentCount - (oneHourAgoData.message_volume || 0)
            : 0;
        const dailyGrowth = currentCount - (oneDayAgoData.message_volume || 0);
        const growthRate = oneHourAgoData && oneHourAgoData.message_volume
            ? (hourlyGrowth / oneHourAgoData.message_volume) * 100
            : 0;

        return {
            positionStability: {
                hoursInTop20,
                avgRank,
                isNew
            },
            scoreTrend: {
                current: currentScore,
                hourlyChange,
                dailyChange,
                direction,
                sparkline
            },
            watchlistVelocity: {
                currentCount,
                hourlyGrowth,
                dailyGrowth,
                growthRate
            }
        };
    } catch (e) {
        console.error(`Failed to get momentum metrics for ${symbol}:`, e);
        return null;
    }
}

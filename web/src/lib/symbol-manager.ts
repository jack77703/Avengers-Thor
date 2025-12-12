/**
 * Smart Symbol Management with 3-Dimension Trending
 * 
 * Calculates trending strength across 3 timeframes:
 * - Real-time: Current rank in trending list
 * - 6-hour: Average score over last 6 hours
 * - 24-hour: Average score over last 24 hours
 * 
 * Approach B: Only record symbols when they're in trending list (no zeros)
 */

import { supabase } from './supabase';

export interface TrendingSnapshot {
  symbol: string;
  rank: number;
  trendingScore: number;
  messageVolume?: number;
  bullishCount?: number;
  bearishCount?: number;
  watchlistCount?: number;
}

export interface TrendingDimensions {
  symbol: string;
  
  // Real-time dimension (current status)
  realTime: {
    rank: number;
    score: number;
    isCurrentlyTrending: boolean; // In top 30 right now
    lastSeen: Date;
  };
  
  // 6-hour dimension (sustained momentum)
  sixHour: {
    avgScore: number;
    avgRank: number;
    snapshotCount: number;
    trend: 'up' | 'down' | 'stable'; // Compared to 24h
    volatility: number; // Standard deviation of scores
  };
  
  // 24-hour dimension (long-term interest)
  twentyFourHour: {
    avgScore: number;
    avgRank: number;
    peakScore: number;
    peakTime: Date;
    snapshotCount: number;
    consistency: number; // How often appeared in trending (0-100)
  };
  
  // Decision: Keep in dashboard?
  keepSymbol: boolean;
  keepReason: string;
}

/**
 * Save trending snapshots from StockTwits
 * Only records symbols currently in trending list (Approach B: No zeros)
 */
export async function saveTrendingSnapshots(snapshots: TrendingSnapshot[]): Promise<boolean> {
  if (snapshots.length === 0) return true;

  try {
    const records = snapshots.map(s => ({
      symbol: s.symbol,
      rank: s.rank,
      trending_score: s.trendingScore,
      message_volume: s.messageVolume,
      bullish_count: s.bullishCount,
      bearish_count: s.bearishCount,
      watchlist_count: s.watchlistCount,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('stock_trending_snapshots')
      .insert(records);

    if (error) throw error;
    console.log(`✅ Saved ${snapshots.length} trending snapshots`);
    return true;
  } catch (error) {
    console.error('Error saving trending snapshots:', error);
    return false;
  }
}

/**
 * Calculate trending dimensions for a symbol
 * Returns real-time, 6-hour, and 24-hour metrics
 */
export async function calculateTrendingDimensions(symbol: string): Promise<TrendingDimensions | null> {
  try {
    const now = new Date();
    const sixHourAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch all snapshots for this symbol in last 24 hours
    const { data: allSnapshots, error } = await supabase
      .from('stock_trending_snapshots')
      .select('*')
      .eq('symbol', symbol)
      .gte('created_at', twentyFourHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error || !allSnapshots || allSnapshots.length === 0) {
      console.warn(`No trending data found for ${symbol}`);
      return null;
    }

    // Split by time window
    const sixHourSnapshots = allSnapshots.filter(
      s => new Date(s.created_at) >= sixHourAgo
    );

    // Real-time (most recent)
    const latest = allSnapshots[0];
    const realTime = {
      rank: latest.rank,
      score: latest.trending_score,
      isCurrentlyTrending: true, // It's in our snapshots, so it's trending
      lastSeen: new Date(latest.created_at),
    };

    // 6-hour calculations
    const sixHourScores = sixHourSnapshots.map(s => s.trending_score);
    const sixHourAvgScore = sixHourScores.length > 0
      ? sixHourScores.reduce((a, b) => a + b, 0) / sixHourScores.length
      : 0;
    const sixHourAvgRank = sixHourSnapshots.length > 0
      ? sixHourSnapshots.map(s => s.rank).reduce((a, b) => a + b, 0) / sixHourSnapshots.length
      : latest.rank;
    const sixHourVolatility = calculateStdDev(sixHourScores);

    // 24-hour calculations
    const allScores = allSnapshots.map(s => s.trending_score);
    const twentyFourHourAvgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const twentyFourHourAvgRank = allSnapshots.map(s => s.rank).reduce((a, b) => a + b, 0) / allSnapshots.length;
    const peakScore = Math.max(...allScores);
    const peakSnapshot = allSnapshots.find(s => s.trending_score === peakScore);

    // Consistency: How often did it appear in trending?
    // If max 30 fetches/hour, 24h = 720 possible snapshots
    // consistency = (actual snapshots / possible snapshots) * 100
    const possibleSnapshots = 720; // Rough estimate
    const consistency = Math.min(100, (allSnapshots.length / possibleSnapshots) * 100);

    // Determine trend direction (6h vs 24h)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (sixHourAvgScore > twentyFourHourAvgScore * 1.1) {
      trend = 'up';
    } else if (sixHourAvgScore < twentyFourHourAvgScore * 0.9) {
      trend = 'down';
    }

    // Decision: Keep symbol?
    let keepSymbol = false;
    let keepReason = '';

    if (realTime.isCurrentlyTrending) {
      keepSymbol = true;
      keepReason = 'Currently in top 30';
    } else if (sixHourAvgScore > 50) {
      keepSymbol = true;
      keepReason = '6h avg score > 50';
    } else if (twentyFourHourAvgScore > 40) {
      keepSymbol = true;
      keepReason = '24h avg score > 40';
    } else {
      keepReason = 'Below threshold';
    }

    return {
      symbol,
      realTime,
      sixHour: {
        avgScore: sixHourAvgScore,
        avgRank: sixHourAvgRank,
        snapshotCount: sixHourSnapshots.length,
        trend,
        volatility: sixHourVolatility,
      },
      twentyFourHour: {
        avgScore: twentyFourHourAvgScore,
        avgRank: twentyFourHourAvgRank,
        peakScore,
        peakTime: peakSnapshot ? new Date(peakSnapshot.created_at) : new Date(),
        snapshotCount: allSnapshots.length,
        consistency,
      },
      keepSymbol,
      keepReason,
    };
  } catch (error) {
    console.error(`Error calculating dimensions for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get stable symbols based on 3-dimension trending
 * Returns symbols to display in dashboard
 */
export async function getStableSymbols(currentTrendingSymbols: string[]): Promise<string[]> {
  try {
    const dimensions = await Promise.all(
      currentTrendingSymbols.map(s => calculateTrendingDimensions(s))
    );

    const stableSymbols = dimensions
      .filter((d): d is TrendingDimensions => d !== null && d.keepSymbol)
      .sort((a, b) => b.sixHour.avgScore - a.sixHour.avgScore)
      .map(d => d.symbol);

    console.log(`\n📊 Stable symbols (${stableSymbols.length}):`);
    stableSymbols.forEach(s => console.log(`   ${s}`));
    console.log('');

    return stableSymbols;
  } catch (error) {
    console.error('Error getting stable symbols:', error);
    return currentTrendingSymbols; // Fallback
  }
}

/**
 * Get detailed trending metrics for all symbols
 */
export async function getAllTrendingMetrics(symbols: string[]): Promise<TrendingDimensions[]> {
  const metrics = await Promise.all(
    symbols.map(s => calculateTrendingDimensions(s))
  );

  return metrics.filter((m): m is TrendingDimensions => m !== null);
}

/**
 * Helper: Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Clean up old snapshots (older than 30 days)
 */
export async function cleanupOldSnapshots(daysToKeep: number = 30): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await supabase
      .from('stock_trending_snapshots')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    console.log(`✅ Cleaned up snapshots older than ${daysToKeep} days`);
    return true;
  } catch (error) {
    console.error('Error cleaning up snapshots:', error);
    return false;
  }
}

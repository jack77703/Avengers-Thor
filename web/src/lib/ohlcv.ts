import { supabase } from './supabase';

export interface OHLCVData {
    id?: number;
    symbol: string;
    date: string; // YYYY-MM-DD format
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
    previous_close?: number;
    percent_change?: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Fetch OHLC data for a symbol within a date range
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * @returns Array of OHLCV records
 */
export async function getOHLCVData(
    symbol: string,
    fromDate: string,
    toDate: string
): Promise<OHLCVData[]> {
    try {
        const { data, error } = await supabase
            .from('stock_ohlcv')
            .select('*')
            .eq('symbol', symbol)
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true });

        if (error) {
            console.error(`Failed to fetch OHLCV for ${symbol}:`, error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error(`Error fetching OHLCV data for ${symbol}:`, error);
        return [];
    }
}

/**
 * Fetch latest OHLCV record for a symbol
 * @param symbol - Stock symbol
 * @returns Latest OHLCV record or null
 */
export async function getLatestOHLCVData(symbol: string): Promise<OHLCVData | null> {
    try {
        const { data, error } = await supabase
            .from('stock_ohlcv')
            .select('*')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error(`Failed to fetch latest OHLCV for ${symbol}:`, error);
            return null;
        }

        return data || null;
    } catch (error) {
        console.error(`Error fetching latest OHLCV for ${symbol}:`, error);
        return null;
    }
}

/**
 * Save/Update OHLCV data for a symbol on a specific date
 * @param ohlcvData - OHLCV data to save
 */
export async function saveOHLCVData(ohlcvData: OHLCVData): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('stock_ohlcv')
            .upsert(
                {
                    symbol: ohlcvData.symbol,
                    date: ohlcvData.date,
                    open_price: ohlcvData.open_price,
                    high_price: ohlcvData.high_price,
                    low_price: ohlcvData.low_price,
                    close_price: ohlcvData.close_price,
                    volume: ohlcvData.volume,
                    previous_close: ohlcvData.previous_close,
                    percent_change: ohlcvData.percent_change,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'symbol,date' }
            );

        if (error) {
            console.error(`Failed to save OHLCV for ${ohlcvData.symbol}:`, error);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error saving OHLCV data:`, error);
        return false;
    }
}

/**
 * Save OHLCV data for multiple symbols
 * @param ohlcvDataArray - Array of OHLCV data
 */
export async function saveBatchOHLCVData(ohlcvDataArray: OHLCVData[]): Promise<boolean> {
    if (ohlcvDataArray.length === 0) return true;

    try {
        const { error } = await supabase
            .from('stock_ohlcv')
            .upsert(
                ohlcvDataArray.map(data => ({
                    symbol: data.symbol,
                    date: data.date,
                    open_price: data.open_price,
                    high_price: data.high_price,
                    low_price: data.low_price,
                    close_price: data.close_price,
                    volume: data.volume,
                    previous_close: data.previous_close,
                    percent_change: data.percent_change,
                    updated_at: new Date().toISOString(),
                })),
                { onConflict: 'symbol,date' }
            );

        if (error) {
            console.error('Failed to save batch OHLCV data:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error saving batch OHLCV data:', error);
        return false;
    }
}

/**
 * Update today's OHLCV with latest Finnhub quote data
 * This should be called throughout the trading day to update high/low/volume
 * @param symbol - Stock symbol
 * @param quoteData - Quote data from Finnhub API
 */
export async function updateDailyOHLCVFromQuote(
    symbol: string,
    quoteData: {
        price: number;
        high: number;
        low: number;
        open: number;
        volume: number;
        previousClosePrice: number;
    }
): Promise<boolean> {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Get existing record for today
        const { data: existingData, error: fetchError } = await supabase
            .from('stock_ohlcv')
            .select('*')
            .eq('symbol', symbol)
            .eq('date', today)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(`Error fetching today's OHLCV for ${symbol}:`, fetchError);
            return false;
        }

        const ohlcvData: OHLCVData = {
            symbol,
            date: today,
            open_price: existingData?.open_price || quoteData.open,
            high_price: Math.max(existingData?.high_price || quoteData.high, quoteData.high),
            low_price: Math.min(existingData?.low_price || quoteData.low, quoteData.low),
            close_price: quoteData.price,
            volume: quoteData.volume,
            previous_close: quoteData.previousClosePrice,
            percent_change: quoteData.previousClosePrice > 0
                ? ((quoteData.price - quoteData.previousClosePrice) / quoteData.previousClosePrice) * 100
                : 0,
        };

        return await saveOHLCVData(ohlcvData);
    } catch (error) {
        console.error(`Error updating daily OHLCV for ${symbol}:`, error);
        return false;
    }
}

/**
 * Fetch OHLCV data for multiple symbols at once
 * @param symbols - Array of stock symbols
 * @param date - Specific date (YYYY-MM-DD) or 'latest' for most recent
 */
export async function getBatchOHLCVData(
    symbols: string[],
    date: string = 'latest'
): Promise<Map<string, OHLCVData>> {
    const resultMap = new Map<string, OHLCVData>();

    try {
        if (date === 'latest') {
            // Get the latest record for each symbol
            for (const symbol of symbols) {
                const data = await getLatestOHLCVData(symbol);
                if (data) {
                    resultMap.set(symbol, data);
                }
            }
        } else {
            // Get data for a specific date
            const { data, error } = await supabase
                .from('stock_ohlcv')
                .select('*')
                .in('symbol', symbols)
                .eq('date', date);

            if (error) {
                console.error(`Failed to fetch batch OHLCV data for ${date}:`, error);
                return resultMap;
            }

            if (data) {
                data.forEach(record => {
                    resultMap.set(record.symbol, record);
                });
            }
        }

        return resultMap;
    } catch (error) {
        console.error('Error fetching batch OHLCV data:', error);
        return resultMap;
    }
}

/**
 * Delete old OHLCV data (older than specified days)
 * @param daysToKeep - Number of days to keep (default: 365 days / 1 year)
 */
export async function deleteOldOHLCVData(daysToKeep: number = 365): Promise<boolean> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const { error } = await supabase
            .from('stock_ohlcv')
            .delete()
            .lt('date', cutoffDateStr);

        if (error) {
            console.error('Failed to delete old OHLCV data:', error);
            return false;
        }

        console.log(`Deleted OHLCV data older than ${cutoffDateStr}`);
        return true;
    } catch (error) {
        console.error('Error deleting old OHLCV data:', error);
        return false;
    }
}

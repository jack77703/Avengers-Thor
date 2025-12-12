import { NextResponse } from 'next/server';
import { getTrendingStocks } from '@/lib/stocktwits';
import { saveTrendingData } from '@/lib/storage';

export async function GET() {
    try {
        const data = await getTrendingStocks();

        // Save data for future use
        await saveTrendingData(data);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching StockTwits data:', error);
        return NextResponse.json({ error: 'Failed to fetch trending stocks' }, { status: 500 });
    }
}

export interface FinnhubQuote {
    c: number; // Current price
    d: number; // Change
    dp: number; // Percent change
    h: number; // High price of the day
    l: number; // Low price of the day
    o: number; // Open price of the day
    pc: number; // Previous close price
    t: number;
    v: number; // Volume
}

// ... (FinnhubNewsItem and FinnhubSentiment interfaces remain unchanged)

export async function getFinnhubQuote(symbol: string): Promise<{
    percentChange: number;
    price: number;
    high: number;
    low: number;
    open: number;
    previousClosePrice: number;
    volume: number;
} | null> {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        console.warn('FINNHUB_API_KEY is not set');
        return null;
    }

    try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
        // console.log(`Fetching: ${url.replace(apiKey, 'HIDDEN')}`); 

        const res = await fetch(url, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            console.error(`Failed to fetch Finnhub quote for ${symbol}: ${res.status}`);
            return null;
        }

        const data: FinnhubQuote = await res.json();
        // console.log(`Finnhub response for ${symbol}:`, JSON.stringify(data));

        // Finnhub returns 0 for everything if symbol not found
        if (data.c === 0 && data.pc === 0) {
            console.warn(`Finnhub returned 0s for ${symbol}`);
            return null;
        }

        let percentChange = data.dp;

        // Fallback: Calculate manually if dp is missing but we have prices
        if (percentChange === null || percentChange === undefined) {
            if (data.pc && data.pc !== 0) {
                percentChange = ((data.c - data.pc) / data.pc) * 100;
            } else {
                percentChange = 0;
            }
        }

        return {
            percentChange: percentChange,
            price: data.c,
            high: data.h,
            low: data.l,
            open: data.o,
            previousClosePrice: data.pc,
            volume: data.v
        };
    } catch (error) {
        console.error(`Error fetching Finnhub quote for ${symbol}:`, error);
        return null;
    }
}

export interface FinnhubNewsItem {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

export async function getCompanyNews(symbol: string): Promise<FinnhubNewsItem[]> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return [];

    // Get dates for last 24 hours
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const from = yesterday.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    try {
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`, {
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!res.ok) {
            console.error(`Finnhub news fetch failed for ${symbol}: ${res.status}`);
            return [];
        }

        const data: FinnhubNewsItem[] = await res.json();
        // console.log(`News for ${symbol}: ${data.length} items`);
        return data.slice(0, 3); // Return top 3 recent news
    } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error);
        return [];
    }
}

export interface FinnhubSentiment {
    buzz: {
        articlesInLastWeek: number;
        buzz: number;
        weeklyAverage: number;
    };
    companyNewsScore: number;
    sectorAverageBullishPercent: number;
    sectorAverageNewsScore: number;
    sentiment: {
        bearishPercent: number;
        bullishPercent: number;
    };
    symbol: string;
}

export async function getSentiment(symbol: string): Promise<FinnhubSentiment | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return null;

    try {
        const res = await fetch(`https://finnhub.io/api/v1/news-sentiment?symbol=${symbol}&token=${apiKey}`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data;
    } catch (error) {
        console.error(`Error fetching sentiment for ${symbol}:`, error);
        return null;
    }
}



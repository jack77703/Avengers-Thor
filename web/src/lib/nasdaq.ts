export interface NasdaqQuote {
    symbol: string;
    percentChange: string;
    lastPrice: string;
}

export async function getNasdaqQuote(symbol: string): Promise<NasdaqQuote | null> {
    try {
        // Nasdaq requires a User-Agent header
        const res = await fetch(`https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            next: { revalidate: 60 }, // Cache for 1 minute
        });

        if (!res.ok) {
            console.error(`Failed to fetch quote for ${symbol}: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json();

        if (!data?.data?.primaryData) {
            return null;
        }

        return {
            symbol: symbol,
            percentChange: data.data.primaryData.percentageChange?.replace('%', '') || '0.00',
            lastPrice: data.data.primaryData.lastSalePrice || '0.00'
        };
    } catch (error) {
        console.error(`Error fetching Nasdaq quote for ${symbol}:`, error);
        return null;
    }
}

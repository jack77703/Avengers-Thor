import { KOL, Tweet, Stock } from './types';

export const MOCK_KOLS: KOL[] = [
    {
        id: '1',
        username: 'unusual_whales',
        name: 'Unusual Whales',
        description: 'Tracking unusual options activity and dark pool prints.',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1410016944677236741/1_1_1_1_400x400.jpg', // Placeholder
        followers: 1200000,
    },
    {
        id: '2',
        username: 'FlowAlgo',
        name: 'FlowAlgo',
        description: 'Smart money flow and dark pool data.',
        avatarUrl: '',
        followers: 150000,
    },
    {
        id: '3',
        username: 'CheddarFlow',
        name: 'Cheddar Flow',
        description: 'Real-time options order flow.',
        avatarUrl: '',
        followers: 80000,
    },
];

const STOCKS = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'SPY', 'QQQ', 'MSFT', 'AMZN'];

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomTweet(kol: KOL): Tweet {
    const stock = STOCKS[getRandomInt(0, STOCKS.length - 1)];
    const isBullish = Math.random() > 0.4;
    const sentiment = isBullish ? 'bullish' : 'bearish';
    const type = Math.random() > 0.5 ? 'Call' : 'Put';
    const strike = Math.floor(Math.random() * 500) + 100;
    const date = new Date();
    date.setMinutes(date.getMinutes() - getRandomInt(1, 120));

    const templates = [
        `$${stock} ${type} Sweep: ${getRandomInt(100, 5000)} contracts at $${strike} Strike. Expiring next week. Big money flowing in.`,
        `Dark Pool Print: $${stock} ${getRandomInt(1, 10)}M shares traded at $${getRandomInt(100, 800)}.`,
        `Unusual activity detected in $${stock}. ${type}s are being bought aggressively.`,
        `$${stock} seeing massive bullish flow today. Premium: $${getRandomInt(1, 10)}M.`,
    ];

    return {
        id: Math.random().toString(36).substring(7),
        kolId: kol.id,
        text: templates[getRandomInt(0, templates.length - 1)],
        createdAt: date.toISOString(),
        sentiment,
        stocks: [stock],
        likes: getRandomInt(10, 5000),
        retweets: getRandomInt(5, 1000),
    };
}

export const MOCK_TWEETS: Tweet[] = MOCK_KOLS.flatMap((kol) =>
    Array.from({ length: 5 }).map(() => generateRandomTweet(kol))
).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const MOCK_STOCKS: Stock[] = STOCKS.map(ticker => {
    const mentions = getRandomInt(5, 50);
    return {
        ticker,
        companyName: ticker, // Simplified
        watchers: mentions,
        sentimentScore: (Math.random() * 2) - 1,
        lastMentionedAt: new Date().toISOString(),
    };
}).sort((a, b) => b.watchers - a.watchers);

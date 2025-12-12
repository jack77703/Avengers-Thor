import { Stock } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, Minus, Clock, Moon, Sun } from 'lucide-react';

interface StockCardProps {
    stock: Stock;
}

// Determine market session based on NY time
type MarketSession = 'pre-market' | 'regular' | 'after-hours' | 'closed';

function getMarketSession(): MarketSession {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay();
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Weekend = closed
    if (day === 0 || day === 6) return 'closed';

    const preMarketStart = 4 * 60;    // 4:00 AM
    const marketOpen = 9 * 60 + 30;   // 9:30 AM
    const marketClose = 16 * 60;      // 4:00 PM
    const afterHoursEnd = 20 * 60;    // 8:00 PM

    if (currentMinutes >= preMarketStart && currentMinutes < marketOpen) return 'pre-market';
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) return 'regular';
    if (currentMinutes >= marketClose && currentMinutes < afterHoursEnd) return 'after-hours';
    return 'closed';
}

export function StockCard({ stock }: StockCardProps) {
    const session = getMarketSession();

    // Format Market Cap
    const formatMarketCap = (cap?: number) => {
        if (!cap) return 'N/A';
        if (cap >= 1000000) return `$${(cap / 1000000).toFixed(1)}T`;
        if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}B`;
        return `$${cap.toFixed(1)}M`;
    };

    // Session display config
    const sessionConfig = {
        'pre-market': { label: 'Pre-Mkt', icon: Sun, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' },
        'regular': { label: 'Today', icon: null, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
        'after-hours': { label: 'After-Hrs', icon: Moon, color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30' },
        'closed': { label: 'Closed', icon: Clock, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' }
    };

    const currentSession = sessionConfig[session];
    const SessionIcon = currentSession.icon;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Rank Badge - Top Left Corner */}
            {stock.rank && (
                <div className="absolute top-0 left-0 flex items-center">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-br-lg">
                        #{stock.rank}
                    </span>
                    {stock.rankDelta !== undefined && stock.rankDelta !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-1 ${stock.rankDelta > 0
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'}`}>
                            {stock.rankDelta > 0 ? `↑${stock.rankDelta}` : `↓${Math.abs(stock.rankDelta)}`}
                        </span>
                    )}
                </div>
            )}

            {/* Session Badge - Top Right */}
            <div className="flex justify-end mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${currentSession.color}`}>
                    {SessionIcon && <SessionIcon className="w-3 h-3" />}
                    {currentSession.label}
                </span>
            </div>

            <div className="flex justify-between items-start">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white cursor-help tracking-tight" title={stock.companyName}>
                    ${stock.ticker}
                </h3>
                <div className="flex flex-col items-end">
                    {/* Current Price */}
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${stock.price?.toFixed(2)}
                    </div>

                    {/* Regular Hours Change */}
                    <div className={`flex items-center text-xs font-bold ${(stock.percentChange || 0) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}>
                        {(stock.percentChange || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{Math.abs(stock.percentChange || 0).toFixed(2)}%</span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 ml-1">Today</span>
                    </div>

                    {/* Extended Hours Change (Pre-market or After-hours) */}
                    {(session === 'pre-market' || session === 'after-hours') && (
                        <div className={`flex items-center text-[10px] font-medium mt-0.5 ${(stock.percentChange || 0) >= 0
                            ? 'text-green-500 dark:text-green-500'
                            : 'text-red-500 dark:text-red-500'
                            }`}>
                            {session === 'pre-market' ? (
                                <>
                                    <Sun className="w-2.5 h-2.5 mr-0.5 text-orange-500" />
                                    <span className="text-gray-500">Pre:</span>
                                </>
                            ) : (
                                <>
                                    <Moon className="w-2.5 h-2.5 mr-0.5 text-purple-500" />
                                    <span className="text-gray-500">AH:</span>
                                </>
                            )}
                            <span className="ml-0.5">--</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Sentiment Bar (Always shown for consistent layout) */}
            <div className="mt-3">
                {stock.sentiment ? (
                    <>
                        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                            <span className="text-green-600">{Math.round(stock.sentiment.bullish * 100)}% Bullish</span>
                            <span className="text-red-600">{Math.round(stock.sentiment.bearish * 100)}% Bearish</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden flex relative">
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-gray-300 to-red-500 opacity-20"></div>

                            {/* Actual Values */}
                            <div
                                className="bg-gradient-to-r from-green-500 to-green-400 h-full"
                                style={{ width: `${stock.sentiment.bullish * 100}%` }}
                            />
                            <div
                                className="bg-gradient-to-l from-red-500 to-red-400 h-full"
                                style={{ width: `${stock.sentiment.bearish * 100}%` }}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex justify-center text-[10px] font-semibold uppercase tracking-wider mb-1.5 opacity-50">
                            <span className="text-gray-500 dark:text-gray-400">Insufficient Data</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full opacity-30"></div>
                    </>
                )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-y-4 gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                {/* 1. Market Cap */}
                <div className="flex flex-col col-start-1">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-200">
                        {formatMarketCap(stock.marketCap)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">Market Cap</span>
                </div>

                {/* 2. Recommendation */}
                <div className="flex flex-col items-end col-start-2">
                    {(() => {
                        // Simple algorithmic recommendation based on available metrics
                        let rec = 'HOLD';
                        let color = 'text-gray-600 dark:text-gray-300';

                        const trendScore = stock.trendingScore || 0;
                        const sentiment = stock.sentiment;
                        const priceChange = stock.percentChange || 0;

                        // Strong Buy: High trend + Bullish sentiment + Positive price
                        if (trendScore > 8 && sentiment && sentiment.bullish > 0.7 && priceChange > 2) {
                            rec = 'STRONG BUY';
                            color = 'text-green-700 dark:text-green-400 font-extrabold';
                        }
                        // Buy: Good trend + Bullish bias + Positive price
                        else if (trendScore > 5 && sentiment && sentiment.bullish > 0.6 && priceChange > 0) {
                            rec = 'BUY';
                            color = 'text-green-600 dark:text-green-500';
                        }
                        // Watch: High trend but mixed signals
                        else if (trendScore > 7) {
                            rec = 'WATCH';
                            color = 'text-yellow-600 dark:text-yellow-500';
                        }

                        return (
                            <span className={`font-bold text-[11px] ${color}`}>
                                {rec}
                            </span>
                        );
                    })()}
                    <span className="text-[10px] uppercase tracking-wide opacity-70">Signal</span>
                </div>

                {/* 2. Trending Score */}
                <div className="flex flex-col col-start-1">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-200">
                        {stock.trendingScore?.toFixed(2) || '-'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">Trend Score</span>
                </div>

                {/* 8. Volatility */}
                <div className="flex flex-col items-end col-start-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-200">
                        {stock.intradayVolatility !== undefined ? `${(stock.intradayVolatility * 100).toFixed(2)}%` : '-'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">Volatility</span>
                </div>
            </div>
        </div>
    );
}

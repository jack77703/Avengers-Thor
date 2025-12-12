'use client';

import { useState } from 'react';
import { Stock } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

// Mock Data for Skeleton
const MOCK_STOCKS: Partial<Stock>[] = [
    {
        symbol: 'PLTR',
        rank: 1,
        price: 25.50,
        percent_change: 2.5,
        messageVolume: 15420,
        zScore: 2.4,
        sentiment: { bullish: 0.85, bearish: 0.15 },
        hasNews: true,
        newsImpact: 'High',
        intradayVolatility: 0.045
    },
    {
        symbol: 'NVDA',
        rank: 2,
        price: 890.00,
        percent_change: -1.2,
        messageVolume: 8500,
        zScore: 1.1,
        sentiment: { bullish: 0.6, bearish: 0.4 },
        hasNews: false,
        newsImpact: 'None',
        intradayVolatility: 0.021
    },
    {
        symbol: 'GME',
        rank: 3,
        price: 14.50,
        percent_change: 15.4,
        messageVolume: 45000,
        zScore: 3.8,
        sentiment: { bullish: 0.9, bearish: 0.1 },
        hasNews: true,
        newsImpact: 'Medium',
        intradayVolatility: 0.12
    }
];

interface StockTableProps {
    stocks: Partial<Stock>[];
}

export function StockTable({ stocks }: StockTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof Stock; direction: 'asc' | 'desc' } | null>(null);

    const sortedStocks = [...stocks].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        let valA: any = a[key];
        let valB: any = b[key];

        // Handle nested or special cases if needed (e.g. sentiment object)
        if (key === 'sentiment') {
            valA = a.sentiment?.bullish || 0;
            valB = b.sentiment?.bullish || 0;
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: keyof Stock) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: keyof Stock }) => {
        if (sortConfig?.key !== columnKey) return <Minus className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-50" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />;
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                        <th className="px-4 py-3 cursor-pointer group w-20" onClick={() => requestSort('rank')}>
                            <div className="flex items-center gap-1">Rank <SortIcon columnKey="rank" /></div>
                        </th>
                        <th className="px-4 py-3 cursor-pointer group w-24" onClick={() => requestSort('trendingScore')}>
                            <div className="flex items-center gap-1">Trend <SortIcon columnKey="trendingScore" /></div>
                        </th>
                        <th className="px-4 py-3 w-24">Symbol</th>
                        <th className="px-4 py-3 text-right cursor-pointer group w-32" onClick={() => requestSort('price')}>
                            <div className="flex items-center justify-end gap-1">Price <SortIcon columnKey="price" /></div>
                        </th>
                        <th className="px-4 py-3 text-right cursor-pointer group w-28" onClick={() => requestSort('percentChange')}>
                            <div className="flex items-center justify-end gap-1">% Chg <SortIcon columnKey="percentChange" /></div>
                        </th>
                        <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => requestSort('messageVolume')}>
                            <div className="flex items-center justify-end gap-1">Msg Vol (24h) <SortIcon columnKey="messageVolume" /></div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer group w-24" onClick={() => requestSort('zScore')}>
                            <div className="flex items-center justify-center gap-1">Z-Score <SortIcon columnKey="zScore" /></div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer group" onClick={() => requestSort('sentiment')}>
                            <div className="flex items-center justify-center gap-1">Bull Ratio <SortIcon columnKey="sentiment" /></div>
                        </th>
                        <th className="px-4 py-3 text-center w-16">News</th>
                        <th className="px-4 py-3 text-right cursor-pointer group w-24" onClick={() => requestSort('intradayVolatility')}>
                            <div className="flex items-center justify-end gap-1">Volat. <SortIcon columnKey="intradayVolatility" /></div>
                        </th>
                        <th className="px-4 py-3 w-24">Signals</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedStocks.map((stock, idx) => (
                        <tr key={stock.ticker} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {/* Rank */}
                            <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-900 dark:text-white">#{stock.rank}</span>
                                    {/* Mock Rank Delta - In real app, compare with prev rank */}
                                    <span className="text-gray-400 text-[10px]">-</span>
                                </div>
                            </td>

                            {/* Trending Score */}
                            <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                                {stock.trendingScore?.toFixed(2)}
                            </td>

                            {/* Symbol */}
                            <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                ${stock.ticker}
                            </td>

                            {/* Price */}
                            <td className="px-4 py-3 text-right font-mono">
                                ${stock.price?.toFixed(2)}
                            </td>

                            {/* % Change */}
                            <td className={`px-4 py-3 text-right font-medium ${(stock.percentChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(stock.percentChange || 0) > 0 ? '+' : ''}{stock.percentChange}%
                            </td>

                            {/* Msg Volume */}
                            <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-medium">{stock.messageVolume?.toLocaleString()}</span>
                                    {/* Mock Sparkline Placeholder */}
                                    <div className="w-12 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            </td>

                            {/* Z-Score */}
                            <td className="px-4 py-3 text-center">
                                {stock.zScore !== undefined && (
                                    <div className="group relative inline-block">
                                        <span className={`px-2 py-1 rounded text-xs font-bold cursor-help ${stock.zScore > 2 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            stock.zScore > 1.3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {stock.zScore.toFixed(1)}
                                        </span>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                            Z-Score: {stock.zScore.toFixed(2)} (Standard Deviations)
                                        </div>
                                    </div>
                                )}
                            </td>

                            {/* Sentiment */}
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-1 w-20 mx-auto" title={`Bullish: ${((stock.sentiment?.bullish || 0) * 100).toFixed(0)}%`}>
                                    <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden flex">
                                        <div className="bg-green-500 h-full" style={{ width: `${(stock.sentiment?.bullish || 0) * 100}%` }}></div>
                                        <div className="bg-red-500 h-full" style={{ width: `${(stock.sentiment?.bearish || 0) * 100}%` }}></div>
                                    </div>
                                </div>
                            </td>

                            {/* News */}
                            <td className="px-4 py-3 text-center">
                                {stock.hasNews && (
                                    <div className="group relative inline-block">
                                        <Zap className={`w-4 h-4 mx-auto cursor-help ${stock.newsImpact === 'High' ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                            {stock.newsImpact} Impact News
                                        </div>
                                    </div>
                                )}
                            </td>

                            {/* Volatility */}
                            <td className="px-4 py-3 text-right text-gray-500">
                                {((stock.intradayVolatility || 0) * 100).toFixed(2)}%
                            </td>

                            {/* Signals */}
                            <td className="px-4 py-3">
                                <div className="flex gap-1 justify-center">
                                    {stock.zScore && stock.zScore > 2 && (
                                        <span title="Mention Spike (>2σ)" className="w-2 h-2 rounded-full bg-red-500 cursor-help"></span>
                                    )}
                                    {(stock.percentChange || 0) > 5 && (
                                        <span title="Price Surge (>5%)" className="w-2 h-2 rounded-full bg-green-500 cursor-help"></span>
                                    )}
                                    {stock.hasNews && stock.newsImpact === 'High' && (
                                        <span title="High Impact News" className="w-2 h-2 rounded-full bg-yellow-500 cursor-help"></span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

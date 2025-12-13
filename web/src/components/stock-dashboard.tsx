'use client';

import { useState, useEffect } from 'react';
import { Stock } from '@/lib/types';
import { StockCard } from './stock-card';
import { StockTable } from './stock-table';
import { ArrowUp, ArrowDown, LayoutGrid, List } from 'lucide-react';
import { useFinnhubWebSocket } from '@/hooks/useFinnhubWebSocket';

interface StockDashboardProps {
    initialStocks: Stock[];
}

type SortOption = 'rank' | 'watchers' | 'trending' | 'marketCap' | 'percentChange';
type ViewMode = 'card' | 'table';

type SortButtonProps = {
    option: SortOption;
    label: string;
    active: boolean;
    sortOrder: 'asc' | 'desc';
    onSelect: (option: SortOption) => void;
};

function SortButton({ option, label, active, sortOrder, onSelect }: SortButtonProps) {
    return (
        <button
            onClick={() => onSelect(option)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1 ${active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
        >
            {label}
            {active && (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
            )}
        </button>
    );
}

export function StockDashboard({ initialStocks }: StockDashboardProps) {
    const [stocks, setStocks] = useState<Stock[]>(initialStocks);
    const [sortBy, setSortBy] = useState<SortOption>('rank');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<ViewMode>('card');

    // WebSocket for real-time prices
    const { prices, isConnected, subscribe } = useFinnhubWebSocket();

    // Subscribe to all stock symbols on mount and pass their previous close prices
    useEffect(() => {
        const symbolsWithPrices = initialStocks.map(s => ({
            symbol: s.ticker,
            previousClosePrice: s.previousClosePrice || s.price || 0 // Use previous close price from server
        }));
        subscribe(symbolsWithPrices);
    }, [initialStocks, subscribe]);

    // Merge real-time prices into stocks
    useEffect(() => {
        if (prices.size === 0) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStocks(prevStocks =>
            prevStocks.map(stock => {
                const livePrice = prices.get(stock.ticker);
                if (!livePrice) return stock;

                // Use the percent change calculated from WebSocket data
                // This already accounts for the market open price
                const newPercentChange = livePrice.percentChange ?? stock.percentChange;

                return {
                    ...stock,
                    price: livePrice.price,
                    percentChange: newPercentChange,
                    lastUpdated: new Date(livePrice.timestamp).toISOString(),
                    _priceChange: livePrice.change // For animation
                };
            })
        );
    }, [prices]);

    const handleSort = (option: SortOption) => {
        let newSortOrder: 'asc' | 'desc' = 'desc';

        if (sortBy === option) {
            newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // Default sort orders for new selection
            if (option === 'rank') newSortOrder = 'asc';
            else newSortOrder = 'desc';
        }

        setSortBy(option);
        setSortOrder(newSortOrder);

        const sorted = [...stocks].sort((a, b) => {
            let valA: number = 0;
            let valB: number = 0;

            switch (option) {
                case 'rank':
                    valA = a.rank || 999;
                    valB = b.rank || 999;
                    break;
                case 'watchers':
                    valA = a.watchers;
                    valB = b.watchers;
                    break;
                case 'trending':
                    valA = a.trendingScore || 0;
                    valB = b.trendingScore || 0;
                    break;
                case 'marketCap':
                    valA = a.marketCap || 0;
                    valB = b.marketCap || 0;
                    break;
                case 'percentChange':
                    valA = parseFloat(String(a.percentChange || 0));
                    valB = parseFloat(String(b.percentChange || 0));
                    break;
            }

            return newSortOrder === 'asc' ? valA - valB : valB - valA;
        });

        setStocks(sorted);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 self-center mr-2">Sort by:</span>
                    <SortButton option="rank" label="Rank" active={sortBy === 'rank'} sortOrder={sortOrder} onSelect={handleSort} />
                    <SortButton option="trending" label="Trending Score" active={sortBy === 'trending'} sortOrder={sortOrder} onSelect={handleSort} />
                    <SortButton option="watchers" label="Watchers" active={sortBy === 'watchers'} sortOrder={sortOrder} onSelect={handleSort} />
                    <SortButton option="marketCap" label="Market Cap" active={sortBy === 'marketCap'} sortOrder={sortOrder} onSelect={handleSort} />
                    <SortButton option="percentChange" label="% Change" active={sortBy === 'percentChange'} sortOrder={sortOrder} onSelect={handleSort} />

                    {/* WebSocket Connection Status */}
                    {isConnected && (
                        <span className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 self-center">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                            LIVE
                        </span>
                    )}
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('card')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        title="Card View"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        title="Table View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stocks.map((stock) => (
                        <StockCard key={stock.ticker} stock={stock} />
                    ))}
                </div>
            ) : (
                <StockTable stocks={stocks} />
            )}
        </div>
    );
}

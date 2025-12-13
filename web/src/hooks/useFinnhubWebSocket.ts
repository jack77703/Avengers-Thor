'use client';

import { useEffect, useRef, useState } from 'react';

export interface PriceUpdate {
    symbol: string;
    price: number;
    timestamp: number;
    change?: number; // For animation direction
    percentChange?: number; // Percentage change from previous close
    previousClosePrice?: number; // Previous close price (for reference)
}

interface UseFinnhubWebSocketReturn {
    prices: Map<string, PriceUpdate>;
    isConnected: boolean;
    subscribe: (symbols: Array<{symbol: string, previousClosePrice: number}> | string[]) => void;
    unsubscribe: (symbols: string[]) => void;
}

// Map to store previous close prices for each symbol
const priceReferenceMap = new Map<string, number>();

export function useFinnhubWebSocket(): UseFinnhubWebSocketReturn {
    const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const subscribedSymbolsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Only run on client-side to avoid SSR hydration issues
        if (typeof window === 'undefined') return;

        const connect = () => {
            const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

            console.log('🔍 API Key check:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

            if (!apiKey) {
                console.warn('NEXT_PUBLIC_FINNHUB_API_KEY not set for WebSocket');
                return;
            }

            try {
                const wsUrl = `wss://ws.finnhub.io?token=${apiKey}`;
                console.log('🔌 Connecting to Finnhub WebSocket...');

                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('✅ Finnhub WebSocket connected successfully');
                    setIsConnected(true);

                    // Resubscribe to symbols after reconnect
                    subscribedSymbolsRef.current.forEach(symbol => {
                        ws.send(JSON.stringify({ type: 'subscribe', symbol }));
                    });
                };

                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);

                    if (message.type === 'trade' && message.data) {
                        // message.data is an array of trades
                        message.data.forEach((trade: { s: string; p: number; t: number }) => {
                            const currentPrice = trade.p;

                            // Get the previous close price from the reference map
                            const previousClosePrice = priceReferenceMap.get(trade.s) || currentPrice;

                            // Calculate percent change from previous close price
                            const percentChange = previousClosePrice > 0
                                ? ((currentPrice - previousClosePrice) / previousClosePrice) * 100
                                : 0;

                            setPrices(prev => {
                                const previousUpdate = prev.get(trade.s);
                                const change = previousUpdate ? currentPrice - previousUpdate.price : 0;
                                const updated = new Map(prev);
                                updated.set(trade.s, {
                                    symbol: trade.s,
                                    price: currentPrice,
                                    timestamp: trade.t,
                                    change,
                                    percentChange,
                                    previousClosePrice
                                });
                                return updated;
                            });
                        });
                    }
                };

                ws.onerror = (error) => {
                    console.error('❌ WebSocket error occurred');
                    console.error('This usually means:');
                    console.error('1. The API key is invalid or expired');
                    console.error('2. Finnhub WebSocket is temporarily down');
                    console.error('3. Network connectivity issue');
                    console.error('Error details:', error);
                };

                ws.onclose = (event) => {
                    console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
                    setIsConnected(false);
                    wsRef.current = null;

                    // Auto-reconnect after 3 seconds (unless it's an auth error)
                    if (event.code !== 1008) { // 1008 = policy violation (bad auth)
                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log('🔄 Attempting to reconnect...');
                            connect();
                        }, 3000);
                    } else {
                        console.error('❌ WebSocket auth failed (code 1008) - Check your NEXT_PUBLIC_FINNHUB_API_KEY');
                    }
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
            }
        };

        // Small delay to ensure component is mounted
        const timer = setTimeout(connect, 100);

        const subscribedSymbolsSet = subscribedSymbolsRef.current;

        // Cleanup on unmount
        return () => {
            clearTimeout(timer);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                const subsAtCleanup = Array.from(subscribedSymbolsSet);
                // Unsubscribe from all symbols
                subsAtCleanup.forEach(symbol => {
                    wsRef.current?.send(JSON.stringify({ type: 'unsubscribe', symbol }));
                });
                wsRef.current.close();
            }
        };
    }, []); // Empty deps - only run once on mount

    const subscribe = (symbols: Array<{symbol: string, previousClosePrice: number}> | string[]) => {
        // Handle both old format (string[]) and new format (with previousClosePrice)
        let symbolsToSubscribe: string[] = [];
        
        if (Array.isArray(symbols) && symbols.length > 0) {
            if (typeof symbols[0] === 'string') {
                // Old format: string[]
                symbolsToSubscribe = symbols as string[];
            } else {
                // New format: {symbol, previousClosePrice}[]
                const symbolsWithPrices = symbols as Array<{symbol: string, previousClosePrice: number}>;
                symbolsToSubscribe = symbolsWithPrices.map(s => s.symbol);
                // Store the previous close prices
                symbolsWithPrices.forEach(s => {
                    priceReferenceMap.set(s.symbol, s.previousClosePrice);
                });
            }
        }

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            // Store for when connection is ready
            symbolsToSubscribe.forEach(s => subscribedSymbolsRef.current.add(s));
            return;
        }

        symbolsToSubscribe.forEach(symbol => {
            if (!subscribedSymbolsRef.current.has(symbol)) {
                console.log(`📡 Subscribing to ${symbol}`);
                wsRef.current!.send(JSON.stringify({ type: 'subscribe', symbol }));
                subscribedSymbolsRef.current.add(symbol);
            }
        });
    };

    const unsubscribe = (symbols: string[]) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        symbols.forEach(symbol => {
            if (subscribedSymbolsRef.current.has(symbol)) {
                console.log(`🔕 Unsubscribing from ${symbol}`);
                wsRef.current!.send(JSON.stringify({ type: 'unsubscribe', symbol }));
                subscribedSymbolsRef.current.delete(symbol);
            }
        });
    };

    return {
        prices,
        isConnected,
        subscribe,
        unsubscribe
    };
}

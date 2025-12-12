/**
 * Market Hours Utility
 * Detects if US stock market is open (NYSE/NASDAQ)
 * Trading Hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 * Excludes US Market Holidays (simplified - can be extended with holiday API)
 */

export interface MarketStatus {
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
    lastClose?: Date;
    message: string;
}

/**
 * Check if current time is within market hours
 * @returns MarketStatus object with open/close info
 */
export function getMarketStatus(): MarketStatus {
    const now = new Date();

    // Convert to ET timezone
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30;  // 9:30 AM = 570 minutes
    const marketClose = 16 * 60;      // 4:00 PM = 960 minutes

    // Weekend check
    if (day === 0 || day === 6) {
        return {
            isOpen: false,
            message: 'Market Closed - Weekend',
            nextOpen: getNextMarketOpen(etTime)
        };
    }

    // Weekday - check time
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        return {
            isOpen: true,
            message: 'Market Open',
            nextClose: getNextMarketClose(etTime)
        };
    }

    // Before market open
    if (currentMinutes < marketOpen) {
        return {
            isOpen: false,
            message: `Market Opens at ${formatTime(marketOpen)}`,
            nextOpen: getNextMarketOpen(etTime),
            lastClose: getLastMarketClose(etTime)
        };
    }

    // After market close
    return {
        isOpen: false,
        message: `Market Closed - Opens ${getNextOpenDay(day)}`,
        nextOpen: getNextMarketOpen(etTime),
        lastClose: getLastMarketClose(etTime)
    };
}

function getNextMarketOpen(etTime: Date): Date {
    const next = new Date(etTime);
    const day = next.getDay();
    const hours = next.getHours();
    const minutes = next.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30;

    // If it's Friday after close or weekend, jump to Monday
    if (day === 5 && currentMinutes >= 16 * 60) {
        next.setDate(next.getDate() + 3); // Friday -> Monday
        next.setHours(9, 30, 0, 0);
    } else if (day === 6) { // Saturday
        next.setDate(next.getDate() + 2);
        next.setHours(9, 30, 0, 0);
    } else if (day === 0) { // Sunday
        next.setDate(next.getDate() + 1);
        next.setHours(9, 30, 0, 0);
    } else if (currentMinutes < marketOpen) {
        // Same day, before open
        next.setHours(9, 30, 0, 0);
    } else {
        // After close, next weekday
        next.setDate(next.getDate() + 1);
        next.setHours(9, 30, 0, 0);
    }

    return next;
}

function getNextMarketClose(etTime: Date): Date {
    const next = new Date(etTime);
    next.setHours(16, 0, 0, 0);
    return next;
}

function getLastMarketClose(etTime: Date): Date {
    const last = new Date(etTime);
    const day = last.getDay();

    // If Monday before open, go back to Friday
    if (day === 1 && last.getHours() < 9) {
        last.setDate(last.getDate() - 3);
    } else if (day === 0) { // Sunday
        last.setDate(last.getDate() - 2);
    } else if (day === 6) { // Saturday
        last.setDate(last.getDate() - 1);
    }

    last.setHours(16, 0, 0, 0);
    return last;
}

function getNextOpenDay(currentDay: number): string {
    if (currentDay === 5) return 'Monday 9:30 AM';
    return 'Tomorrow 9:30 AM';
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period} ET`;
}

/**
 * Determine cache duration based on market status
 * Open: 5 minutes (real-time feel)
 * Closed: 1 hour (no point in frequent updates)
 */
export function getOptimalCacheDuration(): number {
    const status = getMarketStatus();
    return status.isOpen ? 300 : 3600; // 5 min vs 1 hour
}

/**
 * Determine which trading session we're in
 */
export type MarketSession = 'pre-market' | 'regular' | 'after-hours' | 'closed';

export function getMarketSession(): MarketSession {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay();
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Weekend = closed
    if (day === 0 || day === 6) {
        return 'closed';
    }

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;      // 4:00 PM
    const preMarketStart = 4 * 60;    // 4:00 AM
    const afterHoursEnd = 20 * 60;    // 8:00 PM

    // Pre-market: 4:00 AM - 9:30 AM
    if (currentMinutes >= preMarketStart && currentMinutes < marketOpen) {
        return 'pre-market';
    }

    // Regular hours: 9:30 AM - 4:00 PM
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        return 'regular';
    }

    // After-hours: 4:00 PM - 8:00 PM
    if (currentMinutes >= marketClose && currentMinutes < afterHoursEnd) {
        return 'after-hours';
    }

    return 'closed';
}

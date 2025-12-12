import { cn } from '@/lib/utils';

interface SentimentBadgeProps {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    className?: string;
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                {
                    'bg-green-100 text-green-800': sentiment === 'bullish',
                    'bg-red-100 text-red-800': sentiment === 'bearish',
                    'bg-gray-100 text-gray-800': sentiment === 'neutral',
                },
                className
            )}
        >
            {sentiment}
        </span>
    );
}

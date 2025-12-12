import { Tweet, KOL } from '@/lib/types';
import { SentimentBadge } from './sentiment-badge';
import { MessageCircle, Repeat, Heart } from 'lucide-react';

interface TweetCardProps {
    tweet: Tweet;
    kol?: KOL;
}

export function TweetCard({ tweet, kol }: TweetCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    {kol && <span className="font-bold text-sm text-gray-900 dark:text-white">{kol.name}</span>}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(tweet.createdAt).toLocaleString()}</span>
                </div>
                <SentimentBadge sentiment={tweet.sentiment} />
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap mb-3">{tweet.text}</p>
            <div className="flex items-center space-x-6 text-gray-400 dark:text-gray-500 text-xs">
                <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>Reply</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Repeat className="w-4 h-4" />
                    <span>{tweet.retweets}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>{tweet.likes}</span>
                </div>
            </div>
        </div>
    );
}

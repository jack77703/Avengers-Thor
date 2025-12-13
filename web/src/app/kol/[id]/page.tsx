import { MOCK_KOLS, MOCK_TWEETS } from '@/lib/mock-data';
import { TweetCard } from '@/components/tweet-card';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';

interface PageProps {
    params: {
        id: string;
    };
}

export default async function KOLProfilePage({ params }: PageProps) {
    const { id } = await params;
    const kol = MOCK_KOLS.find((k) => k.id === id);

    if (!kol) {
        notFound();
    }

    const tweets = MOCK_TWEETS.filter((t) => t.kolId === kol.id);

    return (
        <div className="space-y-8 px-4 sm:px-0">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-start space-x-6">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                        {kol.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={kol.avatarUrl} alt={kol.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-3xl">
                                {kol.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{kol.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">@{kol.username}</p>
                        <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-2xl">{kol.description}</p>
                        <div className="mt-4 flex items-center text-gray-500 dark:text-gray-400">
                            <Users className="w-5 h-5 mr-2" />
                            <span>{(kol.followers / 1000).toFixed(1)}k followers</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tweet History */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                <div className="space-y-4">
                    {tweets.length > 0 ? (
                        tweets.map((tweet) => (
                            <TweetCard key={tweet.id} tweet={tweet} />
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic">No recent tweets found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

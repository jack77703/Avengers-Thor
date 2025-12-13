import { KOL } from '@/lib/types';
import Link from 'next/link';

interface KOLCardProps {
    kol: KOL;
}

export function KOLCard({ kol }: KOLCardProps) {
    return (
        <Link href={`/kol/${kol.id}`} className="block group">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                        {kol.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={kol.avatarUrl} alt={kol.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-xl">
                                {kol.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{kol.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{kol.username}</p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{kol.description}</p>
                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    {(kol.followers / 1000).toFixed(1)}k followers
                </div>
            </div>
        </Link>
    );
}

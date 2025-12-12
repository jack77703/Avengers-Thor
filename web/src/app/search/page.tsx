import { MOCK_KOLS } from '@/lib/mock-data';
import { KOLCard } from '@/components/kol-card';

export default function SearchPage() {
    return (
        <div className="space-y-6 px-4 sm:px-0">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tracked KOLs</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    We are currently tracking {MOCK_KOLS.length} financial whales.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {MOCK_KOLS.map((kol) => (
                    <KOLCard key={kol.id} kol={kol} />
                ))}
            </div>
        </div>
    );
}

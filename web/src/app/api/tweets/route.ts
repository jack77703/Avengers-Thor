import { NextResponse } from 'next/server';
import { MOCK_TWEETS } from '@/lib/mock-data';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const kolId = searchParams.get('kolId');

    await new Promise((resolve) => setTimeout(resolve, 500));

    let tweets = MOCK_TWEETS;

    if (kolId) {
        tweets = tweets.filter((t) => t.kolId === kolId);
    }

    return NextResponse.json(tweets);
}

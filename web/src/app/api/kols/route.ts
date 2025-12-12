import { NextResponse } from 'next/server';
import { MOCK_KOLS } from '@/lib/mock-data';

export async function GET() {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json(MOCK_KOLS);
}

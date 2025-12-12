/**
 * Data Collection Scheduler
 * 
 * This file documents how to set up automatic data collection.
 * Choose one of the methods below based on your deployment platform.
 */

// ============= OPTION 1: VERCEL CRON (Recommended for Vercel deployment) =============
// 
// 1. Add to vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/data-collection?action=ohlcv&symbols=AAPL,TSLA,MSFT,NVDA,AMZN",
//       "schedule": "0 17 * * 1-5"  // Every weekday at 5 PM (market close)
//     },
//     {
//       "path": "/api/data-collection?action=fundamentals&symbols=AAPL,TSLA,MSFT,NVDA,AMZN",
//       "schedule": "0 0 * * 0"  // Every Sunday at midnight
//     },
//     {
//       "path": "/api/data-collection?action=economic",
//       "schedule": "0 9 * * 1"  // Every Monday at 9 AM
//     }
//   ]
// }

// ============= OPTION 2: EASY CRON (Free external service) =============
//
// Visit: https://www.easycron.com/
// Create these cron jobs:
//
// 1. Update OHLCV (Daily at market close)
//    URL: https://your-domain.com/api/data-collection?action=ohlcv&symbols=AAPL,TSLA,MSFT,NVDA
//    Cron: 0 17 * * 1-5 (5 PM EST weekdays)
//
// 2. Update Fundamentals (Weekly)
//    URL: https://your-domain.com/api/data-collection?action=fundamentals&symbols=AAPL,TSLA,MSFT,NVDA
//    Cron: 0 0 * * 0 (Sunday midnight)
//
// 3. Update News (Daily)
//    URL: https://your-domain.com/api/data-collection?action=all&symbols=AAPL,TSLA,MSFT
//    Cron: 0 9 * * * (Every day at 9 AM)

// ============= OPTION 3: RAILWAY CRON (If deployed on Railway) =============
//
// Add to railway.json:
// {
//   "jobs": [
//     {
//       "name": "daily-ohlcv-update",
//       "schedule": "0 17 * * 1-5",
//       "command": "curl https://your-domain/api/data-collection?action=ohlcv"
//     }
//   ]
// }

// ============= OPTION 4: NODE-CRON (Local/self-hosted) =============
//
// Install: npm install node-cron
//
// Then use this scheduler (see below)

import cron from 'node-cron';

const ENABLE_SCHEDULER = process.env.ENABLE_CRON_SCHEDULER === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface CronJob {
  name: string;
  schedule: string; // cron format: "minute hour day month dayOfWeek"
  url: string;
  description: string;
}

const CRON_JOBS: CronJob[] = [
  {
    name: 'daily-ohlcv-update',
    schedule: '0 17 * * 1-5', // 5 PM EST, Monday-Friday (market close)
    url: `${API_BASE_URL}/api/data-collection?action=ohlcv&symbols=AAPL,MSFT,TSLA,NVDA,AMZN`,
    description: 'Update daily OHLCV data for top stocks',
  },
  {
    name: 'hourly-price-update',
    schedule: '0 * * * *', // Every hour during market hours
    url: `${API_BASE_URL}/api/data-collection?action=ohlcv&symbols=AAPL,TSLA`,
    description: 'Update intraday prices (can reduce frequency if needed)',
  },
  {
    name: 'weekly-fundamentals',
    schedule: '0 0 * * 0', // Midnight Sunday
    url: `${API_BASE_URL}/api/data-collection?action=fundamentals&symbols=AAPL,MSFT,TSLA,NVDA,AMZN,GOOGL,META,AMD`,
    description: 'Update company fundamentals weekly',
  },
  {
    name: 'daily-news',
    schedule: '0 9 * * *', // 9 AM daily
    url: `${API_BASE_URL}/api/data-collection?action=all&symbols=AAPL,TSLA,MSFT`,
    description: 'Collect latest news and sentiment',
  },
  {
    name: 'weekly-economic',
    schedule: '0 10 * * 1', // 10 AM Monday
    url: `${API_BASE_URL}/api/data-collection?action=economic`,
    description: 'Collect economic indicators',
  },
];

/**
 * Initialize all cron jobs
 * Call this in your app initialization
 */
export function initializeCronJobs() {
  if (!ENABLE_SCHEDULER) {
    console.log('📅 Cron scheduler disabled. Set ENABLE_CRON_SCHEDULER=true to enable');
    return;
  }

  console.log('🕐 Initializing cron scheduler...');

  CRON_JOBS.forEach(job => {
    cron.schedule(job.schedule, async () => {
      console.log(`⏲️  Running cron job: ${job.name}`);
      console.log(`📍 URL: ${job.url}`);

      try {
        const response = await fetch(job.url);
        const data = await response.json();

        if (response.ok) {
          console.log(`✅ ${job.name} completed successfully`);
          console.log(`   Results:`, JSON.stringify(data.results, null, 2));
        } else {
          console.error(`❌ ${job.name} failed:`, data);
        }
      } catch (error) {
        console.error(`❌ ${job.name} error:`, error);
      }
    });

    console.log(`   ✓ Scheduled: ${job.name}`);
    console.log(`     Schedule: ${job.schedule}`);
    console.log(`     Description: ${job.description}`);
  });

  console.log(`\n📅 ${CRON_JOBS.length} cron jobs initialized\n`);
}

/**
 * Manual trigger for testing
 */
export async function triggerDataCollection(
  action: 'all' | 'ohlcv' | 'fundamentals' | 'economic' = 'all',
  symbols: string[] = ['AAPL', 'TSLA', 'MSFT']
) {
  const url = `${API_BASE_URL}/api/data-collection?action=${action}&symbols=${symbols.join(',')}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Data collection result:', data);
    return data;
  } catch (error) {
    console.error('Data collection failed:', error);
    throw error;
  }
}

export { CRON_JOBS, ENABLE_SCHEDULER };

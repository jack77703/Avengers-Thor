/**
 * Comprehensive Finnhub Free API Data Collection
 * Fetches and manages all available data from Finnhub free tier
 */

import { supabase } from './supabase';

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// ============= TYPES =============

interface Fundamentals {
  symbol: string;
  name?: string;
  industry?: string;
  sector?: string;
  marketCap?: number;
  peRatio?: number;
  pegRatio?: number;
  eps?: number;
  dividendYield?: number;
  debtToEquity?: number;
  currentRatio?: number;
  roe?: number;
  roa?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  bookValue?: number;
  week52High?: number;
  week52Low?: number;
}

interface Earnings {
  symbol: string;
  periodDate: string; // YYYY-MM-DD
  epsActual?: number;
  epsEstimate?: number;
  epsSurprise?: number;
  epsSurprisePct?: number;
  quarter?: number;
  year?: number;
}

interface NewsArticle {
  symbol: string;
  newsId?: number;
  headline: string;
  summary?: string;
  source?: string;
  url?: string;
  category?: string;
  imageUrl?: string;
  publishedAt?: Date;
}

interface Recommendation {
  symbol: string;
  periodDate: string; // YYYY-MM-DD
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  consensus?: string;
}

interface InsiderTransaction {
  symbol: string;
  insiderName?: string;
  title?: string;
  transactionDate: string; // YYYY-MM-DD
  transactionType: 'BUY' | 'SELL';
  shares?: number;
  price?: number;
  changeShares?: number;
  filingDate?: string;
}

interface Dividend {
  symbol: string;
  exDate: string; // YYYY-MM-DD
  amount?: number;
  payDate?: string;
  recordDate?: string;
}

interface StockSplit {
  symbol: string;
  splitDate: string; // YYYY-MM-DD
  fromFactor?: number;
  toFactor?: number;
}

interface EconomicData {
  country: string;
  indicatorCode: string;
  indicatorName?: string;
  dataDate: string; // YYYY-MM-DD
  value?: number;
  unit?: string;
}

// ============= FUNDAMENTALS =============

/**
 * Fetch company fundamental metrics (PE ratio, market cap, etc.)
 */
export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (data.error || !data.metric) return null;

    const m = data.metric;
    return {
      symbol,
      name: data.companyName || m.name,
      industry: m.industry,
      sector: m.sector,
      marketCap: m.marketCapitalization,
      peRatio: m.peRatio,
      pegRatio: m.pegRatio,
      eps: m.epsIncludingExtraordinaryItems,
      dividendYield: m.dividendYield,
      debtToEquity: m.debtToEquityRatio,
      currentRatio: m.currentRatio,
      roe: m.roe,
      roa: m.roa,
      profitMargin: m.profitMargin,
      revenueGrowth: m.revenueGrowth,
      earningsGrowth: m.earningsGrowth,
      bookValue: m.bookValue,
      week52High: m.week52High,
      week52Low: m.week52Low,
    };
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return null;
  }
}

/**
 * Save or update fundamentals in database
 */
export async function saveFundamentals(data: Fundamentals): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('stock_fundamentals')
      .upsert(
        {
          symbol: data.symbol,
          name: data.name,
          industry: data.industry,
          sector: data.sector,
          market_cap: data.marketCap,
          pe_ratio: data.peRatio,
          peg_ratio: data.pegRatio,
          eps: data.eps,
          dividend_yield: data.dividendYield,
          debt_to_equity: data.debtToEquity,
          current_ratio: data.currentRatio,
          roe: data.roe,
          roa: data.roa,
          profit_margin: data.profitMargin,
          revenue_growth: data.revenueGrowth,
          earnings_growth: data.earningsGrowth,
          book_value: data.bookValue,
          week_52_high: data.week52High,
          week_52_low: data.week52Low,
        },
        { onConflict: 'symbol' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error saving fundamentals for ${data.symbol}:`, error);
    return false;
  }
}

// ============= EARNINGS =============

/**
 * Fetch historical earnings and EPS surprises
 */
export async function getEarnings(symbol: string): Promise<Earnings[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/earnings?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(earning => ({
      symbol,
      periodDate: earning.period || '',
      epsActual: earning.actual,
      epsEstimate: earning.estimate,
      epsSurprise: earning.surprise,
      epsSurprisePct: earning.surprisePercent,
      quarter: earning.quarter,
      year: earning.year,
    }));
  } catch (error) {
    console.error(`Error fetching earnings for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch earnings data
 */
export async function saveBatchEarnings(earningsList: Earnings[]): Promise<boolean> {
  if (earningsList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_earnings')
      .upsert(
        earningsList.map(e => ({
          symbol: e.symbol,
          period_date: e.periodDate,
          eps_actual: e.epsActual,
          eps_estimate: e.epsEstimate,
          eps_surprise: e.epsSurprise,
          eps_surprise_pct: e.epsSurprisePct,
          quarter: e.quarter,
          year: e.year,
        })),
        { onConflict: 'symbol,period_date' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving earnings batch:', error);
    return false;
  }
}

// ============= NEWS =============

/**
 * Fetch company news
 */
export async function getNews(symbol: string, limit: number = 20): Promise<NewsArticle[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&limit=${limit}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(article => ({
      symbol,
      newsId: article.id,
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      url: article.url,
      category: article.category,
      imageUrl: article.image,
      publishedAt: article.datetime ? new Date(article.datetime * 1000) : undefined,
    }));
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch news articles
 */
export async function saveBatchNews(newsList: NewsArticle[]): Promise<boolean> {
  if (newsList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_news')
      .upsert(
        newsList.map(article => ({
          symbol: article.symbol,
          news_id: article.newsId,
          headline: article.headline,
          summary: article.summary,
          source: article.source,
          url: article.url,
          category: article.category,
          image_url: article.imageUrl,
          published_at: article.publishedAt?.toISOString(),
        })),
        { onConflict: 'news_id' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving news batch:', error);
    return false;
  }
}

// ============= RECOMMENDATIONS =============

/**
 * Fetch analyst recommendations trend
 */
export async function getRecommendations(symbol: string): Promise<Recommendation[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/recommendation?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(rec => ({
      symbol,
      periodDate: rec.period,
      strongBuy: rec.strongBuy,
      buy: rec.buy,
      hold: rec.hold,
      sell: rec.sell,
      strongSell: rec.strongSell,
      consensus: rec.consensus,
    }));
  } catch (error) {
    console.error(`Error fetching recommendations for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch recommendations
 */
export async function saveBatchRecommendations(recList: Recommendation[]): Promise<boolean> {
  if (recList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_recommendations')
      .upsert(
        recList.map(rec => ({
          symbol: rec.symbol,
          period_date: rec.periodDate,
          strong_buy: rec.strongBuy,
          buy: rec.buy,
          hold: rec.hold,
          sell: rec.sell,
          strong_sell: rec.strongSell,
          consensus: rec.consensus,
        })),
        { onConflict: 'symbol,period_date' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving recommendations batch:', error);
    return false;
  }
}

// ============= INSIDER TRANSACTIONS =============

/**
 * Fetch insider transactions
 */
export async function getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/insider-transactions?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.map((tx: {
      name: string;
      title: string;
      transactionDate: string;
      transactionType: string;
      shares: number;
      price: number;
      change: number;
      filingDate: string;
    }) => ({
      symbol,
      insiderName: tx.name,
      title: tx.title,
      transactionDate: tx.transactionDate,
      transactionType: tx.transactionType === 'Sell' ? 'SELL' : 'BUY',
      shares: tx.shares,
      price: tx.price,
      changeShares: tx.change,
      filingDate: tx.filingDate,
    }));
  } catch (error) {
    console.error(`Error fetching insider transactions for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch insider transactions
 */
export async function saveBatchInsiderTransactions(txList: InsiderTransaction[]): Promise<boolean> {
  if (txList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_insider_transactions')
      .insert(
        txList.map(tx => ({
          symbol: tx.symbol,
          insider_name: tx.insiderName,
          title: tx.title,
          transaction_date: tx.transactionDate,
          transaction_type: tx.transactionType,
          shares: tx.shares,
          price: tx.price,
          change_shares: tx.changeShares,
          filing_date: tx.filingDate,
        }))
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving insider transactions batch:', error);
    return false;
  }
}

// ============= DIVIDENDS =============

/**
 * Fetch dividend information
 */
export async function getDividends(symbol: string): Promise<Dividend[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/dividend?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(div => ({
      symbol,
      exDate: div.exDate,
      amount: div.amount,
      payDate: div.payDate,
      recordDate: div.recordDate,
    }));
  } catch (error) {
    console.error(`Error fetching dividends for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch dividends
 */
export async function saveBatchDividends(divList: Dividend[]): Promise<boolean> {
  if (divList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_dividends')
      .upsert(
        divList.map(div => ({
          symbol: div.symbol,
          ex_date: div.exDate,
          amount: div.amount,
          pay_date: div.payDate,
          record_date: div.recordDate,
        })),
        { onConflict: 'symbol,ex_date' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving dividends batch:', error);
    return false;
  }
}

// ============= STOCK SPLITS =============

/**
 * Fetch stock split information
 */
export async function getStockSplits(symbol: string): Promise<StockSplit[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/split?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(split => ({
      symbol,
      splitDate: split.date,
      fromFactor: split.fromFactor,
      toFactor: split.toFactor,
    }));
  } catch (error) {
    console.error(`Error fetching stock splits for ${symbol}:`, error);
    return [];
  }
}

/**
 * Save batch stock splits
 */
export async function saveBatchStockSplits(splitList: StockSplit[]): Promise<boolean> {
  if (splitList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('stock_splits')
      .insert(
        splitList.map(split => ({
          symbol: split.symbol,
          split_date: split.splitDate,
          from_factor: split.fromFactor,
          to_factor: split.toFactor,
        }))
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving stock splits batch:', error);
    return false;
  }
}

// ============= ECONOMIC DATA =============

/**
 * Fetch economic data for a specific indicator
 */
export async function getEconomicData(
  indicatorCode: string,
  country: string = 'US'
): Promise<EconomicData[]> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/economic?code=${indicatorCode}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      country: item.country || country,
      indicatorCode,
      indicatorName: item.category,
      dataDate: item.period,
      value: item.value,
      unit: item.unit,
    }));
  } catch (error) {
    console.error(`Error fetching economic data for ${indicatorCode}:`, error);
    return [];
  }
}

/**
 * Save batch economic data
 */
export async function saveBatchEconomicData(dataList: EconomicData[]): Promise<boolean> {
  if (dataList.length === 0) return true;

  try {
    const { error } = await supabase
      .from('economic_data')
      .upsert(
        dataList.map(item => ({
          country: item.country,
          indicator_code: item.indicatorCode,
          indicator_name: item.indicatorName,
          data_date: item.dataDate,
          value: item.value,
          unit: item.unit,
        })),
        { onConflict: 'indicator_code,data_date' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving economic data batch:', error);
    return false;
  }
}

// ============= COMPREHENSIVE DATA COLLECTION =============

/**
 * Fetch and save ALL available data for a single stock
 * This is the main function to call for complete data collection
 */
export async function collectAllStockData(symbol: string): Promise<{
  fundamentals: boolean;
  earnings: boolean;
  news: boolean;
  recommendations: boolean;
  insiderTransactions: boolean;
  dividends: boolean;
  splits: boolean;
}> {
  const results = {
    fundamentals: false,
    earnings: false,
    news: false,
    recommendations: false,
    insiderTransactions: false,
    dividends: false,
    splits: false,
  };

  // Fundamentals
  const fund = await getFundamentals(symbol);
  if (fund) {
    results.fundamentals = await saveFundamentals(fund);
  }

  // Earnings
  const earnings = await getEarnings(symbol);
  results.earnings = await saveBatchEarnings(earnings);

  // News
  const news = await getNews(symbol, 50);
  results.news = await saveBatchNews(news);

  // Recommendations
  const recs = await getRecommendations(symbol);
  results.recommendations = await saveBatchRecommendations(recs);

  // Insider Transactions
  const insiderTxs = await getInsiderTransactions(symbol);
  results.insiderTransactions = await saveBatchInsiderTransactions(insiderTxs);

  // Dividends
  const divs = await getDividends(symbol);
  results.dividends = await saveBatchDividends(divs);

  // Stock Splits
  const splits = await getStockSplits(symbol);
  results.splits = await saveBatchStockSplits(splits);

  console.log(`Completed data collection for ${symbol}:`, results);
  return results;
}

/**
 * Collect economic data for common indicators
 */
export async function collectEconomicData(): Promise<boolean> {
  const commonIndicators = [
    'CPIAUCSL', // Consumer Price Index
    'UNRATE', // Unemployment Rate
    'PAYEMS', // Total Nonfarm Payroll
    'INDPRO', // Industrial Production Index
    'UMCSENT', // Consumer Sentiment
    'DEXUSEU', // USD/EUR Exchange Rate
  ];

  try {
    for (const code of commonIndicators) {
      const data = await getEconomicData(code);
      if (data.length > 0) {
        await saveBatchEconomicData(data);
      }
    }
    return true;
  } catch (error) {
    console.error('Error collecting economic data:', error);
    return false;
  }
}

/**
 * Batch collect all data for multiple stocks
 */
export async function collectDataForMultipleStocks(symbols: string[]): Promise<Map<string, unknown>> {
  const results = new Map<string, unknown>();

  for (const symbol of symbols) {
    const data = await collectAllStockData(symbol);
    results.set(symbol, data);
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

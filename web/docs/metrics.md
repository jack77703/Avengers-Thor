# Dashboard Metrics Documentation

This document explains the meaning and source of each metric displayed on the Financial KOL Tracker dashboard.

## Metrics Overview

| Metric | Description | Source |
| :--- | :--- | :--- |
| **Rank** | The stock's current position in the top 30 trending list. `#1` is the most trending stock. | StockTwits API (`rank`) |
| **Symbol** | The stock ticker symbol (e.g., `$AAPL`, `$BTC.X`). | StockTwits API (`symbol`) |
| **Company Name** | The full name of the company or asset. | StockTwits API (`title`) |
| **Watchers** | The total number of StockTwits users who have this stock in their watchlist. This indicates long-term popularity. | StockTwits API (`watchlist_count`) |
| **Trending Score** | A proprietary score assigned by StockTwits to quantify the intensity of the current trend. Higher is better. | StockTwits API (`trending_score`) |
| **Sector** | The broad economic sector the company belongs to (e.g., "Technology Services"). | StockTwits API (`sector`) |
| **Industry** | The specific industry within the sector (e.g., "Packaged Software"). | StockTwits API (`industry`) |
| **Market Cap** | The total market value of the company's outstanding shares. Formatted as Millions (M), Billions (B), or Trillions (T). | StockTwits API (`fundamentals.MarketCap`) |
| **% Change** | The percentage change in the stock's price. Source: **Finnhub API** (Real-time/Delayed). | Finnhub API (`dp`) |

## Data Updates
- **Refresh Rate**: The dashboard fetches new data every time the page is refreshed.
- **Caching**: Data is cached for 5 minutes to respect API rate limits.

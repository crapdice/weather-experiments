# Data Lifecycle & Synchronization

This document outlines how the weather application maintains, updates, and "fills in" missing weather data across different environments.

## 1. Data Sources
The application uses a hybrid data strategy involving multiple high-reliability APIs. For a full list of providers, licenses, and attribution, see [Data Sources](./data-sources.md).

*   **Static Archives**: Long-term weather history is stored in CSV format within `public/` (for client access) and `private_data/` (for server-side processing).
*   **High-Fidelity Source**: Chicago data (KORD) uses a hybrid of **NWS ACIS** (station-grade) and **Open-Meteo Archive** data.
*   **Global Source**: Other cities primarily leverage the **Open-Meteo Archive API**.

## 2. The Daily Sync Logic (Permanent Updates)
To keep the static CSV archives current, an automated process runs in production.

*   **Trigger**: GitHub Actions (`.github/workflows/sync-weather.yml`) runs daily at **00:00 UTC**.
*   **Command**: `node scripts/sync-data.mjs`
*   **Action**:
    1.  Reads the last date recorded in the existing CSV.
    2.  Calculates the "gap" between that date and yesterday.
    3.  Fetches missing days from the APIs.
    4.  Appends records and commits the updated CSV back to the repository.

## 3. Runtime "Stitching" (Real-time Filling)
Because the GitHub Sync only runs once a day, the app ensures the UI is always up-to-the-minute using a memory-only "stitching" process.

*   **Trigger**: User navigates to a dashboard.
*   **Logic**:
    1.  The app loads the static CSV data.
    2.  Simultaneously, `fetchCurrentWeather` calls the live API to get the last 14 days of weather.
    3.  The app compares the dates and **merges** any missing daily records into the operational dataset in-memory.
*   **Result**: The UI shows today's data even if the underlying CSV is 24-48 hours behind.

## 4. Local Development
GitHub Actions do **not** run on your local machine. Your local CSV files will stay static unless manually updated.

### Manually Updating Local Data
To synchronize your local CSV files with the latest weather data:
```bash
node scripts/sync-data.mjs
```

### Repairing Cities
If a city's data is corrupted or needs a full historical rebuild from 1940:
```bash
node scripts/rebuild-database.mjs
```
*(Note: This skips Chicago to preserve its high-fidelity dataset unless modified.)*

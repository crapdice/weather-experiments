# External Data Sources

This application relies on a combination of high-fidelity meteorological stations and global reanalysis models to provide 80+ years of weather history and real-time insights.

## 1. Open-Meteo API
The primary engine for global weather data and real-time updates.

*   **Open-Meteo Archive API**: Used for historical backfills (1940–present). Provides high-resolution reanalysis data when station-specific data is unavailable.
*   **Open-Meteo Forecast API**: Used for real-time current conditions and the 14-day "recent history" used during runtime stitching.
*   **Attribution**: Weather data provided by [Open-Meteo.com](https://open-meteo.com/) under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.
*   **API Usage**:
    *   `https://archive-api.open-meteo.com/v1/archive`
    *   `https://api.open-meteo.com/v1/forecast`

## 2. NWS ACIS (Applied Climate Information System)
Used specifically for high-precision station data (Chicago / KORD).

*   **Provider**: Regional Climate Centers (RCCs) via the Applied Climate Information System.
*   **Usage**: Provides the "Gold Standard" station-level data for O'Hare Airport. This ensures that the Chicago dataset matches official National Weather Service records exactly, rather than relying on satellite reanalysis.
*   **API Usage**:
    *   `https://data.rcc-acis.org/StnData`

## 3. Google Gemini API
The intelligence source for the "Climatology Narrator."

*   **Model**: `gemini-2.0-flash`
*   **Usage**: Processes statistical anomalies (z-scores, percentiles) and historical records to generate natural language briefings.
*   **Configuration**: Requires `GOOGLE_GEMINI_API_KEY` in the `.env` file.

## 4. Local Curated Datasets
Our internal datasets are stored as CSVs and represent a cleaned, synchronized version of the above sources.

*   **`private_data/`**: Master archival records. Not web-accessible.
*   **`public/`**: Optimized distribution files. Web-accessible for client-side visualizations.
*   **File Naming**:
    *   `chicago_weather_v86.csv` (High-fidelity NWS/Open-Meteo hybrid)
    *   `{city}_weather.csv` (Standard Open-Meteo archival track)

---

## Technical Mapping
The app maps geographic coordinates to these sources in `src/config/cityConfig.ts`. If a city is marked for high-fidelity sync, the `sync-data.mjs` script will attempt to use ACIS before falling back to Open-Meteo.

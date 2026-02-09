# KORD Intelligence Architecture Audit Report
**Generated:** 2026-02-08  
**Severity:** Multiple organizational issues identified

---

## Executive Summary

The codebase exhibits classic symptoms of **organic growth without architectural planning**. While functionality works, the file structure has accumulated inconsistencies that hurt maintainability, onboarding, and future development.

**Key Issues:**
1. Duplicate/redundant files across directories
2. Inconsistent component organization patterns
3. `utils/` has become a dumping ground (22 files!)
4. Mixed concerns (data, UI, business logic) in same directories
5. Empty placeholder directories
6. Orphaned debug/temp files in root
7. Data scattered between `public/` and `private_data/`

---

## Current Structure Analysis

### 🔴 Critical Problems

#### 1. `src/utils/` is Overloaded (22 files)
This folder has become the "junk drawer" of the project:

| File | Actual Domain |
|------|---------------|
| `cityConfig.ts` | Configuration |
| `cityStorage.ts` | Persistence/Storage |
| `weatherData.ts`, `serverWeatherData.ts` | Data Fetching |
| `dataProcessor.ts`, `weatherProcessor.ts` | Data Transformation |
| `statisticalEngine.ts`, `seasonalEngine.ts` | Business Logic/Analytics |
| `geolocation.ts`, `ipGeoLookup.ts` | Geolocation Services |
| `narratorPayload.ts` | AI Preparation |
| `UniversalFeedbackWidget.ts` | UI Component (!)
| `adminSettings.ts` | Admin Config |
| `*.test.ts` | Tests mixed with source |

**Problem:** No clear boundaries. A developer looking for "the weather data loading logic" has to scan 22 files.

#### 2. Inconsistent Component Organization
Some components use folder structure, others don't:
```
src/components/
├── Dashboard/              ← ✅ Folder with sub-components
│   ├── Metrics/           ← ✅ Nested folder pattern
│   └── NarratorCard.tsx
├── OverviewChart/          ← ✅ Folder pattern
├── Admin/                  ← ⚠️ Only 1 file, should be flat
├── SatelliteHeader/        ← 🔴 EMPTY FOLDER (artifact)
├── SatelliteHeader.tsx     ← ⚠️ Orphan file next to empty folder
├── TerminalGlobe.tsx       ← Should be in SatelliteHeader/
├── PostProcessor.tsx       ← Should be in SatelliteHeader/
├── ClimateStripes.tsx      ← Should be in a Charts/ folder
├── ThermalTopo.tsx         ← Should be in Charts/
├── WeatherFingerprint.tsx  ← Should be in Charts/
└── ... 22 more flat files
```

**Problem:** No discoverability pattern. Developers can't predict where to find/add components.

#### 3. `src/lib/` vs `src/services/` Confusion
Both directories contain "service-like" code:
- `lib/supabaseAdmin.ts` - DB client
- `lib/auth.ts` - Auth helpers
- `lib/narrator/` - AI prompt generation
- `services/aiLogger.ts` - AI logging
- `services/weatherFetcher.ts` - API calls

**Problem:** No clear rule for what goes where.

#### 4. Data Files Scattered
CSV weather data exists in TWO places:
- `public/` - 10 CSV files (some tiny stubs like `denver_weather.csv` at 123 bytes)
- `private_data/` - 8 CSV files (actual data)

**Problem:** Unclear which is canonical. Risk of divergence.

#### 5. Root Directory Pollution
```
weather-app/
├── dashboard_d7.txt        ← ?? Debug file
├── lint_results.txt        ← ?? Should be in .gitignore
├── ts_errors.txt           ← ?? Should be in .gitignore
├── funny-responses.jsom    ← Typo extension, should be deleted
├── additional-types.d.ts   ← Should be in src/types/
```

#### 6. Scripts Directory Chaos (20+ files)
```
scripts/
├── analyze_snow.js         ← Duplicated logic
├── analyze_snow_clean.js   ← "Clean" version?
├── analyze_snow_ytd.js     ← Yet another variant
├── check_blizzards.js      ← One-off analysis
├── check_headers.js        ← One-off utility
├── check_recent_snow.js    ← One-off analysis
├── sync-data.mjs           ← Important!
├── security_test.py        ← Python in a JS project?
└── ... 12 more
```

**Problem:** No organization. Mix of critical scripts, one-off analysis, and debug utilities.

---

## 🟢 Recommended Target Architecture

```
weather-app/
├── .github/                           # CI/CD
├── docs/                              # Documentation
├── scripts/
│   ├── data/                          # Data sync & management
│   │   ├── sync-data.mjs
│   │   ├── fetch-city-data.mjs
│   │   └── rebuild-database.mjs
│   ├── analysis/                      # One-off data exploration
│   │   └── analyze_snow.js
│   └── migrations/                    # DB migrations
│       └── init_ai_logs.sql
├── data/
│   └── weather/                       # ALL weather CSVs (rename from private_data)
│       ├── chicago.csv
│       ├── nyc.csv
│       └── ...
├── public/
│   ├── assets/                        # Images, icons
│   │   ├── earth_mask.png
│   │   └── favicon.svg
│   └── widget/                        # Embeddable widget
│       └── kord-widget.js
│
├── src/
│   ├── app/                           # Next.js App Router (unchanged)
│   │   ├── api/
│   │   ├── city/
│   │   └── ...
│   │
│   ├── components/
│   │   ├── core/                      # Shared primitives
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ShadowPortal.tsx
│   │   │   └── Providers.tsx
│   │   ├── layout/                    # App shell
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── DashboardHeader.tsx
│   │   ├── header/                    # Satellite header feature
│   │   │   ├── SatelliteHeader.tsx
│   │   │   ├── TerminalGlobe.tsx
│   │   │   ├── PostProcessor.tsx
│   │   │   └── shaders/
│   │   │       └── TerminalShader.ts
│   │   ├── charts/                    # All data visualizations
│   │   │   ├── OverviewChart/
│   │   │   ├── ClimateStripes.tsx
│   │   │   ├── ThermalTopo.tsx
│   │   │   ├── WeatherFingerprint.tsx
│   │   │   ├── SunriseChart.tsx
│   │   │   ├── RadialCompass.tsx
│   │   │   └── SeasonalComparison.tsx
│   │   ├── dashboard/                 # Dashboard feature
│   │   │   ├── Dashboard.tsx
│   │   │   ├── metrics/
│   │   │   ├── NarratorCard.tsx
│   │   │   └── SummaryMetrics.tsx
│   │   ├── admin/                     # Admin panel
│   │   │   └── AdminSettingsPanel.tsx
│   │   └── geolocation/               # Location detection
│   │       ├── GeoRedirect.tsx
│   │       └── PreciseLocationButton.tsx
│   │
│   ├── config/                        # App configuration
│   │   ├── cities.ts                  # City definitions
│   │   └── seasons.ts                 # Season registry
│   │
│   ├── context/                       # React contexts (unchanged)
│   │   ├── AdminContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/                         # Custom hooks (unchanged)
│   │   ├── useDimensions.ts
│   │   └── useWeather.ts
│   │
│   ├── lib/                           # External integrations
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── admin.ts
│   │   ├── auth.ts
│   │   └── narrator/                  # AI prompt system
│   │       ├── promptTemplate.ts
│   │       └── hydratePrompt.ts
│   │
│   ├── services/                      # Business logic & API calls
│   │   ├── weather/
│   │   │   ├── fetcher.ts             # API calls
│   │   │   ├── processor.ts           # Data transformation
│   │   │   └── loader.ts              # CSV/client loading
│   │   ├── analytics/
│   │   │   ├── statisticalEngine.ts
│   │   │   └── seasonalEngine.ts
│   │   ├── geolocation/
│   │   │   ├── ipLookup.ts
│   │   │   └── browserGeo.ts
│   │   └── logging/
│   │       └── aiLogger.ts
│   │
│   ├── types/                         # TypeScript types
│   │   ├── weather.ts
│   │   └── narrator.ts
│   │
│   └── utils/                         # Pure utility functions ONLY
│       ├── dateUtils.ts
│       ├── storage.ts                 # localStorage helpers
│       └── accessors.ts               # Generic data accessors
│
└── tests/                             # All tests co-located
    ├── unit/
    │   ├── services/
    │   └── utils/
    └── e2e/
```

---

## Migration Plan (Prioritized)

### Phase 1: Cleanup (Low Risk, High Impact)
1. **Delete orphan files:**
   - `src/components/SatelliteHeader/` (empty folder)
   - `funny-responses.jsom`
   - `dashboard_d7.txt`, `lint_results.txt`, `ts_errors.txt`
   - `jfpjsdfp` (if exists)

2. **Move root type file:**
   - `additional-types.d.ts` → `src/types/additional.d.ts`

3. **Consolidate data:**
   - Delete stub CSVs in `public/` (denver 123 bytes, etc.)
   - OR sync public from private_data if public is the canonical source

### Phase 2: Utils Decomposition (Medium Risk)
Split `src/utils/` by domain:
1. Move `cityConfig.ts`, `seasonRegistry.ts` → `src/config/`
2. Move `weatherData.ts`, `serverWeatherData.ts`, `weatherProcessor.ts`, `dataProcessor.ts` → `src/services/weather/`
3. Move `statisticalEngine.ts`, `seasonalEngine.ts` → `src/services/analytics/`
4. Move `geolocation.ts`, `ipGeoLookup.ts` → `src/services/geolocation/`
5. Move `cityStorage.ts` → `src/utils/storage.ts`
6. Move `narratorPayload.ts` → `src/lib/narrator/`
7. **Delete** `UniversalFeedbackWidget.ts` from utils (duplicate of public/widget/)

### Phase 3: Component Reorganization (Higher Risk)
1. Create `src/components/charts/` and move all visualization components
2. Create `src/components/header/` for SatelliteHeader feature + move shaders
3. Create `src/components/layout/` for Sidebar, MobileNav, etc.
4. Create `src/components/geolocation/` for location features

### Phase 4: Scripts Organization
1. Create `scripts/data/` for sync operations
2. Create `scripts/analysis/` for one-off explorations
3. Move `init_ai_logs.sql` to `scripts/migrations/`
4. Archive or delete one-off debug scripts

---

## Quick Wins (Do Today)

```bash
# Delete empty/orphan files
rm -rf src/components/SatelliteHeader/    # Empty folder
rm funny-responses.jsom                    # Typo file
rm dashboard_d7.txt lint_results.txt ts_errors.txt  # Debug files

# Move misplaced type file
mv additional-types.d.ts src/types/

# Update .gitignore
echo "lint_results.txt" >> .gitignore
echo "ts_errors.txt" >> .gitignore
```

---

## Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Files in `utils/` | 22 | 5 |
| Empty directories | 1 | 0 |
| Root pollution files | 4+ | 0 |
| Component folders with pattern | 40% | 100% |
| Test files co-located with source | Yes | No (separate `/tests`) |

---

## Conclusion

The codebase is functional but has accumulated **architectural debt**. The recommended restructuring will:
1. **Improve discoverability** - Clear folder patterns
2. **Reduce cognitive load** - Smaller, focused directories
3. **Enable scaling** - New features have obvious homes
4. **Speed up onboarding** - Self-documenting structure

I recommend tackling **Phase 1 immediately** (10 minutes of cleanup) and **Phase 2 in a dedicated refactoring session** (2-3 hours with careful import updates).

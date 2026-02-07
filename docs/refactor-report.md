# Comprehensive Codebase Refactor & Cleanup Report

## 1. Executive Summary
This report provides a detailed technical audit of the `weather-app` repository. While the application is functional and visually rich, it has accumulated significant "root-level drift"—a collection of one-off scripts, build artifacts, and duplicated logic patterns that increase cognitive load for developers and risk build failures.

---

## 2. Priority 1: Environment Sanitation
**Goal:** Clean the workspace and ensure production dependencies are correctly mapped.

### 2.1 Technical Debt: Orphaned Root Files
The project root is cluttered with 15+ files that are not part of the Next.js application lifecycle.

**Actionable Instructions:**
1. **Clean Scripts:** Run `rm analyze_*.js`, `rm calculate_snow.js`, `rm check_*.js`, and `rm create_city_data.js`. If these are needed for data prep, move them to a new `/scripts` directory.
2. **Clean Artifacts:** Delete all `*.txt` files in the root (e.g., `build_output.txt`, `lint_results.txt`).
3. **Update GitIgnore:** Add the following lines to `.gitignore`:
   ```text
   # Build/Analysis Artifacts
   *.txt
   *.log
   ```

### 2.2 Dependency Mapping: lucide-react
`lucide-react` is used in `ThermalTopo.tsx` and `DashboardHeader.tsx` but is currently listed under `devDependencies`. This will cause "Module not found" errors in certain CI environments.

**Actionable Instructions:**
1. Run: `npm uninstall lucide-react`
2. Run: `npm install lucide-react`

---

## 3. Priority 2: Logic Consolidation (DRY)
**Goal:** Eliminate redundant code in D3 components and centralize types.

### 3.1 Refactor: Centralized Property Accessors
The current codebase accesses weather data using strings like `d['Min Temp (°F)']`. As discovered in the recent deployment fix, this is extremely sensitive to character encoding and lead to breakage.

**Implementation Guide:**
1. Create `src/utils/weatherAccessors.ts`.
2. Export const functions for every key:
   ```typescript
   export const getMinTemp = (d: WeatherRecord) => d['Min Temp (°F)'];
   export const getSnowfall = (d: WeatherRecord) => d['Snowfall (in)'];
   ```
3. Update all components (`WinterIntensity`, `PredictiveLab`, `ClimateStripes`) to use these getters.

### 3.2 Refactor: Component Resize Logic
Components like `WinterIntensity.tsx` and `ClimateStripes.tsx` manually manage `window.addEventListener('resize')`. This is already solved by the `useDimensions` hook.

**Implementation Guide:**
1. Identify `useEffect` blocks managing `handleResize`.
2. Replace with `const { width } = useDimensions(containerRef);`.
3. Remove local `widthState` and `useEffect` resize listeners.

---

## 4. Priority 3: Architectural Decomposition
**Goal:** Improve maintainability of core utility files.

### 4.1 Refactor: Split `weatherData.ts`
At 300+ lines, `weatherData.ts` acts as a "God Object" for the data layer.

**Instructions for Modularization:**
1. **`src/types/weather.ts`**: Move `WeatherRecord`, `ClimateStats`, and `SeasonalRank` interfaces here.
2. **`src/api/weatherFetcher.ts`**: Move `fetchCurrentWeather` and `refreshWeatherData`.
3. **`src/utils/weatherData.ts`**: Keep only the orchestration logic (`loadWeatherData`).

### 4.2 CSS Token Extraction
The `.glass-panel` class and various button styles are redefined many times within `style jsx` blocks.

**Implementation Guide:**
1. Extract the shared `.glass-panel` properties to `globals.css`.
2. Define a `.weather-btn` base class for the various interactive buttons.
3. Use `@apply` or standard CSS nesting in `globals.css` to reduce component-level style boilerplate.

---

## 5. Verification Checklist
After completing the refactor, ensure system stability by running:
1. `npm run build` (Ensures no type regressions)
2. `npm test` (Ensures calculation engine remains accurate)
3. `npx tsc --noEmit` (Final strict type check)

---
**Status:** Audit Complete | **Date:** Feb 7, 2026

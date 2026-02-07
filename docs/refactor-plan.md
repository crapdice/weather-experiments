# Weather App Refactor & Cleanup Plan

## 📋 Executive Summary
A deep dive into the weather-app codebase identifies several opportunities for cleanup and structural improvement. The primary goals are to eliminate technical debt (stale artifacts), improve type safety for special-character property keys, and reduce boilerplate through shared logic.

---

## 🔴 Priority 1: Immediate Cleanup & Dependency Fixes

### 1. Delete Orphaned Root Scripts
There are several one-off debugging and analysis scripts in the project root that should be removed or moved to the `scripts/` directory to keep the workspace clean.
- `analyze_snow.js`, `analyze_snow_clean.js`, `analyze_snow_ytd.js`
- `calculate_snow.js`, `check_blizzards.js`, `check_headers.js`, `check_recent_snow.js`
- `create_city_data.js`

### 2. Dependency Corrections
`lucide-react` is currently in `devDependencies` but is used in production components.
- **Action**: Move `lucide-react` to `dependencies` in `package.json`.

### 3. Remove Build Artifacts
Several log and output files are polluting the root directory.
- **Action**: Delete `build_output.txt`, `build_log.txt`, `lint_output.txt`, `lint_results.txt`, `tsc_output.txt`, `headers.txt`, `last_commits.txt`.
- **Action**: Add `*.txt` to `.gitignore`.

---

## 🟡 Priority 2: Code Consolidation (Low Effort, High Wins)

### 4. Property Key Accessors
Direct bracket access for properties with special characters (e.g., `d['Min Temp (°F)']`) is fragile and prone to encoding issues.
- **Proposed Solution**: Create a dedicated `src/utils/weatherAccessors.ts` to centralize all property access.
- **Benefits**: Improved Type safety, centralized encoding handling, and cleaner component code.

### 5. Shared Type Definitions
Many components duplicate identical `Props` interfaces.
- **Proposed Solution**: Centralize shared types in `src/types/weather.ts`.
- **Targets**: `WeatherDataProps`, `WeatherStatsProps`.

### 6. Leverage `useDimensions` Hook
Multiple D3 components (`WinterIntensity`, `ClimateStripes`, `PredictiveLab`) implement manual resize observers that duplicate logic already available in our `useDimensions` hook.
- **Action**: Refactor charts to use the existing hook.

### 7. Global Style Extraction
Common UI patterns (glass panels, reset buttons, chart headers) are duplicated across 21 `style jsx` blocks.
- **Proposed Solution**: Move core design tokens and common component classes into `src/app/globals.css`.

---

## 🟢 Priority 3: Structural Refactoring (Medium Effort)

### 8. Decomposition of `weatherData.ts`
The current `weatherData.ts` (305 lines) is overloaded with types, API logic, and data processing.
- **Proposed Solution**: Split into `types/weather.ts`, `api/weatherApi.ts`, and a cleaner `weatherData.ts` for orchestration.

### 9. D3 Helper Utilities
Consolidate the common "brush movement" type-casting workaround into a helper function to avoid repeated casts in every chart implementation.

---

## 📊 Implementation Roadmap

| Task | Category | Est. Time | Priority |
| :--- | :--- | :--- | :--- |
| Cleanup Scripts/Artifacts | Maintenance | 5 min | 🔴 High |
| Fix `lucide-react` | Deps | 2 min | 🔴 High |
| Type-safe Accessors | Safety | 20 min | 🔴 High |
| Shared Types/Hook Refactor | DRY | 30 min | 🟡 Med |
| Globals CSS Extraction | UI Sync | 30 min | 🟡 Med |
| `weatherData.ts` split | Architecture | 60 min | 🟢 Low |

---
**Last Updated**: 2026-02-07
**Author**: Antigravity Assistant

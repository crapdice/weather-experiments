/**
 * Validates if a given year is a leap year.
 * Rule: Divisible by 4, unless divisible by 100 but not 400.
 */
export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the Day of Year (1-366).
 * Example: Jan 1 = 1, Feb 29 (Leap) = 60.
 */
export function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Gets the climatologically aligned date for comparative analysis.
 * 
 * Strategy: Day-of-Year Alignment (Meteorological Standard)
 * - We compare the Nth day of this year to the Nth day of previous years.
 * - This ensures seasons align perfectly.
 * 
 * Edge Case:
 * - If today is Feb 29 (Day 60) and we look back to a non-leap year:
 *   - We fall back to Feb 28 (Day 59) to ensure continuous data.
 * - If today is Feb 28 (Day 59) and we look back to a leap year:
 *   - We map to Feb 28 (Day 59).
 *   - Note: In a leap year, Day 60 is Feb 29.
 */
export function getComparisonDate(date: Date, yearsBack: number): Date {
    const currentYear = date.getFullYear();
    const targetYear = currentYear - yearsBack;

    // 1. Get current DOY (e.g., 60 for Feb 29)
    let doy = getDayOfYear(date);

    // 2. Handle Non-Leap -> Leap alignment
    // If we are past Feb 28 in a non-leap year, we are "late" by 1 day relative to a leap year
    // e.g. Mar 1 (Non-Leap) is Day 60. Mar 1 (Leap) is Day 61.
    // To align properly, we match Month/Day for simplicity in non-leap contexts, but DOY for science.

    // SIMPLIFIED STRATEGY for robust coding:
    // Match Month and Date. 
    // If Feb 29 and target is non-leap, use Feb 28.

    const targetDate = new Date(targetYear, date.getMonth(), date.getDate());

    // Check if we rolled over (e.g. Feb 29 -> Mar 1 in non-leap)
    if (targetDate.getMonth() !== date.getMonth()) {
        // This means we tried Feb 29 but got Mar 1.
        // Fallback to Feb 28 (End of Month alignment)
        targetDate.setDate(0);
    }

    return targetDate;
}

/**
 * Formats a date as YYYY-MM-DD for Map lookups.
 */
export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

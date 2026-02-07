/**
 * Utility for date-related calculations throughout the app.
 * Ensuring leap-year consistency is a primary goal.
 */

/**
 * Returns a consistent Day of Year (1-366).
 * Uses a reference leap year (2000) so that specific calendar days (like March 1st) 
 * always have the same index (61) regardless of whether the current year is a leap year.
 */
export function getDayOfYear(date: Date): number {
    const refDate = new Date(2000, date.getMonth(), date.getDate());
    const start = new Date(2000, 0, 0);
    const diff = (refDate.getTime() - start.getTime()) + ((start.getTimezoneOffset() - refDate.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Formats a date to YYYY-MM-DD string.
 */
export function formatISODate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Internal helper to map a date to a leap-year-safe reference season window.
 * Default is July 1999 to June 2000.
 */
export function getLeapSafeSeasonDate(date: Date, startMonth: number): Date {
    const m = date.getMonth();
    const d = date.getDate();
    // If month is >= startMonth (e.g. July), it's the first half of the season.
    // Map to 1999 so that Feb 29 (which will land in 2000) is included.
    const refYear = m >= startMonth ? 1999 : 2000;
    return new Date(refYear, m, d);
}

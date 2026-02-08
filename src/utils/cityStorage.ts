/**
 * localStorage key for persisting user's city preference
 */
export const STORAGE_KEY = 'kord-intel-city';

/**
 * Gets the saved city ID from localStorage.
 * @returns The saved city ID (lowercase) or null if not found
 */
export function getSavedCity(): string | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        // localStorage might be blocked (private browsing, etc.)
        return null;
    }
}

/**
 * Saves the city ID to localStorage.
 * @param cityId The city ID to save (will be lowercased)
 */
export function saveCity(cityId: string): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, cityId.toLowerCase());
    } catch {
        // localStorage might be blocked or full
        console.warn('Failed to save city preference to localStorage');
    }
}

/**
 * Clears the saved city from localStorage.
 */
export function clearSavedCity(): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore errors
    }
}

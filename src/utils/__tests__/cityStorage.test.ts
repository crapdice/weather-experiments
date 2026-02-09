import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSavedCity, saveCity, clearSavedCity, STORAGE_KEY } from '../cityStorage';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('cityStorage', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('getSavedCity', () => {
        it('returns null when no city is saved', () => {
            expect(getSavedCity()).toBeNull();
        });

        it('returns saved city ID when present', () => {
            localStorageMock.setItem(STORAGE_KEY, 'mia');
            expect(getSavedCity()).toBe('mia');
        });

        it('returns null when localStorage is not available', () => {
            const originalLocalStorage = global.localStorage;
            // @ts-expect-error - intentionally testing undefined case
            delete global.localStorage;
            expect(getSavedCity()).toBeNull();
            Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
        });
    });

    describe('saveCity', () => {
        it('saves city ID to localStorage', () => {
            saveCity('par');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'par');
        });

        it('lowercases city ID before saving', () => {
            saveCity('CHI');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'chi');
        });
    });

    describe('clearSavedCity', () => {
        it('removes saved city from localStorage', () => {
            localStorageMock.setItem(STORAGE_KEY, 'lax');
            clearSavedCity();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
        });
    });
});

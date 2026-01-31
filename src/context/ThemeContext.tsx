"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'cyber-ice' | 'solar-paper' | 'emerald-grid';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('weather-app-theme') as Theme;
            return saved || 'cyber-ice';
        }
        return 'cyber-ice';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('weather-app-theme', newTheme);
        }
    };

    // Subsequent updates to the DOM based on theme state
    useEffect(() => {
        const doc = document.documentElement;
        // Remove all theme classes first
        doc.classList.remove('theme-solar-paper', 'theme-emerald-grid');

        // Add new theme class (cyber-ice is default/root)
        if (theme === 'solar-paper') doc.classList.add('theme-solar-paper');
        if (theme === 'emerald-grid') doc.classList.add('theme-emerald-grid');
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

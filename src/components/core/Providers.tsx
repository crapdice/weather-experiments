"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import { AdminProvider } from "@/context/AdminContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AdminProvider>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </AdminProvider>
    );
}

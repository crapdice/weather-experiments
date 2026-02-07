"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
    isAdmin: boolean;
    loading: boolean;
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch('/api/auth/status');
                const data = await res.json();
                setIsAdmin(data.isAdmin);
            } catch (err) {
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        }
        checkStatus();
    }, []);

    const login = async (password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                setIsAdmin(true);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setIsAdmin(false);
    };

    return (
        <AdminContext.Provider value={{ isAdmin, loading, login, logout }}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}

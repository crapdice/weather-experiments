"use client";

import React from 'react';

export function LoadingState() {
    return (
        <div className="loading-container">
            <div className="loader"></div>
            <p>Catching up with recent climate events...</p>
            <style jsx>{`
                .loading-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    color: var(--accent-1);
                    background: #0B0E14;
                }
                .loader {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.03);
                    border-top-color: var(--accent-1);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

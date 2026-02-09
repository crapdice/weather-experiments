"use client";

import React, { useState } from 'react';
import { Menu, X, Activity, ArrowLeftRight, FlaskConical, RefreshCw, Database } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

interface MobileNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function MobileNav({ currentView, onViewChange, onRefresh, isRefreshing }: MobileNavProps) {
  const { isAdmin } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavClick = (view: string) => {
    onViewChange(view);
    setIsOpen(false);
  };

  return (
    <div className="mobile-nav-wrapper">
      <header className="mobile-header glass-panel">
        <h1 className="mobile-title">KORD Intel</h1>
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {isOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMenu}>
          <nav className="mobile-menu glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Operational Controls</h3>
            </div>

            <div className="menu-items">
              <button
                className={currentView === 'overview' ? 'active' : ''}
                onClick={() => handleNavClick('overview')}
              >
                <Activity size={20} />
                Historical Overview
              </button>
              <button
                className={currentView === 'comparison' ? 'active' : ''}
                onClick={() => handleNavClick('comparison')}
              >
                <ArrowLeftRight size={20} />
                Yearly Comparison
              </button>
              <button
                className={currentView === 'lab' ? 'active' : ''}
                onClick={() => handleNavClick('lab')}
              >
                <FlaskConical size={20} />
                Climate Lab (Beta)
              </button>
              {isAdmin && (
                <button
                  className={currentView === 'admin-logs' ? 'active' : ''}
                  onClick={() => handleNavClick('admin-logs')}
                >
                  <Database size={20} />
                  Intelligence Archives
                </button>
              )}
            </div>

            <div className="menu-section">
              <button
                className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                disabled={isRefreshing}
              >
                <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
                {isRefreshing ? 'Syncing...' : 'Fetch Latest Data'}
              </button>
            </div>
          </nav>
        </div>
      )}

      <style jsx>{`
        .mobile-nav-wrapper {
          display: none;
          z-index: 1000;
        }

        .mobile-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
          background: var(--bg-page);
          backdrop-filter: blur(10px);
        }

        .mobile-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--accent-1);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .menu-toggle {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: flex-end;
        }

        .mobile-menu {
          width: 80%;
          max-width: 300px;
          height: 100%;
          border-radius: 0;
          border-top: none;
          border-right: none;
          border-bottom: none;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .menu-header h3 {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: var(--accent-1);
          letter-spacing: 0.5px;
          font-weight: 800;
        }

        .menu-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .menu-items button {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 14px 16px;
          text-align: left;
          font-family: inherit;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .menu-items button.active {
          background: var(--accent-1);
          color: var(--bg-page);
          font-weight: bold;
        }

        .refresh-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 210, 255, 0.1);
          border: 1px solid var(--accent-1);
          color: var(--accent-1);
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.95rem;
          cursor: pointer;
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .mobile-nav-wrapper {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

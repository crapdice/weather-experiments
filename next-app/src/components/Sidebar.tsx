"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Activity, ArrowLeftRight, FlaskConical, LayoutDashboard, RefreshCw } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  recs: number;
  startDate: Date | null;
  endDate: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Sidebar({ currentView, onViewChange, recs, startDate, endDate, isRefreshing, onRefresh }: SidebarProps) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'cyber-ice', name: 'Cyber-Ice' },
    { id: 'solar-paper', name: 'Solar-Paper' },
    { id: 'emerald-grid', name: 'Emerald-Grid' },
  ] as const;

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <h1>Operational Controls</h1>
      </div>

      <nav className="sidebar-nav">
        <button
          className={currentView === 'overview' ? 'active' : ''}
          onClick={() => onViewChange('overview')}
        >
          <Activity size={18} />
          Historical Overview
        </button>
        <button
          className={currentView === 'comparison' ? 'active' : ''}
          onClick={() => onViewChange('comparison')}
        >
          <ArrowLeftRight size={18} />
          Yearly Comparison
        </button>
        <button
          className={currentView === 'lab' ? 'active' : ''}
          onClick={() => onViewChange('lab')}
        >
          <FlaskConical size={18} />
          Climate Lab (Beta)
        </button>
      </nav>

      <div className="sidebar-section">
        <h3>Live Intelligence Feed</h3>
        <button
          className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Fetch Latest Data'}
        </button>
      </div>

      <div className="sidebar-section">
        <h3>System Diagnostics</h3>
        <div className="diagnostic-box">
          <p><span>Archive Start:</span> {startDate?.toLocaleDateString() || 'N/A'}</p>
          <p><span>Archive End:</span> {endDate?.toLocaleDateString() || 'N/A'}</p>
          <p><span>Records:</span> {recs.toLocaleString()}</p>
          <p><span>Format:</span> High-Fidelity Time Series</p>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Aesthetic Style</h3>
        <div className="theme-selector">
          {themes.map(t => (
            <label key={t.id} className="theme-option">
              <input
                type="radio"
                name="theme"
                checked={theme === t.id}
                onChange={() => setTheme(t.id)}
              />
              <span className="radio-label">{t.name}</span>
            </label>
          ))}
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          position: sticky;
          top: 20px;
        }

        .sidebar-header h1 {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--accent-1);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-nav button {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 12px 16px;
          text-align: left;
          font-family: inherit;
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .sidebar-nav button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .sidebar-nav button.active {
          background: var(--accent-1);
          color: var(--bg-page);
          font-weight: bold;
        }

        .sidebar-section h3 {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: var(--accent-1);
          margin-bottom: 12px;
          letter-spacing: 0.5px;
          font-weight: 800;
        }

        .refresh-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          background: rgba(0, 210, 255, 0.1);
          border: 1px solid var(--accent-1);
          color: var(--accent-1);
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--accent-1);
          color: var(--bg-page);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .diagnostic-box {
          font-size: 0.75rem;
          color: var(--text-secondary);
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .diagnostic-box span {
          color: var(--text-primary);
          font-weight: bold;
        }

        .theme-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 4px 0;
        }

        .radio-label {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        input[type="radio"]:checked + .radio-label {
          color: var(--accent-1);
          font-weight: bold;
        }

        @media (max-width: 1024px) {
          .sidebar {
            display: none; /* Mobile side-drawer logic needed later */
          }
        }
      `}</style>
    </aside>
  );
}

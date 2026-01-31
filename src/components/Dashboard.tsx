"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { OverviewChart } from './OverviewChart';
import { ComparisonChart } from './ComparisonChart';
import { useWeather } from '@/hooks/useWeather';

// Refactored Sub-components
import { LoadingState } from './Dashboard/LoadingState';
import { DashboardHeader } from './Dashboard/DashboardHeader';
import { SummaryMetrics } from './Dashboard/SummaryMetrics';
import { LabContainer } from './Dashboard/LabContainer';

export function Dashboard() {
  const { data, stats, loading, refreshing, handleRefresh } = useWeather();
  const [view, setView] = useState('overview');
  const [labTab, setLabTab] = useState('stripes');

  if (loading) return <LoadingState />;

  return (
    <div className="dashboard-layout">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        recs={data.length}
        startDate={data.length > 0 ? data[0].Date : null}
        endDate={data.length > 0 ? data[data.length - 1].Date : null}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <MobileNav
        currentView={view}
        onViewChange={setView}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <main className="main-content">
        <DashboardHeader data={data} stats={stats} />

        <SummaryMetrics data={data} stats={stats} />

        <div className="chart-area glass-panel">
          {view === 'overview' && data.length > 0 && <OverviewChart data={data} />}
          {view === 'comparison' && data.length > 0 && <ComparisonChart data={data} />}
          {view === 'lab' && (
            <LabContainer labTab={labTab} setLabTab={setLabTab} data={data} />
          )}
        </div>

        <SummaryMetrics data={data} stats={stats} isSecondary />

        <footer className="footer">
          <hr />
          <p>KORD Intel Sandbox | Innovation & Reliability | A CrapDice Production</p>
        </footer>
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-page);
        }

        .main-content {
          flex: 1;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          min-width: 0;
        }

        .chart-area {
          min-height: 1200px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          background: var(--bg-component);
        }

        .footer {
          margin-top: 40px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.9rem;
          padding-bottom: 40px;
        }

        .footer hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 16px;
            padding-top: 80px;
            gap: 24px;
          }
          .chart-area {
            padding: 12px;
            min-height: 400px;
          }
        }
      `}</style>
    </div>
  );
}

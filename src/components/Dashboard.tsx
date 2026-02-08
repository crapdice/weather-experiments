"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { OverviewChart } from './OverviewChart';
import { ComparisonChart } from './ComparisonChart';
import { useWeather } from '@/hooks/useWeather';

import { CITIES } from '@/utils/cityConfig';

// Refactored Sub-components
import { LoadingState } from './Dashboard/LoadingState';
import { DashboardHeader } from './Dashboard/DashboardHeader';
import { SummaryMetrics } from './Dashboard/SummaryMetrics';
import { LabContainer } from './Dashboard/LabContainer';

import { useRouter } from 'next/navigation';

interface DashboardProps {
  initialCityId?: string;
}

export function Dashboard({ initialCityId }: DashboardProps) {
  const router = useRouter();

  React.useEffect(() => {
    // Dynamically import the custom element only on the client
    import("@/utils/UniversalFeedbackWidget");
  }, []);

  // Find initial city or default to CHI
  const initialCity = initialCityId
    ? CITIES.find(c => c.id === initialCityId)
    : CITIES[0];

  // We can just use the prop directly if we trust the router to remount us on navigation.
  // However, for smooth transitions, let's keep local state synced.
  const [selectedCity, setSelectedCity] = useState(initialCity || CITIES[0]);

  // Sync state if prop changes (e.g. back button navigation)
  React.useEffect(() => {
    if (initialCityId) {
      const found = CITIES.find(c => c.id === initialCityId);
      if (found) setSelectedCity(found);
    }
  }, [initialCityId]);

  const handleCityChange = (city: typeof CITIES[0]) => {
    // Navigate to the new route.
    // This will update the URL and trigger a re-render with new initialCityId
    router.push(`/city/${city.id.toLowerCase()}`);
    setSelectedCity(city); // Optimistic update
  };

  const { data, stats, loading, refreshing, handleRefresh } = useWeather(selectedCity);
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
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
      />

      <MobileNav
        currentView={view}
        onViewChange={setView}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <main className="main-content">
        <DashboardHeader data={data} stats={stats} city={selectedCity} />

        <SummaryMetrics data={data} stats={stats} city={selectedCity} />

        <div className="chart-area glass-panel">
          {view === 'overview' && data.length > 0 && <OverviewChart data={data} />}
          {view === 'comparison' && data.length > 0 && <ComparisonChart data={data} />}
          {view === 'lab' && (
            <LabContainer labTab={labTab} setLabTab={setLabTab} data={data} stats={stats} />
          )}
        </div>

        <SummaryMetrics data={data} stats={stats} city={selectedCity} isSecondary />

        <footer className="footer">
          <hr />
          <p>KORD Intel Sandbox | Innovation & Reliability | A CrapDice Production</p>
          {process.env.NEXT_PUBLIC_BUILD_TIME && (
            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '8px' }}>
              Last updated: {(() => {
                const date = new Date(process.env.NEXT_PUBLIC_BUILD_TIME);
                const day = date.getDate();
                const month = date.toLocaleString('default', { month: 'long' });
                const time = date.toTimeString().split(' ')[0];
                return `${day} ${month} ${time}`;
              })()}
            </p>
          )}
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
          background: var(--bg-page);
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

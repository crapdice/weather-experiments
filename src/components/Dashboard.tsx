"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MetricCard } from './MetricCard';
import { OverviewChart } from './OverviewChart';
import { ComparisonChart } from './ComparisonChart';
import { ClimateStripes } from './ClimateStripes';
import { ThermalTopo } from './ThermalTopo';
import { RadialCompass } from './RadialCompass';
import { WinterIntensity } from './WinterIntensity';
import { PredictiveLab } from './PredictiveLab';
import { loadWeatherData, refreshWeatherData, WeatherRecord, ClimateStats } from '@/utils/weatherData';

export function Dashboard() {
  const [data, setData] = useState<WeatherRecord[]>([]);
  const [stats, setStats] = useState<ClimateStats | null>(null);
  const [view, setView] = useState('overview');
  const [labTab, setLabTab] = useState('stripes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data, stats } = await loadWeatherData('/data/chicago_weather_50years.csv');
        setData(data);
        setStats(stats);
      } catch (err) {
        console.error("Failed to load weather data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleRefresh = async () => {
    if (refreshing || data.length === 0) return;
    setRefreshing(true);
    try {
      const { data: newData, stats: newStats } = await refreshWeatherData(data);
      setData(newData);
      setStats(newStats);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
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
        <header className="header">
          <h1 className="title">KORD Intelligence</h1>
          <p className="subtitle">
            Climate Data for Chicago O&apos;Hare | 1974 - {stats?.lastUpdate.getFullYear()}
          </p>
        </header>

        <section className="metrics-grid">
          <MetricCard
            label="Current Conditions"
            value={stats?.currentTemp !== undefined ? `${stats.currentTemp.toFixed(1)}°F` : '--°F'}
            subValues={stats?.todayMax !== undefined && stats?.todayMin !== undefined ? {
              high: `${stats.todayMax.toFixed(0)}°`,
              low: `${stats.todayMin.toFixed(0)}°`
            } : undefined}
            delta={stats?.currentTempTime ? `Real-time | ${stats.currentTempTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${stats.currentTempTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : "Real-time"}
            accent="secondary"
            help="The latest temperature reading from KORD via Open-Meteo, with today's high and low."
          />
          <MetricCard
            label="Real-time Precip"
            value={stats?.currentPrecip !== undefined ? `${stats.currentPrecip.toFixed(2)}"` : '--"'}
            delta="Current Intensity"
            accent="primary"
            help="The latest precipitation reading from KORD (Rain + Snow) in inches."
          />
          <MetricCard
            label="All-Time Max"
            value={`${stats?.maxTemp.toFixed(1)}°F`}
            delta={stats?.maxTempDate.getFullYear().toString()}
            help="The highest daily maximum temperature recorded at KORD between 1974 and today."
          />
          <MetricCard
            label="All-Time Min"
            value={`${stats?.minTemp.toFixed(1)}°F`}
            delta={stats?.minTempDate.getFullYear().toString()}
            accent="primary"
            help="The lowest daily minimum temperature recorded at KORD between 1974 and today."
          />
          <MetricCard
            label="Climate Pulse"
            value={`${stats?.pulseDelta.toFixed(2)}°F`}
            delta="Delta vs 50y Baseline"
            accent="secondary"
            help="The climatological anomaly: compares the last 30 days against the 50-year average for those same calendar days."
          />
          <MetricCard
            label="Decadal Shift"
            value={`${stats?.decadalDelta.toFixed(2)}°F`}
            delta="2020s vs 1970s"
            accent="ro"
            help="The difference in average temperature between the most recent decade and the first decade of records."
          />
        </section>

        <div className="chart-area glass-panel">
          {view === 'overview' && data.length > 0 && (
            <OverviewChart data={data} />
          )}

          {view === 'comparison' && data.length > 0 && (
            <ComparisonChart data={data} />
          )}

          {view === 'lab' && (
            <div className="lab-container">
              <div className="lab-tabs">
                <button className={labTab === 'stripes' ? 'active' : ''} onClick={() => setLabTab('stripes')}>Climate Stripes</button>
                <button className={labTab === 'topo' ? 'active' : ''} onClick={() => setLabTab('topo')}>3D Thermal Topo</button>
                <button className={labTab === 'radial' ? 'active' : ''} onClick={() => setLabTab('radial')}>Radial Compass</button>
                <button className={labTab === 'winter' ? 'active' : ''} onClick={() => setLabTab('winter')}>Winter Intensity</button>
                <button className={labTab === 'predictive' ? 'active' : ''} onClick={() => setLabTab('predictive')}>Predictive Lab</button>
              </div>
              <div className="lab-content">
                {labTab === 'stripes' && data.length > 0 && <ClimateStripes data={data} />}
                {labTab === 'topo' && data.length > 0 && <ThermalTopo data={data} />}
                {labTab === 'radial' && data.length > 0 && <RadialCompass data={data} />}
                {labTab === 'winter' && data.length > 0 && <WinterIntensity data={data} />}
                {labTab === 'predictive' && data.length > 0 && <PredictiveLab data={data} />}
              </div>
            </div>
          )}
        </div>

        <section className="metrics-grid secondary-metrics">
          <MetricCard label="Extreme Frost" value={stats?.frostDays || 0} delta="Days < 0°F" />
          <MetricCard label="Extreme Heat" value={stats?.heatDays || 0} delta="Days > 95°F" accent="secondary" />
          <MetricCard label="Volatility Index" value={`${stats?.volatility.toFixed(2)}°F`} delta="Avg Daily Δ" accent="ro" />
          <MetricCard label="Total Records" value={data.length.toLocaleString()} delta="High-Fid Samples" />
        </section>

        <footer className="footer">
          <hr />
          <p>KORD Intel Sandbox | Innovation & Reliability</p>
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

        .header {
          text-align: center;
        }

        .title {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--accent-1);
          margin-bottom: 8px;
          background: linear-gradient(to bottom, var(--accent-1), var(--accent-2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: var(--font-main);
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .chart-area {
          min-height: 1200px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          background: var(--bg-component);
        }

        .lab-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .lab-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }

        .lab-tabs button {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 8px 16px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9rem;
          border-radius: 4px;
        }

        .lab-tabs button:hover:not(:disabled) {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .lab-tabs button.active {
          color: var(--accent-1);
          background: rgba(0, 210, 255, 0.1);
        }

        .lab-tabs button:disabled {
          cursor: not-allowed;
          opacity: 0.3;
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
            padding-top: 80px; /* Space for mobile header */
            gap: 24px;
          }
          .title {
            font-size: clamp(1.5rem, 10vw, 2.2rem);
          }
          .subtitle {
            font-size: 0.9rem;
          }
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          }
          .chart-area {
            padding: 12px;
            min-height: 400px;
          }
          .lab-tabs {
            overflow-x: auto;
            white-space: nowrap;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }
          .lab-tabs button {
            padding: 6px 12px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}

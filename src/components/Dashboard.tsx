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
import { SunriseChart } from './SunriseChart';
import { useWeather } from '@/hooks/useWeather';
import { WeatherRecord, ClimateStats } from '@/utils/weatherData';

export function Dashboard() {
  const { data, stats, loading, refreshing, handleRefresh } = useWeather();
  const [view, setView] = useState('overview');
  const [labTab, setLabTab] = useState('stripes');

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
            Climate Data for Chicago O&apos;Hare | {data.length > 0 ? data[0].Year : '1940'} - {stats?.lastUpdate.getFullYear()}
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
          {/* 1. Sigma Score (The "Weirdness" Index) */}
          <MetricCard
            label={stats?.zScore !== undefined && stats.zScore > 0 ? "Heat Anomaly" : "Cold Anomaly"}
            value={stats?.zScore ? `${stats.zScore > 0 ? '+' : ''}${stats.zScore.toFixed(1)}σ` : '--'}
            delta={stats?.todayPercentile ? `Rarer than ${stats.todayPercentile > 50 ? stats.todayPercentile.toFixed(0) : (100 - stats.todayPercentile).toFixed(0)}% of days` : undefined}
            accent={Math.abs(stats?.zScore || 0) > 2 ? 'ro' : Math.abs(stats?.zScore || 0) > 1 ? 'secondary' : 'primary'}
            help="Standard Deviation from the mean. ±2σ represents a 1-in-20 year statistical event."
          />

          {/* 2. Streak Tracker */}
          <MetricCard
            label={stats?.currentStreak?.type || "Streak"}
            value={stats?.currentStreak ? `${stats.currentStreak.count} Days` : '--'}
            delta={`Started ${stats?.currentStreak?.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            accent={stats?.currentStreak && stats.currentStreak.count > 5 ? 'secondary' : 'primary'}
            help="Consecutive days maintaining the current temperature regime."
          />

          {/* 3. Analog Year */}
          <MetricCard
            label="Pattern Match"
            value={stats?.analogYear ? stats.analogYear.year.toString() : '--'}
            delta={stats?.analogYear ? `~${(stats.analogYear.similarityScore * 100).toFixed(0)}% Similarity` : undefined}
            accent="primary"
            help="The historical year with the most similar weather pattern to the last 30 days."
          />

          {/* 4. Seasonal Context (The "Pace" Metric) */}
          {(() => {
            const sStats = stats?.seasonalSnow?.seasonName === 'Winter' ? stats.seasonalSnow : stats?.seasonalRain;
            const unit = stats?.seasonalSnow?.seasonName === 'Winter' ? '" Snow' : '" Rain';
            const label = sStats?.seasonName + (stats?.seasonalSnow?.seasonName === 'Winter' ? ' Snow' : ' Rain');

            if (!sStats) return null;

            // e.g. "3rd Wettest Winter"
            const rankSuffix = (n: number) => {
              const j = n % 10, k = n % 100;
              if (j == 1 && k != 11) return "st";
              if (j == 2 && k != 12) return "nd";
              if (j == 3 && k != 13) return "rd";
              return "th";
            };

            const rankStr = `${sStats.rank}${rankSuffix(sStats.rank)}`;
            const description = sStats.rank === 1 ? `Record ${sStats.seasonName}` :
              sStats.rank <= 5 ? `Top 5 ${sStats.seasonName}` :
                sStats.rank >= sStats.totalYears - 5 ? `Top 5 Driest` :
                  `${rankStr} Wettest`;

            return (
              <MetricCard
                label={label}
                value={`${sStats.value.toFixed(1)}${unit}`}
                delta={`${description} (of ${sStats.totalYears} yrs)`}
                accent={sStats.rank <= 10 ? 'secondary' : 'primary'}
                help={`Ranking accumulated precipitation/snow for this season against all winters since 1940.`}
              />
            )
          })()}

          <MetricCard
            label="Current Wind"
            value={stats?.currentWind !== undefined ? `${stats.currentWind.toFixed(1)} mph` : '-- mph'}
            delta={stats?.currentGust ? `Gusts ${stats.currentGust.toFixed(1)} mph` : 'Calm'}
            accent={stats?.currentWind && stats.currentWind > 15 ? 'ro' : 'secondary'}
            help="Current sustained wind speed and peak gusts at O'Hare."
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
                <button className={labTab === 'sunrise' ? 'active' : ''} onClick={() => setLabTab('sunrise')}>Daylight Cycle</button>
                <button className={labTab === 'predictive' ? 'active' : ''} onClick={() => setLabTab('predictive')}>Predictive Lab</button>
              </div>
              <div className="lab-content">
                {labTab === 'stripes' && data.length > 0 && <ClimateStripes data={data} />}
                {labTab === 'topo' && data.length > 0 && <ThermalTopo data={data} />}
                {labTab === 'radial' && data.length > 0 && <RadialCompass data={data} />}
                {labTab === 'winter' && data.length > 0 && <WinterIntensity data={data} />}
                {labTab === 'sunrise' && data.length > 0 && <SunriseChart data={data} />}
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
          <MetricCard
            label="All-Time Max"
            value={`${stats?.maxTemp.toFixed(1)}°F`}
            delta={stats?.maxTempDate.getFullYear().toString()}
            help={`The highest daily maximum temperature recorded at KORD between ${data[0]?.Year || '1940'} and today.`}
          />
          <MetricCard
            label="All-Time Min"
            value={`${stats?.minTemp.toFixed(1)}°F`}
            delta={stats?.minTempDate.getFullYear().toString()}
            accent="primary"
            help={`The lowest daily minimum temperature recorded at KORD between ${data[0]?.Year || '1940'} and today.`}
          />
          <MetricCard
            label="Climate Pulse"
            value={`${stats?.pulseDelta.toFixed(2)}°F`}
            delta={`Delta vs ${data.length > 0 ? (new Date().getFullYear() - data[0].Year) : '85'}y Baseline`}
            accent="secondary"
            help={`The climatological anomaly: compares the last 30 days against the full archival average (since ${data[0]?.Year || '1940'}) for those same calendar days.`}
          />
          <MetricCard
            label="Decadal Shift"
            value={`${stats?.decadalDelta.toFixed(2)}°F`}
            delta="2020s vs 1970s"
            accent="ro"
            help="The difference in average temperature between the most recent decade and the first decade of records."
          />
        </section>

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

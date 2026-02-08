"use client";

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  help?: string;
  accent?: 'primary' | 'secondary' | 'ro';
  subValues?: {
    high: string | number;
    low: string | number;
    highLabel?: string;
    lowLabel?: string;
  };
  style?: React.CSSProperties;
}

export function MetricCard({ label, value, delta, help, accent = 'primary', subValues, style }: MetricCardProps) {
  const accentColor = accent === 'primary' ? 'var(--accent-1)' :
    accent === 'secondary' ? 'var(--accent-2)' :
      'var(--ro-line)';

  return (
    <div className="metric-card glass-panel" title={help} style={style}>
      <div className="card-top">
        <span className="metric-label">{label}</span>
        <div className="status-light" style={{ backgroundColor: accentColor }}></div>
      </div>

      <div className="value-container">
        <div className="metric-value-wrapper">
          <div className="metric-value">{value}</div>
          <div className="value-glow" style={{ color: accentColor }}>{value}</div>
        </div>

        {subValues && (
          <div className="sub-values">
            <div className="sub-value hgh">
              <span className="sub-label">{subValues.highLabel || 'HI'}</span>
              <span className="sub-num">{subValues.high}</span>
            </div>
            <div className="sub-value low">
              <span className="sub-label">{subValues.lowLabel || 'LO'}</span>
              <span className="sub-num">{subValues.low}</span>
            </div>
          </div>
        )}
      </div>

      {delta && (
        <div className="metric-delta-wrapper">
          <div className="metric-delta">{delta}</div>
        </div>
      )}

      {/* The Instrument Texture */}
      <div className="scanlines"></div>

      <style jsx>{`
        .metric-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          overflow: hidden;
          background: var(--bg-page);
          border: 1px solid var(--border-subtle);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .status-light {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
          opacity: 0.8;
        }

        .metric-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 1.5px;
          font-weight: 800;
          font-family: var(--font-inter);
          opacity: 0.7;
        }

        .value-container {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          margin: 4px 0;
        }

        .metric-value-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .metric-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: ${accentColor};
          font-family: var(--font-mono);
          position: relative;
          z-index: 2;
          letter-spacing: -1px;
        }

        .value-glow {
          position: absolute;
          top: 0;
          left: 0;
          font-size: 1.8rem;
          font-weight: 700;
          font-family: var(--font-mono);
          filter: blur(8px);
          opacity: 0.4;
          z-index: 1;
          letter-spacing: -1px;
          user-select: none;
          pointer-events: none;
        }

        .sub-values {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 4px;
        }

        .sub-value {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-family: var(--font-mono);
          font-weight: 700;
        }

        .sub-value.hgh { color: #ff5f40; }
        .sub-value.low { color: #00d2ff; }

        .sub-label {
          opacity: 0.4;
          font-size: 0.55rem;
          width: 14px;
        }

        .metric-delta-wrapper {
          display: flex;
          gap: 8px;
          align-items: baseline;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 8px;
        }

        .delta-lead {
          font-family: var(--font-mono);
          font-size: 0.55rem;
          color: var(--text-secondary);
          opacity: 0.3;
        }

        .metric-delta {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Scanline Overlay */
        .scanlines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.1) 50%
          );
          background-size: 100% 4px;
          z-index: 5;
          pointer-events: none;
          opacity: 0.3;
        }

        @media (max-width: 768px) {
          .metric-value { font-size: 1.4rem; }
          .value-glow { font-size: 1.4rem; }
          .metric-card { padding: 14px; }
        }
      `}</style>
    </div>
  );
}

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
import os
from fetch_weather import fetch_chicago_weather
from datetime import datetime, timedelta

# --- Page Configuration ---
st.set_page_config(
    page_title="Chicago O'Hare Weather Intelligence",
    page_icon="🌡️",
    layout="wide"
)

# --- Custom CSS ---
st.markdown("""
<style>
    [data-testid="stMetric"] {
        background: rgba(255, 255, 255, 0.03);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
    }
    .header-text {
        font-family: 'Inter', sans-serif;
        font-weight: 800;
        background: -webkit-linear-gradient(#00D2FF, #3a7bd5);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3.5rem;
        margin-bottom: 0px;
    }
    .pulse-widget {
        background: rgba(0, 242, 96, 0.05);
        border: 1px solid rgba(0, 242, 96, 0.2);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
    }
    .diagnostic {
        font-size: 0.7rem;
        color: #8892b0;
        background: rgba(255, 255, 255, 0.02);
        padding: 10px;
        border-radius: 5px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .lab-title {
        color: #FDBB2D;
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 10px;
    }
</style>
""", unsafe_allow_html=True)

# --- Data Loading & Sanitization ---
@st.cache_data
def load_data():
    csv_path = "chicago_weather_50years.csv"
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        df['Date'] = pd.to_datetime(df['Date'])
        
        # --- Check for Freshness ---
        latest_record = df['Date'].max().date()
        target_date = (datetime.now() - timedelta(days=2)).date() # Archive usually has 2-day lag
        
        if latest_record < target_date:
            with st.spinner("Catching up with recent climate events..."):
                start_fetch = (latest_record + timedelta(days=1)).strftime('%Y-%m-%d')
                new_records = fetch_chicago_weather(start_date=start_fetch)
                if not new_records.empty:
                    new_records['Date'] = pd.to_datetime(new_records['Date'])
                    df = pd.concat([df, new_records]).drop_duplicates(subset=['Date'])
                    df.to_csv(csv_path, index=False)
                    st.toast(f"Synchronized {len(new_records)} new records!", icon="🔄")
    else:
        with st.spinner("Accessing Historical Archive..."):
            df = fetch_chicago_weather()
            df['Date'] = pd.to_datetime(df['Date'])
            df.to_csv(csv_path, index=False)
    
    df = df.dropna(subset=['Date'])
    df = df.sort_values('Date')
    
    # Identify DayOfYear and Year
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Year'] = df['Date'].dt.year
    
    # --- Climatological Averages (50-year seasonal normals) ---
    climatology = df.groupby('DayOfYear')[['Max Temp (°F)', 'Min Temp (°F)']].mean().reset_index()
    climatology = climatology.rename(columns={
        'Max Temp (°F)': 'Mean High (°F)',
        'Min Temp (°F)': 'Mean Low (°F)'
    })
    
    # Merge and Cleanup
    df = df.merge(climatology, on='DayOfYear', how='left')
    
    # --- Analytics ---
    df['7-day SMA'] = df['Avg Temp (°F)'].rolling(window=7).mean()
    df['1-year ROC'] = df['Avg Temp (°F)'].diff(periods=365)
    
    return df

all_data = load_data()

# --- Global Diagnostics ---
max_d = all_data['Date'].max()
min_d = all_data['Date'].min()
hist_max = all_data['Max Temp (°F)'].max()
hist_max_date = all_data.loc[all_data['Max Temp (°F)'].idxmax(), 'Date']
hist_min = all_data['Min Temp (°F)'].min()
hist_min_date = all_data.loc[all_data['Min Temp (°F)'].idxmin(), 'Date']
pulse_delta = all_data['Avg Temp (°F)'].tail(30).mean() - all_data['Avg Temp (°F)'].mean()

# --- Sidebar ---
st.sidebar.title("Operational Controls")
app_mode = st.sidebar.selectbox("Analysis View", ["Historical Overview", "Yearly Comparison", "Climate Lab (Beta)"])

with st.sidebar:
    st.markdown("### System Diagnostics")
    st.markdown(f"""
    <div class="diagnostic">
    <b>Archive Start:</b> {min_d.date()}<br>
    <b>Archive End:</b> {max_d.date()}<br>
    <b>Records:</b> {len(all_data):,}<br>
    <b>Format:</b> High-Fidelity Time Series
    </div>
    """, unsafe_allow_html=True)
    st.divider()

# --- Header ---
col_h1, col_h2 = st.columns([2, 1])
with col_h1:
    st.markdown('<p class="header-text">KORD Intelligence</p>', unsafe_allow_html=True)
    st.markdown(f"**Climate Data for Chicago O'Hare | 1974 - {max_d.year}**")
with col_h2:
    status_label = "WARMER" if pulse_delta > 0 else "COOLER"
    st.markdown(f"""
    <div class="pulse-widget">
        <span style="color: #8892b0; font-size: 0.8rem; text-transform: uppercase;">Climate Pulse (30d)</span><br>
        <span style="font-size: 1.2rem; font-weight: bold; color: {'#FF4B2B' if pulse_delta > 0 else '#00D2FF'};">
            {pulse_delta:+.2f}°F {status_label}
        </span><br>
        <span style="color: #8892b0; font-size: 0.7rem;">Relative to 50y Baseline</span>
    </div>
    """, unsafe_allow_html=True)

# --- Visualizations ---
if app_mode == "Historical Overview":
    fig = make_subplots(
        rows=3, cols=1, 
        shared_xaxes=True,
        vertical_spacing=0.1, 
        subplot_titles=(
            "Thermal Distribution Spectrum (Seasonal Normals)", 
            "7-Day Volatility Trend", 
            "Year-over-Year Variance Delta"
        ),
        row_heights=[0.624, 0.188, 0.188]
    )

    # Core Traces
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean Low (°F)'], line=dict(width=0), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean High (°F)'], fill='tonexty', fillcolor='rgba(255, 255, 255, 0.05)', line=dict(width=0), name='Seasonal Range'), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean High (°F)'], name='Mean High', line=dict(color='#FF4B2B', width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean Low (°F)'], name='Mean Low', line=dict(color='#00D2FF', width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Avg Temp (°F)'], name='Daily Mean', line=dict(color='#A0A0A0', width=2)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['7-day SMA'], name='7d SMA', line=dict(color='#00F260', width=2)), row=2, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['1-year ROC'], name='YoY ROC', line=dict(color='#FDBB2D', width=1.5), fill='tozeroy', fillcolor='rgba(253, 187, 45, 0.05)'), row=3, col=1)

    # Annotations
    fig.add_annotation(x=hist_max_date, y=hist_max, text="MAX RECORD", showarrow=True, arrowhead=1, bgcolor="#FF4B2B", row=1, col=1)
    fig.add_annotation(x=hist_min_date, y=hist_min, text="MIN RECORD", showarrow=True, arrowhead=1, bgcolor="#00D2FF", row=1, col=1)

    # Area Annotation
    latest_val = all_data.iloc[-1]
    if pd.notnull(latest_val['1-year ROC']):
        temp_1y_ago = latest_val['Avg Temp (°F)'] - latest_val['1-year ROC']
        fig.add_annotation(
            x=latest_val['Date'], y=latest_val['1-year ROC'], 
            text=f"1Y AGO: {temp_1y_ago:.1f}°F", 
            showarrow=True, arrowhead=1, ax=-50, ay=-40,
            bgcolor="#FDBB2D", font=dict(color="black", size=10),
            row=3, col=1
        )

    fig.update_xaxes(
        row=1, col=1, showticklabels=True, 
        tickfont=dict(size=10, color="#8892b0"), tickformat="%b %Y",
        showgrid=True, gridcolor='rgba(255, 255, 255, 0.1)', type="date"
    )

    fig.update_xaxes(
        row=3, col=1, type="date",
        showgrid=True, gridcolor='rgba(255, 255, 255, 0.1)',
        rangeslider=dict(visible=True, thickness=0.04),
        rangeselector=dict(
            buttons=list([
                dict(count=7, label="7D", step="day", stepmode="backward"),
                dict(count=1, label="1M", step="month", stepmode="backward"),
                dict(count=6, label="6M", step="month", stepmode="backward"),
                dict(count=1, label="YTD", step="year", stepmode="todate"),
                dict(count=1, label="1Y", step="year", stepmode="backward"),
                dict(count=3, label="3Y", step="year", stepmode="backward"),
                dict(count=5, label="5Y", step="year", stepmode="backward"),
                dict(count=10, label="10Y", step="year", stepmode="backward"),
                dict(count=15, label="15Y", step="year", stepmode="backward"),
                dict(step="all", label="ALL")
            ]),
            y=1.1, x=0.5, xanchor="center",
            bgcolor="rgba(255, 255, 255, 0.1)", font=dict(color="white"),
            activecolor="#3a7bd5"
        )
    )

    fig.update_layout(
        height=1330, template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', 
        plot_bgcolor='rgba(0,0,0,0)', margin=dict(t=150, b=50), hovermode="x unified"
    )
    
    # DEFAULT VIEW: Last 1 Year
    one_year_ago = max_d - timedelta(days=365)
    fig.update_xaxes(range=[one_year_ago, max_d], row=3, col=1)
    
    st.plotly_chart(fig, use_container_width=True)

elif app_mode == "Yearly Comparison":
    years = sorted(all_data['Year'].unique(), reverse=True)
    year_1 = st.sidebar.selectbox("Primary Year", years, index=0)
    year_2 = st.sidebar.selectbox("Base Year", years, index=len(years)-1)

    df1 = all_data[all_data['Year'] == year_1].copy()
    df2 = all_data[all_data['Year'] == year_2].copy()
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df1['DayOfYear'], y=df1['Avg Temp (°F)'], name=f"{year_1}", line=dict(color='#FF4B2B', width=2)))
    fig.add_trace(go.Scatter(x=df2['DayOfYear'], y=df2['Avg Temp (°F)'], name=f"{year_2}", line=dict(color='#00D2FF', width=2, dash='dash')))
    fig.update_layout(
        title=f"Comparative Profile: {year_1} vs {year_2}",
        xaxis_title="Day of Year", yaxis_title="Temp (°F)",
        template="plotly_dark", height=600, hovermode="x unified"
    )
    st.plotly_chart(fig, use_container_width=True)

else:
    # --- Climate Lab (Experimental) ---
    st.markdown('<p class="lab-title">Experimental Climate Visualizers</p>', unsafe_allow_html=True)
    tab1, tab2, tab3 = st.tabs(["3D Thermal Topo", "Radial Compass", "Climate Stripes"])

    with tab1:
        st.subheader("3D Thermal Topography")
        st.caption("A physical landscape of Chicago weather. Peaks represent high anomalies; canyons represent cold snaps.")
        # Pivot into (Year x DOY) matrix
        pivot_df = all_data.pivot(index='Year', columns='DayOfYear', values='Avg Temp (°F)')
        # Re-index to ensure full year coverage 1-366
        pivot_df = pivot_df.reindex(columns=range(1, 367))
        
        fig = go.Figure(data=[go.Surface(
            z=pivot_df.values, 
            x=pivot_df.columns, 
            y=pivot_df.index,
            colorscale='Viridis'
        )])
        fig.update_layout(
            scene=dict(
                xaxis_title='Day of Year',
                yaxis_title='Year',
                zaxis_title='Temp (°F)',
                camera=dict(eye=dict(x=1.5, y=1.5, z=1.2))
            ),
            height=800, template="plotly_dark", margin=dict(l=0, r=0, b=0, t=40)
        )
        st.plotly_chart(fig, use_container_width=True)

    with tab2:
        st.subheader("Radial Climate Compass")
        st.caption("Seasonal migration over 50 years. Rings move from 1974 (center) to 2026 (outer).")
        # Sample every 10th year for clarity in the radial view to avoid clutter
        sampled_years = sorted(all_data['Year'].unique())[::5]
        fig = go.Figure()
        for year in sampled_years:
            df_year = all_data[all_data['Year'] == year]
            fig.add_trace(go.Scatterpolar(
                r=df_year['Avg Temp (°F)'],
                theta=df_year['DayOfYear'] * (360/366),
                mode='lines',
                name=str(year),
                line=dict(width=1, shape='spline')
            ))
        fig.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[-20, 100], ticksuffix="°F"),
                angularaxis=dict(tickvals=[0, 90, 180, 270], ticktext=["Jan", "Apr", "Jul", "Oct"])
            ),
            height=800, template="plotly_dark"
        )
        st.plotly_chart(fig, use_container_width=True)

    with tab3:
        st.subheader("Interactive Climate Stripes")
        st.caption("Each stripe is one month. Variation from the 50-year monthly baseline brings out extreme high-variance colors.")
        
        # 1. Create Monthly Avg Dataset
        all_data['Month'] = all_data['Date'].dt.month
        monthly_data = all_data.groupby(['Year', 'Month'])['Avg Temp (°F)'].mean().reset_index()
        
        # 2. Calculate 50y baseline for EVERY month (Jan mean, Feb mean...)
        monthly_baselines = monthly_data.groupby('Month')['Avg Temp (°F)'].mean().reset_index()
        monthly_baselines = monthly_baselines.rename(columns={'Avg Temp (°F)': '50y_Month_Mean'})
        
        # 3. Join and Calculate Anomaly
        monthly_data = monthly_data.merge(monthly_baselines, on='Month')
        monthly_data['Anomaly'] = monthly_data['Avg Temp (°F)'] - monthly_data['50y_Month_Mean']
        monthly_data = monthly_data.sort_values(['Year', 'Month'])
        monthly_data['Date_Label'] = monthly_data.apply(lambda x: datetime(int(x['Year']), int(x['Month']), 1).strftime('%b %Y'), axis=1)
        
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=list(range(len(monthly_data))),
            y=[1]*len(monthly_data),
            marker=dict(
                color=monthly_data['Anomaly'],
                colorscale='RdBu_r',
                cmid=0,
                showscale=True,
                colorbar=dict(title="Anomaly (°F)")
            ),
            customdata=monthly_data[['Date_Label', 'Avg Temp (°F)']],
            hovertemplate="<b>%{customdata[0]}</b><br>Avg: %{customdata[1]:.2f}°F<br>Anomaly: %{marker.color:+.2f}°F<extra></extra>"
        ))
        fig.update_layout(
            height=550, template="plotly_dark",
            xaxis=dict(
                showgrid=False, 
                title="Timeline (1974 - 2026)",
                tickvals=[0, 120, 240, 360, 480, 600],
                ticktext=["1974", "1984", "1994", "2004", "2014", "2024"],
                rangeslider=dict(visible=True, thickness=0.08),
                rangeselector=dict(
                    buttons=list([
                        dict(count=12, label="1Y", step="month", stepmode="backward"),
                        dict(count=60, label="5Y", step="month", stepmode="backward"),
                        dict(count=120, label="10Y", step="month", stepmode="backward"),
                        dict(step="all", label="ALL")
                    ]),
                    y=1.1, x=0.5, xanchor="center",
                    bgcolor="rgba(255, 255, 255, 0.1)", font=dict(color="white")
                )
            ),
            yaxis=dict(showgrid=False, showticklabels=False),
            margin=dict(t=80, b=40)
        )
        st.plotly_chart(fig, use_container_width=True)

# --- Regional Benchmarks ---
st.markdown("### Historical Benchmarks")
col1, col2, col3, col4 = st.columns(4)
with col1: st.metric("All-Time Max", f"{hist_max:.1f}°F", f"{hist_max_date.strftime('%Y')}")
with col2: st.metric("All-Time Min", f"{hist_min:.1f}°F", f"{hist_min_date.strftime('%Y')}")
with col3: st.metric("Rolling 30d Avg", f"{all_data['Avg Temp (°F)'].tail(30).mean():.1f}°F")
with col4: st.metric("Climate Pulse", f"{pulse_delta:+.2f}°F", "Delta vs 50y Baseline")

st.divider()
st.caption("KORD Intel Sandbox | Innovation & Reliability")

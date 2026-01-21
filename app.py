import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
from fetch_weather import fetch_chicago_weather

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
    .stPlotlyChart {
        margin-top: -30px;
    }
</style>
""", unsafe_allow_html=True)

# --- Data Loading & Sanitization ---
@st.cache_data
def load_data():
    csv_path = "chicago_weather_50years.csv"
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        with st.spinner("Accessing Historical Archive..."):
            df = fetch_chicago_weather()
            df.to_csv(csv_path, index=False)
    
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date') # Ensure chronological order for range selectors
    
    # --- Advanced Analytics ---
    df['7-day SMA'] = df['Avg Temp (°F)'].rolling(window=7).mean()
    df['1-year ROC'] = df['Avg Temp (°F)'].diff(periods=365)
    
    return df

all_data = load_data()

# --- Global Intelligence ---
hist_max = all_data['Max Temp (°F)'].max()
hist_max_date = all_data.loc[all_data['Max Temp (°F)'].idxmax(), 'Date']
hist_min = all_data['Min Temp (°F)'].min()
hist_min_date = all_data.loc[all_data['Min Temp (°F)'].idxmin(), 'Date']
overall_avg = all_data['Avg Temp (°F)'].mean()
recent_avg = all_data['Avg Temp (°F)'].tail(30).mean()
pulse_delta = recent_avg - overall_avg

# --- Sidebar Controls ---
st.sidebar.title("Operational Controls")
app_mode = st.sidebar.selectbox("Analysis View", ["Historical Overview", "Yearly Comparison"])

# --- Header Section ---
col_h1, col_h2 = st.columns([2, 1])
with col_h1:
    st.markdown('<p class="header-text">KORD Intelligence</p>', unsafe_allow_html=True)
    st.markdown(f"**Climate Data for Chicago O'Hare | 1974 - {all_data['Date'].max().year}**")

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

# --- Main Visualizations ---
if app_mode == "Historical Overview":
    # 3-Panel Subplot
    fig = make_subplots(
        rows=3, cols=1, 
        shared_xaxes=True,
        vertical_spacing=0.1, 
        subplot_titles=(
            "Thermal Distribution Spectrum", 
            "7-Day Volatility Trend", 
            "Year-over-Year Variance Delta"
        ),
        row_heights=[0.5, 0.25, 0.25]
    )

    # Core Traces
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Min Temp (°F)'], line=dict(width=0), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Max Temp (°F)'], fill='tonexty', fillcolor='rgba(255, 255, 255, 0.05)', line=dict(width=0), name='Daily Range'), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Max Temp (°F)'], name='Max', line=dict(color='#FF4B2B', width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Min Temp (°F)'], name='Min', line=dict(color='#00D2FF', width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Avg Temp (°F)'], name='Mean', line=dict(color='#A0A0A0', width=2)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['7-day SMA'], name='7d SMA', line=dict(color='#00F260', width=2)), row=2, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['1-year ROC'], name='YoY ROC', line=dict(color='#FDBB2D', width=1.5), fill='tozeroy', fillcolor='rgba(253, 187, 45, 0.05)'), row=3, col=1)

    # Historical Annotations
    fig.add_annotation(x=hist_max_date, y=hist_max, text="MAX RECORD", showarrow=True, arrowhead=1, bgcolor="#FF4B2B", row=1, col=1)
    fig.add_annotation(x=hist_min_date, y=hist_min, text="MIN RECORD", showarrow=True, arrowhead=1, bgcolor="#00D2FF", row=1, col=1)

    # YoY Analytical Annotation: Show Temp from 1 Year Ago (Idea 4)
    # diff(365) means: current_avg - temp_1y_ago = roc
    # so: temp_1y_ago = current_avg - roc
    latest_val = all_data.iloc[-1]
    if pd.notnull(latest_val['1-year ROC']):
        temp_1y_ago = latest_val['Avg Temp (°F)'] - latest_val['1-year ROC']
        fig.add_annotation(
            x=latest_val['Date'], 
            y=latest_val['1-year ROC'], 
            text=f"1Y AGO: {temp_1y_ago:.1f}°F", 
            showarrow=True, 
            arrowhead=1, 
            ax=-50, ay=-40,
            bgcolor="#FDBB2D", 
            font=dict(color="black", size=10),
            row=3, col=1
        )

    # --- AXIS CONFIGURATION ---
    # We use the BOTTOM axis (row 3) to control the shared range and configuration
    # but we ALSO enable labels on row 1 for visibility.
    
    # 1. First X-Axis (Main Chart Date Labels)
    fig.update_xaxes(
        row=1, col=1,
        showticklabels=True, 
        tickfont=dict(size=10, color="#8892b0"),
        tickformat="%b %Y",
        showgrid=True, gridcolor='rgba(255, 255, 255, 0.1)',
        type="date"
    )

    # 2. Bottom X-Axis (Timeline Control)
    fig.update_xaxes(
        row=3, col=1,
        type="date",
        showgrid=True, gridcolor='rgba(255, 255, 255, 0.1)',
        rangeslider=dict(visible=True, thickness=0.04),
        rangeselector=dict(
            buttons=list([
                dict(count=1, label="1M", step="month", stepmode="backward"),
                dict(count=6, label="6M", step="month", stepmode="backward"),
                dict(count=1, label="YTD", step="year", stepmode="todate"),
                dict(count=1, label="1Y", step="year", stepmode="backward"),
                dict(step="all", label="ALL")
            ]),
            # Positioned at the very top of the figure
            y=1.1, x=0.5, xanchor="center",
            bgcolor="rgba(255, 255, 255, 0.1)", font=dict(color="white"),
            activecolor="#3a7bd5"
        )
    )

    fig.update_layout(
        height=1000, template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', 
        plot_bgcolor='rgba(0,0,0,0)', margin=dict(t=150), hovermode="x unified"
    )
    st.plotly_chart(fig, use_container_width=True)

else:
    # Comparison View
    df1 = all_data[all_data['Date'].dt.year == year_1].copy()
    df2 = all_data[all_data['Date'].dt.year == year_2].copy()
    df1['DayOfYear'] = df1['Date'].dt.dayofyear
    df2['DayOfYear'] = df2['Date'].dt.dayofyear
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df1['DayOfYear'], y=df1['Avg Temp (°F)'], name=f"{year_1}", line=dict(color='#FF4B2B', width=2)))
    fig.add_trace(go.Scatter(x=df2['DayOfYear'], y=df2['Avg Temp (°F)'], name=f"{year_2}", line=dict(color='#00D2FF', width=2, dash='dash')))
    fig.update_layout(
        title=f"Comparative Profile: {year_1} vs {year_2}",
        xaxis_title="Day of Year (1-366)", yaxis_title="Temp (°F)",
        template="plotly_dark", height=600, hovermode="x unified"
    )
    st.plotly_chart(fig, use_container_width=True)

# --- Regional Metrics ---
st.markdown("### Historical Benchmarks")
col1, col2, col3, col4 = st.columns(4)

# Note: Metrics now reflect the FULL dataset since we're using Plotly for navigation.
with col1: st.metric("All-Time Max", f"{hist_max:.1f}°F", f"{hist_max_date.strftime('%Y')}")
with col2: st.metric("All-Time Min", f"{hist_min:.1f}°F", f"{hist_min_date.strftime('%Y')}")
with col3: st.metric("Rolling 30d Avg", f"{recent_avg:.1f}°F")
with col4: st.metric("Climate Pulse", f"{pulse_delta:+.2f}°F", "Delta vs 50y Avg", delta_color="normal")

st.divider()
st.caption("Climate Intelligence Sandbox | KORD Data Protocol")

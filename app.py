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

# --- Data Loading & Sanitization ---
@st.cache_data
def load_data():
    csv_path = "chicago_weather_50years.csv"
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        df['Date'] = pd.to_datetime(df['Date']).dt.floor('D')
        
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

# --- Theme Logic ---
themes = {
    "Cyber-Ice": {
        "page_bg": "#0B0E14",
        "component_bg": "rgba(255, 255, 255, 0.03)",
        "accent_1": "#00D2FF",
        "accent_2": "#FF4B2B",
        "trend_line": "#00F260",
        "ro_line": "#FDBB2D",
        "text": "#FFFFFF",
        "sub_text": "#8892b0",
        "plotly_template": "plotly_dark",
        "font": "'Inter', sans-serif"
    },
    "Solar-Paper": {
        "page_bg": "#F4ECD8",
        "component_bg": "rgba(0, 0, 0, 0.05)",
        "accent_1": "#268BD2",
        "accent_2": "#CB4B16",
        "trend_line": "#859900",
        "ro_line": "#DC322F",
        "text": "#073642",
        "sub_text": "#586E75",
        "plotly_template": "plotly_white",
        "font": "'Playfair Display', serif"
    },
    "Emerald-Grid": {
        "page_bg": "#061106",
        "component_bg": "rgba(85, 255, 85, 0.05)",
        "accent_1": "#55FF55",
        "accent_2": "#FFB000",
        "trend_line": "#ADFF2F",
        "ro_line": "#FFD700",
        "text": "#55FF55",
        "sub_text": "#00A300",
        "plotly_template": "plotly_dark",
        "font": "'Courier New', monospace"
    }
}

def hex_to_rgba(hex_color, alpha):
    hex_color = hex_color.lstrip('#')
    lv = len(hex_color)
    rgb = tuple(int(hex_color[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))
    return f"rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, {alpha})"

# --- Global Configuration & Data Loading ---
all_data = load_data()
max_d = all_data['Date'].max()
min_d = all_data['Date'].min()
hist_max = all_data['Max Temp (°F)'].max()
hist_max_date = all_data.loc[all_data['Max Temp (°F)'].idxmax(), 'Date']
hist_min = all_data['Min Temp (°F)'].min()
hist_min_date = all_data.loc[all_data['Min Temp (°F)'].idxmin(), 'Date']
pulse_delta = all_data['Avg Temp (°F)'].tail(30).mean() - all_data['Avg Temp (°F)'].mean()

# --- New Enhanced Benchmarks ---
frost_days = len(all_data[all_data['Min Temp (°F)'] < 0])
heat_days = len(all_data[all_data['Max Temp (°F)'] > 95])
volatility = all_data['Avg Temp (°F)'].diff().abs().mean()
first_decade = all_data[all_data['Year'] <= 1984]['Avg Temp (°F)'].mean()
last_decade = all_data[all_data['Year'] >= 2016]['Avg Temp (°F)'].mean()
decadal_delta = last_decade - first_decade

# --- Theme Logic (Global Persistence) ---
if 'theme_choice' not in st.session_state:
    st.session_state.theme_choice = "Cyber-Ice"

# Ensure 't' and 'theme_choice' are available immediately based on current state
theme_choice = st.session_state.theme_choice
t = themes[theme_choice]

# --- Sidebar Initialization ---
with st.sidebar:
    st.title("Operational Controls")
    app_mode = st.selectbox("Analysis View", ["Historical Overview", "Yearly Comparison", "Climate Lab (Beta)"])
    st.divider()
    
    st.markdown("### System Diagnostics")
    start_str = min_d.date() if pd.notnull(min_d) else "N/A"
    end_str = max_d.date() if pd.notnull(max_d) else "N/A"
    recs = len(all_data) if not all_data.empty else 0
    
    st.markdown(f"""
    <div class="diagnostic">
    <b>Archive Start:</b> {start_str}<br>
    <b>Archive End:</b> {end_str}<br>
    <b>Records:</b> {recs:,}<br>
    <b>Format:</b> High-Fidelity Time Series
    </div>
    """, unsafe_allow_html=True)
    
    st.divider()
    with st.expander("🎓 Climate Intelligence Primer"):
        st.markdown(f"""
        <div class="intelligence-item">
            <b>Seasonal Normals</b><br>
            The grey/translucent background area represents the 50-year range of "typical" temperatures for that specific day of the year.<br><br>
            
            <b>7-Day SMA</b><br>
            Simple Moving Average. Smooths daily noise to reveal immediate momentum.<br><br>
            
            <b>YoY ROC</b><br>
            Rate of Change. Compares today's temperature directly to the exact same day 365 days ago.<br><br>
            
            <b>Climate Pulse</b><br>
            Compares the last 30 days of weather against the entire 50-year historical baseline for those same days.
        </div>
        """, unsafe_allow_html=True)
    st.divider()

    st.markdown("### Aesthetic Style")
    current_index = ["Cyber-Ice", "Solar-Paper", "Emerald-Grid"].index(st.session_state.theme_choice)
    new_theme = st.radio(
        "UI Theme", 
        ["Cyber-Ice", "Solar-Paper", "Emerald-Grid"], 
        index=current_index,
        help="Select the interface aesthetic."
    )
    if new_theme != st.session_state.theme_choice:
        st.session_state.theme_choice = new_theme
        st.rerun()

# Inject Theme CSS
def generate_main_css(t, theme_choice):
    css = f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;800&family=Playfair+Display:ital,wght@0,400;0,800;1,400&display=swap');
    
    .stApp {{
        background-color: {t['page_bg']} !important;
        color: {t['text']} !important;
    }}
    [data-testid="stMetric"] {{
        background: {t['component_bg']};
        padding: 20px;
        border-radius: 12px;
        border: 1px solid {t['accent_1']}33;
        backdrop-filter: blur(8px);
    }}
    [data-testid="stMetricValue"] > div {{
        color: {t['text']} !important;
    }}
    [data-testid="stMetricLabel"] > div {{
        color: {t['sub_text']} !important;
    }}
    .header-text {{
        font-family: {t['font']};
        font-weight: 800;
        color: {t['accent_1']};
        {f'background: -webkit-linear-gradient({t["accent_1"]}, {t["accent_2"]}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;' if theme_choice == "Cyber-Ice" else ''}
        font-size: 3.5rem;
        margin-bottom: 0px;
    }}
    .pulse-widget {{
        background: {t['component_bg']};
        border: 1px solid {t['accent_1']}66;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
    }}
    .diagnostic {{
        font-size: 0.7rem;
        color: {t['sub_text']};
        background: {t['component_bg']};
        padding: 10px;
        border-radius: 5px;
        border: 1px solid {t['accent_1']}1A;
    }}
    .lab-title {{
        color: {t['ro_line']};
        font-family: {t['font']} !important;
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 10px;
    }}
    /* REFACTORED: Targeted Typography - Avoids breaking Streamlit internals */
    .header-text, .lab-title, [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {{
        font-family: {t['font']} !important;
        color: {t['accent_1']} !important;
    }}
    .diagnostic, .intelligence-item, .pulse-widget span {{
        font-family: {t['font']} !important;
        color: {t['text']} !important;
    }}
    .intelligence-item {{
        font-size: 0.9rem;
    }}
    [data-testid="stHeader"] {{
        background-color: rgba(0,0,0,0);
    }}
    [data-testid="stSidebar"] {{
        background-color: {t['page_bg']} !important;
        border-right: 1px solid {hex_to_rgba(t['accent_1'], 0.2)} !important;
    }}
    /* Specific input component label fixes */
    [data-testid="stSidebar"] label, [data-testid="stSidebar"] .stRadio p {{
        color: {t['accent_1']} !important;
        font-family: {t['font']} !important;
        font-size: 0.8rem;
        text-transform: uppercase;
        font-weight: bold;
    }}
    /* Input component styling */
    div[data-baseweb="radio"] *, div[data-baseweb="select"] * {{
        color: {t['text']} !important;
        background-color: transparent !important;
        font-family: {t['font']} !important;
    }}
    div[data-testid="stExpander"] {{
        background: {t['component_bg']};
        border: 1px solid {hex_to_rgba(t['accent_1'], 0.1)};
        border-radius: 8px;
    }}
    /* Fix Expander Icon visibility and alignment */
    [data-testid="stExpander"] svg {{
        fill: {t['accent_1']} !important;
    }}
    /* Clean up the range slider handle area */
    .stSlider [data-testid="stMarkdownContainer"] p {{
        color: {t['sub_text']} !important;
    }}
    hr {{
        border-color: {hex_to_rgba(t['accent_1'], 0.2)} !important;
    }}
    /* --- MOBILE RESPONSIVENESS (Phase 1) --- */
    @media (max-width: 768px) {{
        .header-text {{
            font-size: 2.0rem !important;
            text-align: center;
        }}
        .lab-title {{
            font-size: 1.1rem !important;
        }}
        [data-testid="stMetric"] {{
            padding: 10px !important;
        }}
        [data-testid="stMetricValue"] {{
            font-size: 1.2rem !important;
        }}
        .pulse-widget {{
            padding: 10px !important;
            margin-bottom: 10px !important;
        }}
        /* Stack column containers on mobile if needed (handled by Streamlit usually, but we force specific tweaks) */
        [data-testid="stSidebar"] {{
            min-width: 100px !important; /* Allow sidebar to shrink */
        }}
        /* Phase 2: Layout Stacking */
        [data-testid="stHorizontalBlock"] {{
            flex-direction: column !important;
        }}
        [data-testid="column"] {{
            width: 100% !important;
            flex: 1 1 auto !important;
        }}
        
        /* Phase 3: Chart Height Optimization */
        /* Force charts to be shorter on mobile to allow scrolling */
        [data-testid="stPlotlyChart"] > div {{
            height: 600px !important;
            max-height: 600px !important;
        }}
        [data-testid="stPlotlyChart"] iframe {{
            height: 600px !important;
        }}
        
        /* Phase 4: Touch-Friendly Controls */
        /* Enforce Apple HIG minimum tap target size (44px) */
        .stRadio div, .stSelectbox div, .stButton button, [data-baseweb="select"] {{
            min-height: 44px !important;
            touch-action: manipulation; /* Disable double-tap zoom for faster response */
        }}
        /* Add spacing between stacked interactive elements */
        .stRadio, .stSelectbox {{
            margin-bottom: 15px !important;
        }}
    }}
    </style>
"""
    return css

st.markdown(generate_main_css(t, theme_choice), unsafe_allow_html=True)

# --- Header ---
col_h1, col_h2 = st.columns([2, 1])
with col_h1:
    st.markdown('<p class="header-text">KORD Intelligence</p>', unsafe_allow_html=True)
    st.markdown(f"**Climate Data for Chicago O'Hare | 1974 - {max_d.year}**")
with col_h2:
    status_label = "WARMER" if pulse_delta > 0 else "COOLER"
    st.markdown(f"""
    <div class="pulse-widget" title="Climate Pulse tracks short-term momentum. A negative value indicates the last 30 days were cooler than the 50-year seasonal norm.">
        <span style="color: {t['sub_text']}; font-size: 0.8rem; text-transform: uppercase;">Climate Pulse (30d)</span><br>
        <span style="font-size: 1.2rem; font-weight: bold; color: {'#FF4B2B' if pulse_delta > 0 else t['accent_1']};">
            {pulse_delta:+.2f}°F {status_label}
        </span><br>
        <span style="color: {t['sub_text']}; font-size: 0.7rem;">Relative to 50y Baseline</span>
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
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean High (°F)'], fill='tonexty', fillcolor=hex_to_rgba(t['text'], 0.1), line=dict(width=0), name='Seasonal Range'), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean High (°F)'], name='Mean High', line=dict(color=t['accent_2'], width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Mean Low (°F)'], name='Mean Low', line=dict(color=t['accent_1'], width=1.5)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['Avg Temp (°F)'], name='Daily Mean', line=dict(color=t['sub_text'], width=2)), row=1, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['7-day SMA'], name='7d SMA', line=dict(color=t['trend_line'], width=2)), row=2, col=1)
    fig.add_trace(go.Scatter(x=all_data['Date'], y=all_data['1-year ROC'], name='YoY ROC', line=dict(color=t['ro_line'], width=1.5), fill='tozeroy', fillcolor=hex_to_rgba(t['ro_line'], 0.1)), row=3, col=1)

    # Annotations
    fig.add_annotation(x=hist_max_date, y=hist_max, text="MAX RECORD", showarrow=True, arrowhead=1, bgcolor=t['accent_2'], row=1, col=1)
    fig.add_annotation(x=hist_min_date, y=hist_min, text="MIN RECORD", showarrow=True, arrowhead=1, bgcolor=t['accent_1'], row=1, col=1)

    # Area Annotation
    if not all_data.empty:
        latest_val = all_data.iloc[-1]
        if pd.notnull(latest_val['1-year ROC']):
            temp_1y_ago = latest_val['Avg Temp (°F)'] - latest_val['1-year ROC']
            fig.add_annotation(
                x=latest_val['Date'], y=latest_val['1-year ROC'], 
                text=f"1Y AGO: {temp_1y_ago:.1f}°F", 
                showarrow=True, arrowhead=1, ax=-50, ay=-40,
                bgcolor=t['ro_line'], font=dict(color="black" if theme_choice == "Solar-Paper" else "white", size=10),
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
        height=1330, template=t['plotly_template'], paper_bgcolor='rgba(0,0,0,0)', 
        plot_bgcolor='rgba(0,0,0,0)', margin=dict(t=150, b=50), hovermode="x unified",
        yaxis_autorange=True, yaxis2_autorange=True, yaxis3_autorange=True,
        font=dict(family=t['font'], color=t['text']),
        hoverlabel=dict(bgcolor=t['page_bg'], font_size=12, font_family=t['font'], font_color=t['text']),
        legend=dict(font=dict(color=t['text']))
    )
    
    # DEFAULT VIEW: Last 1 Year
    one_year_ago = max_d - timedelta(days=365)
    fig.update_xaxes(range=[one_year_ago, max_d], row=3, col=1)
    
    st.plotly_chart(fig, use_container_width=True)

elif app_mode == "Yearly Comparison":
    years = sorted(all_data['Year'].unique(), reverse=True)
    st.markdown('<p class="lab-title">Comparative Analysis Tool</p>', unsafe_allow_html=True)
    col_sel1, col_sel2 = st.columns(2)
    with col_sel1:
        year_1 = st.selectbox("Primary Year", years, index=0)
    with col_sel2:
        year_2 = st.selectbox("Base Year", years, index=len(years)-1)

    df1 = all_data[all_data['Year'] == year_1].copy()
    df2 = all_data[all_data['Year'] == year_2].copy()
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df1['DayOfYear'], y=df1['Avg Temp (°F)'], name=f"{year_1}", line=dict(color=t['accent_2'], width=2)))
    fig.add_trace(go.Scatter(x=df2['DayOfYear'], y=df2['Avg Temp (°F)'], name=f"{year_2}", line=dict(color=t['accent_1'], width=2, dash='dash')))
    fig.update_layout(
        title=f"Comparative Profile: {year_1} vs {year_2}",
        xaxis_title="Day of Year", yaxis_title="Temp (°F)",
        template=t['plotly_template'], height=600, hovermode="x unified",
        font=dict(family=t['font']),
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)'
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
            colorscale='Viridis' if theme_choice != "Solar-Paper" else 'Portland'
        )])
        fig.update_layout(
            scene=dict(
                xaxis_title='Day of Year',
                yaxis_title='Year',
                zaxis_title='Temp (°F)',
                camera=dict(eye=dict(x=1.5, y=1.5, z=1.2))
            ),
            height=800, template=t['plotly_template'], margin=dict(l=0, r=0, b=0, t=40),
            font=dict(family=t['font']),
            paper_bgcolor='rgba(0,0,0,0)'
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
                radialaxis=dict(visible=True, range=[-20, 100], ticksuffix="°F", gridcolor=hex_to_rgba(t['sub_text'], 0.2)),
                angularaxis=dict(tickvals=[0, 90, 180, 270], ticktext=["Jan", "Apr", "Jul", "Oct"], gridcolor=hex_to_rgba(t['sub_text'], 0.2))
            ),
            height=800, template=t['plotly_template'],
            font=dict(family=t['font']),
            paper_bgcolor='rgba(0,0,0,0)'
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
            height=550, template=t['plotly_template'],
            font=dict(family=t['font']),
            paper_bgcolor='rgba(0,0,0,0)',
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
                    bgcolor=t['component_bg'], font=dict(color=t['text'])
                )
            ),
            yaxis=dict(showgrid=False, showticklabels=False),
            margin=dict(t=80, b=40)
        )
        st.plotly_chart(fig, use_container_width=True)

# --- Regional Benchmarks ---
st.markdown("### Historical Benchmarks")
col_b1, col_b2, col_b3, col_b4 = st.columns(4)
with col_b1: st.metric("All-Time Max", f"{hist_max:.1f}°F", f"{hist_max_date.strftime('%Y')}", help="The highest daily maximum temperature recorded at KORD between 1974 and today.")
with col_b2: st.metric("All-Time Min", f"{hist_min:.1f}°F", f"{hist_min_date.strftime('%Y')}", help="The lowest daily minimum temperature recorded at KORD between 1974 and today.")
with col_b3: st.metric("Rolling 30d Avg", f"{all_data['Avg Temp (°F)'].tail(30).mean():.1f}°F", help="The arithmetic mean of the 'Daily Average Temperature' for the most recent 30 records.")
with col_b4: st.metric("Climate Pulse", f"{pulse_delta:+.2f}°F", "Delta vs 50y Baseline", help="The climatological anomaly: compares the last 30 days against the 50-year average for those same calendar days.")

col_b5, col_b6, col_b7, col_b8 = st.columns(4)
with col_b5: st.metric("Extreme Frost", f"{frost_days}", "Days < 0°F", help="Total number of days in the 50-year archive where the temperature dropped below zero.")
with col_b6: st.metric("Extreme Heat", f"{heat_days}", "Days > 95°F", help="Total number of days in the 50-year archive where the temperature exceeded 95°F.")
with col_b7: st.metric("Volatility Index", f"{volatility:.2f}°F", "Avg Daily Δ", help="The average absolute change in temperature from one day to the next across all 50 years.")
with col_b8: st.metric("Decadal Shift", f"{decadal_delta:+.2f}°F", "2020s vs 1970s", help="The difference in average temperature between the most recent decade (2016-2025) and the first decade of records (1974-1984).")

st.divider()
st.caption("KORD Intel Sandbox | Innovation & Reliability")

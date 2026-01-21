import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from datetime import datetime

def fetch_chicago_weather(start_date="1974-01-01", end_date=None):
    if end_date is None:
        end_date = datetime.now().strftime('%Y-%m-%d')
        
    # Setup the Open-Meteo API client with cache and retry on error
    cache_session = requests_cache.CachedSession('.cache', expire_after = -1)
    retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
    openmeteo = openmeteo_requests.Client(session = retry_session)

    # Chicago O'Hare International Airport coordinates
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": 41.9742,
        "longitude": -87.9073,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean"],
        "temperature_unit": "fahrenheit",
        "timezone": "America/Chicago"
    }
    
    responses = openmeteo.weather_api(url, params=params)

    # Process first location. Add a for-loop for multiple locations or weather models
    response = responses[0]

    # Process daily data. The order of variables needs to be the same as requested.
    daily = response.Daily()
    daily_temperature_2m_max = daily.Variables(0).ValuesAsNumpy()
    daily_temperature_2m_min = daily.Variables(1).ValuesAsNumpy()
    daily_temperature_2m_mean = daily.Variables(2).ValuesAsNumpy()

    daily_data = {"Date": pd.date_range(
        start = pd.to_datetime(daily.Time(), unit = "s", utc = True),
        end = pd.to_datetime(daily.TimeEnd(), unit = "s", utc = True),
        freq = pd.Timedelta(seconds = daily.Interval()),
        inclusive = "left"
    )}
    daily_data["Max Temp (°F)"] = daily_temperature_2m_max
    daily_data["Min Temp (°F)"] = daily_temperature_2m_min
    daily_data["Avg Temp (°F)"] = daily_temperature_2m_mean

    df = pd.DataFrame(data = daily_data)
    
    # Ensure Date is datetime object without timezone for simpler handling in Streamlit
    df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)

    # Clean the data: handle missing values (forward fill)
    df = df.ffill()

    return df

if __name__ == "__main__":
    print("Fetching data from Open-Meteo...")
    weather_df = fetch_chicago_weather()
    print(weather_df.head())
    print(weather_df.tail())
    print(f"Total records: {len(weather_df)}")
    # Save to CSV for caching/verification
    weather_df.to_csv("chicago_weather_50years.csv", index=False)
    print("Data saved to chicago_weather_50years.csv")

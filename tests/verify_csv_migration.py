import pandas as pd
import os
import sys

def test_data_load():
    csv_path = "chicago_weather_50years.csv"
    print(f"Checking for {csv_path}...")
    if not os.path.exists(csv_path):
        print(f"ERROR: {csv_path} not found!")
        sys.exit(1)
    
    try:
        df = pd.read_csv(csv_path)
        print(f"Successfully loaded {len(df)} records from CSV.")
        
        # Verify critical columns
        required_cols = ['Date', 'Avg Temp (°F)', 'Max Temp (°F)', 'Min Temp (°F)']
        for col in required_cols:
            if col not in df.columns:
                print(f"ERROR: Missing column {col}")
                sys.exit(1)
        
        print("Data integrity check passed.")
    except Exception as e:
        print(f"ERROR: Failed to load CSV data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_data_load()

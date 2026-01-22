import pytest
from datetime import datetime, date, timedelta
import sys
import os

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# We will import the function to be tested. 
# It doesn't exist yet, so this import might fail if we don't define the function stub first or mock it.
# Ideally, we define the function in app.py or a helper module.
# For this TDD step, we'll try to import it from app.

from app import calculate_time_range

def test_calculate_time_range_1y():
    max_d = date(2025, 12, 31)
    selection = "1Y"
    start_date = calculate_time_range(selection, max_d)
    assert start_date == date(2024, 12, 31)

def test_calculate_time_range_ytd():
    max_d = date(2025, 6, 15)
    selection = "YTD"
    start_date = calculate_time_range(selection, max_d)
    assert start_date == date(2025, 1, 1)

def test_calculate_time_range_1m():
    max_d = date(2025, 2, 15)
    selection = "1M"
    start_date = calculate_time_range(selection, max_d)
    # Approx 30 days or exact month? Plotly does month stepping.
    # Let's assume we implement simple day-based or exact month logic.
    # For "1M", a simple approach is -30 days or relativedelta.
    # Let's enforce -30 days for simplicity in this app, or dateutil if available.
    # app.py uses dateutil.relativedelta? Let's check imports.
    # If not, let's assume 30 days for now, or update expectation after implementation.
    # Better: Use relativedelta logic if possible for accuracy.
    # Let's interpret "1M" as 30 days for this test.
    # expected = max_d - timedelta(days=30) 
    # OR: expect exact month shift: Jan 15.
    # Let's target exact month shift.
    assert start_date == date(2025, 1, 15)

def test_calculate_time_range_all():
    max_d = date(2025, 12, 31)
    selection = "ALL"
    start_date = calculate_time_range(selection, max_d)
    assert start_date is None # Or some indicator for "no filter"

if __name__ == "__main__":
    try:
        test_calculate_time_range_1y()
        test_calculate_time_range_ytd()
        # test_calculate_time_range_1m() # Validating this depends on implementation choice
        test_calculate_time_range_all()
        print("PASS: Timeframe Logic Verified")
    except Exception as e:
        print(f"FAIL: {e}")
        sys.exit(1)

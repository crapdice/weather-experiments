import pytest
import sys
import os

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import generate_main_css

def test_mobile_polish():
    """
    Verify updated mobile polish CSS rules.
    """
    mock_theme = {
        'page_bg': '#000000',
        'text': '#FFFFFF', 
        'component_bg': '#333333',
        'accent_1': '#00FF00',
        'accent_2': '#0000FF',
        'sub_text': '#CCCCCC',
        'font': 'Inter',
        'ro_line': '#FF0000',
        'trend_line': '#00FF00',
        'plotly_template': 'plotly_dark' # Mock key needed
    }
    
    # Mock hex_to_rgba since it's used in the function but not imported here
    # We can rely on the fact that f-strings are evaluated at runtime inside the function
    # Wait, hex_to_rgba is expected to be in the scope of generate_main_css? 
    # No, it's likely a global in app.py. The import above might fail if hex_to_rgba is strictly required.
    # Let's check app.py structure again. generate_main_css uses it.
    
    # We'll need to mock it in the app module if it's not exported.
    # Actually, simpler approach: just check the string content logic, 
    # assuming we can run it. 
    # If app.py code is structured cleanly, we can import hex_to_rgba too.
    
    try:
        from app import hex_to_rgba
    except ImportError:
        # If it's not in __all__ or global scope export, we might have issues.
        pass

    css = generate_main_css(mock_theme, "Cyber-Ice")
    
    # Verify Polish Updates
    assert 'font-size: 1.8rem !important' in css
    assert 'height: 500px !important' in css
    assert 'margin-top: 20px !important' in css

if __name__ == "__main__":
    try:
        test_mobile_polish()
        print("PASS: Mobile Polish Verified")
    except Exception as e:
        print(f"FAIL: {e}")
        sys.exit(1)

import pytest
import sys
import os

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import generate_main_css

def test_mobile_media_query_presence():
    """
    Phase 1 Verification:
    Ensure CSS contains the mobile media query block.
    """
    # Mock theme dictionary
    mock_theme = {
        'page_bg': '#000000',
        'text': '#FFFFFF', 
        'component_bg': '#333333',
        'accent_1': '#00FF00',
        'accent_2': '#0000FF',
        'sub_text': '#CCCCCC',
        'font': 'Inter',
        'ro_line': '#FF0000',
        'trend_line': '#00FF00'
    }
    
    css = generate_main_css(mock_theme, "Cyber-Ice")
    
    # Check for media query definition
    assert "@media (max-width: 768px)" in css, "CSS missing mobile media query block"
    
    # Check for specific font size adjustments
    assert ".header-text {" in css
    # Phase 2 Verification: Layout Stacking
    # Check for forced vertical stacking of columns on mobile
    assert 'flex-direction: column !important' in css
    assert '[data-testid="stHorizontalBlock"]' in css
    
    # Phase 3 Verification: Chart Height
    # Ensure charts are capped at 600px on mobile
    assert '[data-testid="stPlotlyChart"]' in css
    assert 'height: 600px !important' in css
    
    # Phase 4 Verification: Touch-Friendly Controls
    assert 'min-height: 44px' in css
    assert 'touch-action: manipulation' in css

if __name__ == "__main__":
    # verification mode
    try:
        test_mobile_media_query_presence()
        print("Test PASSED: Media query present.")
    except AssertionError as e:
        print(f"Test FAILED: {e}")
        sys.exit(1)

import pytest
import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import generate_pulse_html

def test_generate_pulse_html_warmer():
    # Mock theme
    theme = {
        'sub_text': '#888',
        'accent_1': '#00f'
    }
    delta = 2.5
    html = generate_pulse_html(delta, theme)
    
    assert "WARMER" in html
    assert "+2.50°F" in html
    assert "#FF4B2B" in html # Warmer color

def test_generate_pulse_html_cooler():
    theme = {
        'sub_text': '#888',
        'accent_1': '#00f'
    }
    delta = -1.2
    html = generate_pulse_html(delta, theme)
    
    assert "COOLER" in html
    assert "-1.20°F" in html
    assert "#00f" in html # Cooler color (accent_1)

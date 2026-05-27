import pytest

# This simulates your app's location-checking logic
def calculate_work_location(distance_meters):
    if distance_meters <= 150:
        return "Home"
    else:
        return "Office"

# This is the actual test that Pytest will look for
def test_worker_is_at_home():
    # If the worker is 50 meters away, they are within the 150m boundary
    result = calculate_work_location(50)
    
    # We "assert" (demand) that the software says "Home"
    assert result == "Home"
    print("Test passed: Worker is correctly identified as being at Home.")

def test_worker_is_at_office():
    # If the worker is 300 meters away, they are outside the boundary
    result = calculate_work_location(300)
    
    # We demand that the software says "Office"
    assert result == "Office"
    print("Test passed: Worker is correctly identified as being at the Office.")
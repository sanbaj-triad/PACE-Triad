import enum

class MilestoneType(str, enum.Enum):
    DESIGN = "Design"
    HARDWARE = "Hardware"
    REMOTE = "Remote"
    ONSITE = "Onsite"
    PM = "PM"
    CONTINGENCY = "Contingency"
    OTHER = "Other"

try:
    val = "Other"
    print(f"Testing '{val}'...")
    m = MilestoneType(val)
    print(f"Success: {m}")
    
    val2 = "other" # Lowercase?
    print(f"Testing '{val2}'...")
    m2 = MilestoneType(val2)
    print(f"Success: {m2}")
except Exception as e:
    print(f"Failed: {e}")

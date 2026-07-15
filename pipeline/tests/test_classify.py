"""
Tests for classify_incidents.py
Run with: pytest pipeline/tests/test_classify.py -v
"""

import sys
from pathlib import Path

# Make the scripts directory importable
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from classify_incidents import classify, classify_type, score_incident, get_priority, get_confidence


# ── classify_type ─────────────────────────────────────────────────────────────

def test_water_main_keywords():
    t, kw = classify_type("water gushing from the ground near Oak St")
    assert t == "water_main_break"
    assert len(kw) > 0

def test_flooding_keywords():
    t, kw = classify_type("Standing water blocking the road after the storm")
    assert t == "flooding"

def test_pothole_keywords():
    t, kw = classify_type("Large pothole causing vehicle damage on Clark Ave")
    assert t == "pothole"

def test_power_outage_keywords():
    t, kw = classify_type("Street lights out on the 900 block of Wabash")
    assert t == "power_outage"

def test_graffiti_keywords():
    t, kw = classify_type("Graffiti on the bridge abutment at Milwaukee and Division")
    assert t == "graffiti"

def test_noise_complaint_keywords():
    t, kw = classify_type("Excessive noise from construction site past midnight")
    assert t == "noise_complaint"

def test_traffic_signal_keywords():
    t, kw = classify_type("Traffic signal malfunction at State and Lake")
    assert t == "traffic_signal_issue"

def test_unknown_type_returns_unknown():
    t, kw = classify_type("Something completely unrelated xyz123")
    assert t == "unknown"
    assert kw == []

def test_case_insensitive():
    t1, _ = classify_type("POTHOLE on the road")
    t2, _ = classify_type("pothole on the road")
    assert t1 == t2 == "pothole"


# ── score_incident ────────────────────────────────────────────────────────────

def test_score_within_range():
    for inc_type in ["flooding", "pothole", "graffiti", "power_outage", "unknown"]:
        score, _ = score_incident(inc_type, seed=42)
        assert 0 <= score <= 100, f"Score {score} out of range for {inc_type}"

def test_weather_bonus_increases_score():
    base_score,  _ = score_incident("flooding", has_weather=False, seed=1)
    bonus_score, _ = score_incident("flooding", has_weather=True,  seed=1)
    assert bonus_score > base_score

def test_critical_bonus_increases_score():
    base_score,  _ = score_incident("pothole", is_critical=False, seed=5)
    bonus_score, _ = score_incident("pothole", is_critical=True,  seed=5)
    assert bonus_score > base_score

def test_score_breakdown_keys():
    _, breakdown = score_incident("flooding", seed=0)
    assert set(breakdown.keys()) == {"base", "report", "weather", "transit", "location"}

def test_high_severity_type():
    # power_outage base=60 + weather(10) + critical(15) should be high
    score, _ = score_incident("power_outage", has_weather=True, is_critical=True, seed=0)
    assert get_priority(score) == "high"


# ── get_priority ──────────────────────────────────────────────────────────────

def test_priority_thresholds():
    assert get_priority(0)   == "low"
    assert get_priority(30)  == "low"
    assert get_priority(31)  == "medium"
    assert get_priority(65)  == "medium"
    assert get_priority(66)  == "high"
    assert get_priority(100) == "high"


# ── get_confidence ────────────────────────────────────────────────────────────

def test_unknown_confidence_is_low():
    assert get_confidence([], "unknown") == 0.30

def test_more_matches_higher_confidence():
    conf1 = get_confidence(["flood"],                    "flooding")
    conf2 = get_confidence(["flood", "standing water"],  "flooding")
    assert conf2 > conf1

def test_confidence_capped_at_95():
    conf = get_confidence(["a", "b", "c", "d", "e", "f"], "flooding")
    assert conf <= 0.95


# ── full pipeline ─────────────────────────────────────────────────────────────

def test_classify_returns_all_fields():
    result = classify("burst pipe on Oak Street", seed=42)
    required = {"incident_type", "matched_keywords", "severity_score",
                "priority_label", "confidence_score", "score_breakdown", "ai_summary"}
    assert required.issubset(result.keys())

def test_ai_summary_contains_advisory_label():
    result = classify("pothole on the road", seed=0)
    assert "[Advisory — AI-generated]" in result["ai_summary"]

def test_classify_unknown_still_returns_result():
    result = classify("xyzzy frobozz magic word", seed=0)
    assert result["incident_type"] == "unknown"
    assert result["severity_score"] >= 0

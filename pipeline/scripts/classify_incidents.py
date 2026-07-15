"""
classify_incidents.py
Rule-based incident classifier and severity scorer.

Can be imported as a library by other pipeline scripts, or run as a CLI:

    python scripts/classify_incidents.py --text "water gushing from the ground near Oak St"
    python scripts/classify_incidents.py --text "pothole on Halsted" --weather --critical

All outputs are advisory. Human verification required before dispatch.
"""

import argparse
import math
import random

# ── Keyword rules ─────────────────────────────────────────────────────────────
# Each key is an incident_type; values are keyword fragments (case-insensitive).
# Longer / more specific phrases are listed first so they match before substrings.

KEYWORD_RULES: dict[str, list[str]] = {
    "water_main_break":     ["water main", "burst pipe", "water gushing", "major water leak", "gushing from"],
    "power_outage":         ["power outage", "power out", "electrical lines", "lights out", "transformer", "street lights out"],
    "flooding":             ["standing water", "street flooding", "flooded underpass", "stormwater overflow", "flood", "flooded"],
    "traffic_signal_issue": ["traffic signal", "traffic light", "signal stuck", "crossing signal", "signal malfunction"],
    "fallen_tree":          ["fallen tree", "tree down", "uprooted tree", "storm-damaged tree", "tree has fallen"],
    "road_damage":          ["sinkhole", "road collapse", "cracked pavement", "road surface deteriorating", "road damage"],
    "pothole":              ["pothole", "pot hole", "road surface damage", "potholes"],
    "debris_on_road":       ["debris blocking", "construction material", "scattered debris", "trash pile in street", "debris on road", "debris"],
    "graffiti":             ["graffiti", "vandalism", "tagged", "spray paint", "gang-related"],
    "noise_complaint":      ["excessive noise", "loud gathering", "construction noise", "noise complaint", "noise levels", "loud"],
}

# Scoring config (mirrors generate_synthetic_reports.py)
BASE_SCORES: dict[str, int] = {
    "flooding":             55,
    "pothole":              20,
    "fallen_tree":          35,
    "power_outage":         60,
    "road_damage":          30,
    "graffiti":             10,
    "noise_complaint":      12,
    "water_main_break":     58,
    "traffic_signal_issue": 45,
    "debris_on_road":       28,
    "unknown":              15,
}


# ── Core functions ────────────────────────────────────────────────────────────

def classify_type(text: str) -> tuple[str, list[str]]:
    """
    Match text against keyword rules.
    Returns (incident_type, matched_keywords).
    Falls back to 'unknown' if no keywords match.
    """
    text_lower = text.lower()
    best_type     = "unknown"
    best_matches: list[str] = []

    for inc_type, keywords in KEYWORD_RULES.items():
        matched = [kw for kw in keywords if kw in text_lower]
        if len(matched) > len(best_matches):
            best_matches = matched
            best_type    = inc_type

    return best_type, best_matches


def score_incident(
    incident_type: str,
    has_weather:   bool = False,
    has_transit:   bool = False,
    is_critical:   bool = False,
    seed:          int | None = None,
) -> tuple[float, dict]:
    """
    Compute severity score using the same formula as the pipeline.
    Returns (score, breakdown_dict).
    """
    rng = random.Random(seed)
    base           = BASE_SCORES.get(incident_type, 15)
    report_weight  = rng.randint(0, 20)
    weather_weight = 10 if has_weather  else 0
    transit_weight = 10 if has_transit  else 0
    location_weight= 15 if is_critical  else 0
    raw            = base + report_weight + weather_weight + transit_weight + location_weight
    score          = min(round(raw + rng.uniform(-5, 5), 1), 100.0)

    breakdown = {
        "base":     base,
        "report":   report_weight,
        "weather":  weather_weight,
        "transit":  transit_weight,
        "location": location_weight,
    }
    return score, breakdown


def get_priority(score: float) -> str:
    if score >= 66: return "high"
    if score >= 31: return "medium"
    return "low"


def get_confidence(matched_keywords: list[str], incident_type: str) -> float:
    """
    Heuristic confidence based on keyword match strength.
    More matches → higher confidence.
    """
    if incident_type == "unknown":
        return 0.30
    n = len(matched_keywords)
    base_conf = min(0.55 + n * 0.12, 0.95)
    return round(base_conf, 2)


def classify(
    text:         str,
    has_weather:  bool = False,
    has_transit:  bool = False,
    is_critical:  bool = False,
    seed:         int | None = None,
) -> dict:
    """
    Full classification pipeline: type → score → priority → confidence.

    Returns a dict with all fields needed for the DB upload or display.
    All outputs are advisory — human review required.
    """
    incident_type, matched = classify_type(text)
    score, breakdown       = score_incident(incident_type, has_weather, has_transit, is_critical, seed)
    priority               = get_priority(score)
    confidence             = get_confidence(matched, incident_type)

    return {
        "incident_type":    incident_type,
        "matched_keywords": matched,
        "severity_score":   score,
        "priority_label":   priority,
        "confidence_score": confidence,
        "score_breakdown":  breakdown,
        "ai_summary": (
            f"[Advisory — AI-generated] Predicted type: {incident_type.replace('_', ' ')}. "
            f"Severity: {score}/100 ({priority} priority). "
            f"Human verification required before dispatch."
        ),
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

def _bar(value: float, total: float = 100, width: int = 30) -> str:
    filled = round((value / total) * width)
    return "█" * filled + "░" * (width - filled)


def main():
    parser = argparse.ArgumentParser(
        description="Classify a free-text incident report and compute severity score."
    )
    parser.add_argument("--text",     required=True, help="Incident description text")
    parser.add_argument("--weather",  action="store_true", help="Weather context present")
    parser.add_argument("--transit",  action="store_true", help="Transit disruption present")
    parser.add_argument("--critical", action="store_true", help="Near critical infrastructure")
    args = parser.parse_args()

    result = classify(
        text        = args.text,
        has_weather = args.weather,
        has_transit = args.transit,
        is_critical = args.critical,
    )

    bd    = result["score_breakdown"]
    score = result["severity_score"]
    pct   = f"{score}/100"

    print()
    print("Classification Report")
    print("─" * 50)
    print(f'  Input      : "{args.text}"')
    print()
    print(f"  Type       : {result['incident_type'].replace('_', ' ').upper()}")
    if result["matched_keywords"]:
        print(f"  Keywords   : {', '.join(result['matched_keywords'])}")
    else:
        print(f"  Keywords   : (none matched — type inferred as unknown)")
    print()
    print(f"  Score breakdown:")
    print(f"    Base ({result['incident_type'].replace('_', ' ')}):  {bd['base']}")
    print(f"    Report weight:  +{bd['report']}")
    print(f"    Weather bonus:  +{bd['weather']}")
    print(f"    Transit bonus:  +{bd['transit']}")
    print(f"    Location bonus: +{bd['location']}")
    print()
    print(f"  Severity   : {_bar(score)}  {pct}")
    print(f"  Priority   : {result['priority_label'].upper()}")
    print(f"  Confidence : {_bar(result['confidence_score'], 1.0)}  {int(result['confidence_score'] * 100)}%")
    print()
    print("─" * 50)
    print("  ⚠  Advisory only — human verification required before dispatch.")
    print()


if __name__ == "__main__":
    main()

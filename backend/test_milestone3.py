"""
Milestone 3 Integration Tests
Tests Activity 3.1 (extract_freshness_features) and Activity 3.2 (analyze_freshness + HTTP endpoint).
"""
import asyncio
import json
import sys
import cv2
import numpy as np

# Reconfigure Windows console to handle UTF-8 characters safely
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def make_fresh_apple_image() -> bytes:
    """Generate a clean, vibrant red apple synthetic test image."""
    img = np.full((400, 400, 3), (240, 240, 240), dtype=np.uint8)  # neutral light background
    # Smooth, vibrant red circular apple
    cv2.circle(img, (200, 200), 120, (30, 30, 220), -1)  # BGR: vibrant red
    # Small green leaf on top
    cv2.ellipse(img, (220, 75), (25, 12), 30, 0, 360, (40, 180, 40), -1)
    # Natural specular highlight (glossy fresh shine)
    cv2.ellipse(img, (160, 150), (25, 15), -30, 0, 360, (80, 80, 255), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_spoiled_produce_image() -> bytes:
    """Generate a discolored, dark-spotted, rough surface spoiled test image."""
    img = np.full((400, 400, 3), (230, 230, 230), dtype=np.uint8)
    # Darkened, brownish decayed base
    cv2.circle(img, (200, 200), 120, (30, 60, 90), -1)  # BGR: dull dark brownish-olive
    # Heavy brown necrosis spots and dark mold patches
    for x, y, r in [(160, 160, 30), (230, 180, 35), (190, 240, 40), (240, 240, 25)]:
        cv2.circle(img, (x, y), r, (15, 25, 45), -1)  # very dark brown/black rot
    # Surface wrinkling/noise lines (triggers Canny edge density & Laplacian variance)
    for i in range(120, 280, 10):
        cv2.line(img, (i, 140), (i + 15, 260), (10, 20, 30), 2)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


async def test_activity_3_1():
    print("--- [Activity 3.1] Testing Vision Preprocessor extract_freshness_features ---")
    from services.vision_preprocessor import VisionPreprocessor

    preprocessor = VisionPreprocessor()
    fresh_bytes = make_fresh_apple_image()
    features = preprocessor.extract_freshness_features(fresh_bytes)

    assert "image_base64" in features, "Missing image_base64"
    assert "freshness_features" in features, "Missing freshness_features"
    assert "tensor_summary" in features, "Missing tensor_summary"

    ff = features["freshness_features"]
    assert "color_distribution" in ff, "Missing color_distribution"
    assert "discoloration" in ff, "Missing discoloration"
    assert "texture_metrics" in ff, "Missing texture_metrics"
    assert "saturation_levels" in ff, "Missing saturation_levels"
    assert "lab_color_stats" in ff, "Missing lab_color_stats"

    print(f"Resolution: {ff['resolution']}")
    print(f"Brown spot %: {ff['discoloration']['brown_spot_pct']}%")
    print(f"Dark spot %: {ff['discoloration']['dark_spot_pct']}%")
    print(f"Canny edge density %: {ff['texture_metrics']['edge_density_pct']}%")
    print(f"Laplacian variance: {ff['texture_metrics']['laplacian_variance']}")
    print(f"Sobel gradient mean: {ff['texture_metrics']['sobel_gradient_mean']}")

    ts = features["tensor_summary"]
    print(f"PyTorch Feature Tensor shape: {ts['shape']}")
    print(f"Feature count: {len(ts['raw_values'])}")
    assert len(ts["raw_values"]) == 13, "Expected 13 feature dimensions"
    print("=== Activity 3.1 Passed ===")


async def test_activity_3_2_service():
    print("\n--- [Activity 3.2] Testing FreshnessService analyze_freshness ---")
    from services.freshness_service import FreshnessService

    service = FreshnessService()

    # Test 1: Fresh produce
    fresh_bytes = make_fresh_apple_image()
    result_fresh = await service.analyze_freshness(fresh_bytes, item_hint="Red Apple")

    print(f"Item: {result_fresh['food_item']}")
    print(f"Status: {result_fresh['freshness_status']}")
    print(f"Score: {result_fresh['freshness_score']}/100")
    print(f"Shelf Life: {result_fresh['estimated_shelf_life_days']} days")
    print(f"Safety Rec: {result_fresh['safety_recommendation']}")
    print(f"Storage Tips ({len(result_fresh['storage_tips'])}): {result_fresh['storage_tips'][:1]}")

    assert result_fresh["freshness_status"] in ["Fresh", "Moderately Fresh", "Spoiled"], (
        f"Invalid status: {result_fresh['freshness_status']}"
    )
    assert 0 <= result_fresh["freshness_score"] <= 100
    assert "visual_characteristics" in result_fresh
    assert "opencv_features" in result_fresh

    # Test 2: Spoiled produce
    spoiled_bytes = make_spoiled_produce_image()
    result_spoiled = await service.analyze_freshness(spoiled_bytes, item_hint="Decayed Fruit")
    print(f"\nSpoiled Test - Status: {result_spoiled['freshness_status']}, Score: {result_spoiled['freshness_score']}")
    assert result_spoiled["freshness_status"] in ["Fresh", "Moderately Fresh", "Spoiled"]
    print("=== Activity 3.2 Service Direct Passed ===")


def test_activity_3_3_http():
    print("\n--- [Activity 3.3] Testing HTTP POST /api/freshness/analyze ---")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)
    fresh_bytes = make_fresh_apple_image()

    response = client.post(
        "/api/freshness/analyze",
        files={"image": ("apple.jpg", fresh_bytes, "image/jpeg")},
        data={"item_hint": "Crisp Red Apple"},
    )

    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    print("Response fields present:")
    expected_fields = [
        "food_item",
        "freshness_status",
        "freshness_score",
        "estimated_shelf_life_days",
        "visual_characteristics",
        "opencv_features",
        "safety_recommendation",
        "storage_tips",
    ]
    for field in expected_fields:
        assert field in data, f"Missing field: {field}"
        print(f"  [OK] {field}: {str(data[field])[:60]}...")

    assert data["freshness_status"] in ["Fresh", "Moderately Fresh", "Spoiled"]
    print("\n=== HTTP Endpoint /api/freshness/analyze Passed ===")


if __name__ == "__main__":
    asyncio.run(test_activity_3_1())
    asyncio.run(test_activity_3_2_service())
    test_activity_3_3_http()
    print("\n*** ALL MILESTONE 3 TESTS PASSED PERFECTLY ***")

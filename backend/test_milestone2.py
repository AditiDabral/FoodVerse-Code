"""Milestone 2 integration test – direct service call + HTTP endpoint."""
import asyncio
import json
import sys

import cv2
import numpy as np


def make_test_image() -> bytes:
    """Generate a synthetic food-plate JPEG via OpenCV."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.circle(img, (320, 240), 180, (245, 245, 245), -1)
    cv2.circle(img, (260, 200), 50, (50, 120, 220), -1)
    cv2.circle(img, (380, 200), 45, (30, 80, 180), -1)
    cv2.circle(img, (320, 310), 40, (60, 180, 60), -1)
    cv2.putText(img, "Test Plate", (240, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


async def test_service_direct():
    from services.nutrition_service import NutritionService

    svc = NutritionService()
    image_bytes = make_test_image()
    print(f"Test image size: {len(image_bytes)} bytes")

    result = await svc.analyze_nutrition(
        image_bytes,
        user_notes="This plate has grilled chicken, steamed rice, and green salad.",
    )

    assert result["status"] == "success", f"Expected success, got {result['status']}"
    print(f"STATUS:   {result['status']}")
    print(f"MODEL:    {result['model_used']}")
    print(f"FALLBACK: {result['used_fallback']}")
    print(f"CV brightness: {result['cv_metrics']['brightness_score']}")
    print(f"CV sharpness:  {result['cv_metrics']['sharpness_score']}")
    print(f"Tensor shape:  {result['tensor_info']['shape']}")

    na = result["nutrition_analysis"]
    item_count = len(na["food_items"])
    print(f"\nFood items detected: {item_count}")
    for item in na["food_items"]:
        name = item["name"]
        cals = item["calories"]
        grams = item["portion_grams"]
        print(f"  - {name}: {cals} kcal, {grams}g")

    print(f"Total calories: {na['total_calories']}")
    print(f"Health score:   {na['health_score']}/100")
    print(f"Dietary tags:   {na['dietary_tags']}")
    print(f"Insights:       {len(na['nutrition_insights'])} items")
    print(f"Recommendations:{len(na['health_recommendations'])} items")

    assert item_count > 0, "Expected at least one food item"
    assert na["total_calories"] > 0, "Expected positive total calories"
    assert 0 <= na["health_score"] <= 100, "Health score out of range"
    print("\n=== DIRECT SERVICE TEST PASSED ===\n")


def test_http_endpoint():
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)
    image_bytes = make_test_image()

    # POST multipart with detailed notes so text-only models can infer food items
    response = client.post(
        "/api/nutrition/analyze",
        files={"image": ("test_plate.jpg", image_bytes, "image/jpeg")},
        data={"notes": "Indian thali with dal tadka, basmati rice, mixed vegetable sabzi, and raita."},
    )

    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    body = response.json()
    assert body["status"] == "success"

    na = body["nutrition_analysis"]
    item_count = len(na["food_items"])
    print(f"Model used: {body['model_used']}")
    print(f"Fallback:   {body['used_fallback']}")
    print(f"Food items: {item_count}")
    print(f"Total kcal: {na['total_calories']}")
    print(f"Health score: {na['health_score']}")
    print(f"Tags: {na['dietary_tags']}")

    # Validate response structure
    assert isinstance(na["food_items"], list), "food_items should be a list"
    assert isinstance(na["total_calories"], (int, float)), "total_calories should be numeric"
    assert isinstance(na["health_score"], int), "health_score should be an integer"
    assert isinstance(na["dietary_tags"], list), "dietary_tags should be a list"
    assert isinstance(na["nutrition_insights"], list), "nutrition_insights should be a list"
    assert isinstance(na["health_recommendations"], list), "health_recommendations should be a list"

    # With detailed notes, the model should detect food items
    assert item_count > 0, "Expected at least one food item with detailed notes"
    assert na["total_calories"] > 0, "Expected positive total calories"

    print("\n=== HTTP ENDPOINT TEST PASSED ===\n")

    # Also verify health endpoint still works
    health = client.get("/api/health")
    assert health.status_code == 200
    print(f"Health check: {health.json()['status']}")
    print("=== HEALTH CHECK STILL OK ===")


if __name__ == "__main__":
    asyncio.run(test_service_direct())
    test_http_endpoint()
    print("\n*** ALL MILESTONE 2 TESTS PASSED ***")

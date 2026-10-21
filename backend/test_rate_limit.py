import sys
import os
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app, meal_planner_service

client = TestClient(app)

def test_rate_limiting():
    # Test health check is NOT rate limited
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Expected 200 for health, got {health_res.status_code}"
    print("Health check endpoint OK (200)")

    # Mock the external service call to return instantly
    mock_plan = {
        "user_summary": {"status": "ok"},
        "daily_meal_plan": {},
        "adaptive_recommendations": {}
    }

    profile_payload = {
        "age": 28,
        "gender": "male",
        "weight_kg": 75,
        "height_cm": 178,
        "activity_level": "Moderately Active",
        "goal": "Weight Loss",
        "daily_calorie_target": 2000,
        "dietary_preference": "Balanced",
        "allergies": []
    }

    with patch.object(meal_planner_service, "generate_personalized_meal_plan", new_callable=AsyncMock) as mocked_service:
        mocked_service.return_value = mock_plan

        statuses = []
        responses = []
        # Send 7 requests in rapid succession
        for i in range(7):
            res = client.post("/api/meal-plan/generate", json=profile_payload)
            statuses.append(res.status_code)
            responses.append(res)
            print(f"Request {i + 1}: Status {res.status_code}")

        # The 6th and 7th requests should be rate-limited (HTTP 429)
        assert 429 in statuses, f"Expected 429 in statuses, but got {statuses}"
        rate_limited_res = next(r for r in responses if r.status_code == 429)
        data = rate_limited_res.json()
        print("Rate limited response payload:", data)
        assert data.get("error") == "Too Many Requests", f"Expected error 'Too Many Requests', got {data.get('error')}"
        assert "high traffic" in data.get("detail", ""), f"Expected user-friendly message in detail, got {data.get('detail')}"
        assert rate_limited_res.headers.get("Retry-After") == "60", "Expected Retry-After header"
        print("Rate limiting test PASSED successfully!")

if __name__ == "__main__":
    test_rate_limiting()

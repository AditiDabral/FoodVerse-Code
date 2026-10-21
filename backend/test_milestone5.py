"""
Milestone 5 Integration Test Suite
Tests:
- Activity 5.1 & 5.2: User Profile Processing, TDEE / Macro Calculation & Adaptive Meal Plan Generation
- Endpoint: POST /api/meal-plan/generate
"""
import asyncio
import json
import sys

# Safe stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def test_tdee_and_macro_calculations():
    print("--- [Activity 5.1] Testing TDEE, BMR & Macro Calculations ---")
    from services.meal_planner_service import UserProfile, calculate_user_summary

    # Male, 28y, 80kg, 180cm, Moderately Active, Goal: Weight Loss
    p_male = UserProfile(
        age=28,
        gender="male",
        weight_kg=80.0,
        height_cm=180.0,
        activity_level="Moderately Active",
        goal="Weight Loss",
        dietary_preference="Balanced",
        allergies=["Peanuts"],
    )
    res_m = calculate_user_summary(p_male)
    print(f"Male Profile: BMR={res_m['bmr_kcal']} kcal, TDEE={res_m['tdee_kcal']} kcal, Target={res_m['target_calories']} kcal")
    print(f"Target Macros: {res_m['target_macros']}")

    # BMR: 10*80 + 6.25*180 - 5*28 + 5 = 800 + 1125 - 140 + 5 = 1790
    assert 1750 <= res_m["bmr_kcal"] <= 1850
    # TDEE: 1790 * 1.55 = 2774
    assert res_m["tdee_kcal"] > res_m["bmr_kcal"]
    # Weight Loss deficit: ~500 kcal
    assert res_m["target_calories"] < res_m["tdee_kcal"]
    assert res_m["target_macros"]["protein_g"] > 0
    assert res_m["target_macros"]["carbs_g"] > 0
    assert res_m["target_macros"]["fats_g"] > 0

    # Female, 30y, 60kg, 165cm, Lightly Active, Goal: Muscle Gain
    p_female = UserProfile(
        age=30,
        gender="female",
        weight_kg=60.0,
        height_cm=165.0,
        activity_level="Lightly Active",
        goal="Muscle Gain",
        dietary_preference="Keto",
    )
    res_f = calculate_user_summary(p_female)
    print(f"Female Keto Profile: BMR={res_f['bmr_kcal']} kcal, TDEE={res_f['tdee_kcal']} kcal, Target={res_f['target_calories']} kcal")
    print(f"Keto Macros: {res_f['target_macros']}")
    assert res_f["target_calories"] > res_f["tdee_kcal"]
    # Keto should have high fat %
    assert res_f["target_macros"]["fats_g"] > res_f["target_macros"]["carbs_g"]
    print("=== TDEE & Macro Calculations Passed ===\n")


async def test_meal_planner_service_direct():
    print("--- [Activity 5.2] Testing MealPlannerService.generate_personalized_meal_plan ---")
    from services.meal_planner_service import MealPlannerService, UserProfile

    service = MealPlannerService()
    profile = UserProfile(
        age=29,
        gender="male",
        weight_kg=78.0,
        height_cm=178.0,
        activity_level="Moderately Active",
        goal="Weight Loss",
        daily_calorie_target=2100,
        dietary_preference="Non-Vegetarian",
        allergies=["Shellfish"],
    )

    result = await service.generate_personalized_meal_plan(profile)

    assert result["status"] == "success"
    assert "user_summary" in result
    assert "daily_meal_plan" in result
    assert "adaptive_recommendations" in result

    us = result["user_summary"]
    print(f"User Summary: Target Cals={us['target_calories']} kcal, Goal={us['goal']}")
    print(f"Macros: Protein={us['target_macros']['protein_g']}g, Carbs={us['target_macros']['carbs_g']}g, Fats={us['target_macros']['fats_g']}g")

    dmp = result["daily_meal_plan"]
    print(f"\nBreakfast: {dmp['breakfast']['dish_name']} ({dmp['breakfast']['calories']} kcal, {dmp['breakfast']['protein_g']}g P)")
    print(f"Lunch:     {dmp['lunch']['dish_name']} ({dmp['lunch']['calories']} kcal, {dmp['lunch']['protein_g']}g P)")
    print(f"Dinner:    {dmp['dinner']['dish_name']} ({dmp['dinner']['calories']} kcal, {dmp['dinner']['protein_g']}g P)")
    print(f"Snacks ({len(dmp['snacks'])}): {[s['dish_name'] for s in dmp['snacks']]}")

    # Validate meal items have instructions and macros
    for meal_key in ["breakfast", "lunch", "dinner"]:
        meal = dmp[meal_key]
        assert "dish_name" in meal and len(meal["dish_name"]) > 0
        assert "description" in meal and len(meal["description"]) > 0
        assert meal["calories"] > 0
        assert "prep_instructions" in meal and len(meal["prep_instructions"]) > 0

    assert len(dmp["snacks"]) >= 1
    snack = dmp["snacks"][0]
    assert "dish_name" in snack and snack["calories"] > 0

    ar = result["adaptive_recommendations"]
    print(f"\nHydration Target: {ar['hydration_target_liters']} L/day")
    print(f"Dietary Insights ({len(ar['dietary_insights'])}): {ar['dietary_insights'][:1]}")
    print(f"Weekly Adjustments ({len(ar['weekly_adjustments'])}): {ar['weekly_adjustments'][:1]}")
    assert ar["hydration_target_liters"] > 1.5
    assert len(ar["dietary_insights"]) > 0
    assert len(ar["weekly_adjustments"]) > 0

    print("=== Meal Planner Service Direct Passed ===\n")


def test_http_endpoint():
    print("--- [Endpoint] Testing POST /api/meal-plan/generate ---")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    # Test 1: Weight Loss / Vegan profile
    payload_vegan = {
        "age": 27,
        "gender": "female",
        "weight_kg": 64.0,
        "height_cm": 168.0,
        "activity_level": "Moderately Active",
        "goal": "Weight Loss",
        "dietary_preference": "Vegan",
        "allergies": ["Peanuts", "Gluten"],
    }

    resp1 = client.post("/api/meal-plan/generate", json=payload_vegan)
    print(f"POST /api/meal-plan/generate (Vegan) -> Status: {resp1.status_code}")
    assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}: {resp1.text}"

    data1 = resp1.json()
    assert data1["status"] == "success"
    assert "user_summary" in data1
    assert "daily_meal_plan" in data1
    assert "adaptive_recommendations" in data1
    assert data1["user_summary"]["dietary_preference"] == "Vegan"
    print(f"  Target: {data1['user_summary']['target_calories']} kcal")
    print(f"  Breakfast: {data1['daily_meal_plan']['breakfast']['dish_name']}")
    print(f"  Lunch:     {data1['daily_meal_plan']['lunch']['dish_name']}")
    print(f"  Dinner:    {data1['daily_meal_plan']['dinner']['dish_name']}")

    # Test 2: Muscle Gain / Keto profile
    payload_keto = {
        "age": 25,
        "gender": "male",
        "weight_kg": 75.0,
        "height_cm": 182.0,
        "activity_level": "Very Active",
        "goal": "Muscle Gain",
        "dietary_preference": "Keto",
        "allergies": [],
    }

    resp2 = client.post("/api/meal-plan/generate", json=payload_keto)
    print(f"\nPOST /api/meal-plan/generate (Keto Muscle Gain) -> Status: {resp2.status_code}")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["user_summary"]["goal"] == "Muscle Gain"
    assert data2["daily_meal_plan"]["lunch"]["calories"] > 0

    # Test 3: Diabetic Friendly profile
    payload_diabetic = {
        "age": 55,
        "gender": "female",
        "weight_kg": 82.0,
        "height_cm": 162.0,
        "activity_level": "Lightly Active",
        "goal": "Diabetic Friendly",
        "dietary_preference": "Vegetarian",
        "allergies": ["Dairy"],
    }
    resp3 = client.post("/api/meal-plan/generate", json=payload_diabetic)
    print(f"\nPOST /api/meal-plan/generate (Diabetic Friendly) -> Status: {resp3.status_code}")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["user_summary"]["goal"] == "Diabetic Friendly"

    print("\n=== HTTP Endpoint POST /api/meal-plan/generate Passed ===")


if __name__ == "__main__":
    test_tdee_and_macro_calculations()
    asyncio.run(test_meal_planner_service_direct())
    test_http_endpoint()
    print("\n*** ALL MILESTONE 5 TESTS PASSED PERFECTLY ***")

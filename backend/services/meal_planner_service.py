"""
Meal Planner Service (Milestone 5)
Activity 5.1 & 5.2 – User Profile Processing & Adaptive Meal Plan Generation (Objectives 7, 8, 10).
Calibrates TDEE and macro distribution via Mifflin-St Jeor formula,
and generates structured, personalized daily meal plans via LLM reasoning.
"""
import json
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from services.llm_engine import LLMEngine


# --------------------------------------------------------------------------- #
#  Pydantic Models
# --------------------------------------------------------------------------- #
class UserProfile(BaseModel):
    age: int = Field(default=30, ge=12, le=100)
    gender: str = Field(default="male", description="male, female, or other")
    weight_kg: float = Field(default=70.0, ge=30.0, le=250.0)
    height_cm: float = Field(default=175.0, ge=100.0, le=250.0)
    activity_level: str = Field(
        default="Moderately Active",
        description="Sedentary, Lightly Active, Moderately Active, Very Active, Extremely Active",
    )
    goal: str = Field(
        default="Maintenance",
        description="Weight Loss, Muscle Gain, Maintenance, Diabetic Friendly",
    )
    daily_calorie_target: Optional[int] = Field(default=None, description="Optional manual calorie override")
    dietary_preference: str = Field(
        default="Balanced",
        description="Vegan, Vegetarian, Keto, Non-Vegetarian, Gluten-Free, Balanced",
    )
    allergies: List[str] = Field(default_factory=list, description="Peanuts, Shellfish, Dairy, Gluten, etc.")


class TargetMacros(BaseModel):
    protein_g: float
    carbs_g: float
    fats_g: float


class UserSummary(BaseModel):
    bmr_kcal: int
    tdee_kcal: int
    target_calories: int
    target_macros: TargetMacros
    goal: str
    dietary_preference: str
    allergies: List[str]


class MealItem(BaseModel):
    dish_name: str
    description: str
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    prep_instructions: str


class DailyMealPlan(BaseModel):
    breakfast: MealItem
    lunch: MealItem
    dinner: MealItem
    snacks: List[MealItem] = Field(default_factory=list)


class AdaptiveRecommendations(BaseModel):
    dietary_insights: List[str] = Field(default_factory=list)
    hydration_target_liters: float = 2.5
    weekly_adjustments: List[str] = Field(default_factory=list)


class PersonalizedMealPlanResult(BaseModel):
    status: str = "success"
    user_summary: UserSummary
    daily_meal_plan: DailyMealPlan
    adaptive_recommendations: AdaptiveRecommendations


# Backward-compatible Milestone 1 placeholder model
class MealPlanRequest(BaseModel):
    user_id: Optional[str] = None
    target_calories_daily: Optional[int] = Field(default=2000)
    dietary_preferences: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    available_ingredients: List[str] = Field(default_factory=list)
    plan_duration_days: int = Field(default=7, ge=1, le=30)


# --------------------------------------------------------------------------- #
#  Scientific TDEE and Macro Calculator
# --------------------------------------------------------------------------- #
def calculate_user_summary(profile: UserProfile) -> Dict[str, Any]:
    """
    Computes Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation,
    Total Daily Energy Expenditure (TDEE), and optimal macro targets.
    """
    # 1. BMR Calculation
    gender_norm = profile.gender.strip().lower()
    if gender_norm in ["m", "male"]:
        bmr = 10.0 * profile.weight_kg + 6.25 * profile.height_cm - 5.0 * profile.age + 5.0
    elif gender_norm in ["f", "female"]:
        bmr = 10.0 * profile.weight_kg + 6.25 * profile.height_cm - 5.0 * profile.age - 161.0
    else:
        # Neutral average
        bmr = 10.0 * profile.weight_kg + 6.25 * profile.height_cm - 5.0 * profile.age - 78.0

    # 2. Activity Multipliers
    act = profile.activity_level.strip().lower()
    if "sedentary" in act:
        mult = 1.2
    elif "light" in act:
        mult = 1.375
    elif "very" in act:
        mult = 1.725
    elif "extreme" in act:
        mult = 1.9
    else:
        # Moderate default
        mult = 1.55

    tdee = bmr * mult

    # 3. Goal Adjustment
    goal_norm = profile.goal.strip().lower()
    if "loss" in goal_norm or "cut" in goal_norm:
        adjusted_cals = max(1200, round(tdee - 500))
    elif "gain" in goal_norm or "bulk" in goal_norm:
        adjusted_cals = round(tdee + 350)
    elif "diabetic" in goal_norm:
        adjusted_cals = round(tdee - 200)
    else:
        adjusted_cals = round(tdee)

    # Use manual target if explicitly supplied
    if profile.daily_calorie_target and profile.daily_calorie_target >= 800:
        target_calories = profile.daily_calorie_target
    else:
        target_calories = adjusted_cals

    # 4. Macro Splits (% of calories: Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g)
    diet_norm = profile.dietary_preference.strip().lower()
    if "keto" in diet_norm:
        p_pct, c_pct, f_pct = 0.20, 0.05, 0.75
    elif "loss" in goal_norm:
        p_pct, c_pct, f_pct = 0.35, 0.35, 0.30
    elif "gain" in goal_norm:
        p_pct, c_pct, f_pct = 0.32, 0.48, 0.20
    elif "diabetic" in goal_norm:
        p_pct, c_pct, f_pct = 0.30, 0.35, 0.35
    else:
        p_pct, c_pct, f_pct = 0.28, 0.47, 0.25

    protein_g = round((target_calories * p_pct) / 4.0, 1)
    carbs_g = round((target_calories * c_pct) / 4.0, 1)
    fats_g = round((target_calories * f_pct) / 9.0, 1)

    return {
        "bmr_kcal": round(bmr),
        "tdee_kcal": round(tdee),
        "target_calories": target_calories,
        "target_macros": {
            "protein_g": protein_g,
            "carbs_g": carbs_g,
            "fats_g": fats_g,
        },
        "goal": profile.goal,
        "dietary_preference": profile.dietary_preference,
        "allergies": profile.allergies,
    }


MEAL_PLAN_PROMPT_TEMPLATE = """You are FoodVerse AI, an elite clinical nutritionist and dietitian.

Create a highly detailed, personalized daily meal plan for this user profile:
- Goal: {goal}
- Dietary Preference: {dietary_preference}
- Allergies to Exclude: {allergies}
- Daily Calorie Target: {target_calories} kcal
- Target Macros: {protein_g}g Protein, {carbs_g}g Carbs, {fats_g}g Fats

You must return a valid JSON object matching EXACTLY this structure:
{{
  "daily_meal_plan": {{
    "breakfast": {{
      "dish_name": "<dish title>",
      "description": "<appetizing description>",
      "calories": <calories in kcal>,
      "protein_g": <protein in grams>,
      "carbs_g": <carbohydrates in grams>,
      "fats_g": <fats in grams>,
      "prep_instructions": "<concise step-by-step preparation steps>"
    }},
    "lunch": {{
      "dish_name": "<dish title>",
      "description": "<appetizing description>",
      "calories": <calories in kcal>,
      "protein_g": <protein in grams>,
      "carbs_g": <carbohydrates in grams>,
      "fats_g": <fats in grams>,
      "prep_instructions": "<concise step-by-step preparation steps>"
    }},
    "dinner": {{
      "dish_name": "<dish title>",
      "description": "<appetizing description>",
      "calories": <calories in kcal>,
      "protein_g": <protein in grams>,
      "carbs_g": <carbohydrates in grams>,
      "fats_g": <fats in grams>,
      "prep_instructions": "<concise step-by-step preparation steps>"
    }},
    "snacks": [
      {{
        "dish_name": "<healthy snack 1>",
        "description": "<description>",
        "calories": <calories in kcal>,
        "protein_g": <protein in grams>,
        "carbs_g": <carbohydrates in grams>,
        "fats_g": <fats in grams>,
        "prep_instructions": "<quick prep instructions>"
      }},
      {{
        "dish_name": "<healthy snack 2>",
        "description": "<description>",
        "calories": <calories in kcal>,
        "protein_g": <protein in grams>,
        "carbs_g": <carbohydrates in grams>,
        "fats_g": <fats in grams>,
        "prep_instructions": "<quick prep instructions>"
      }}
    ]
  }},
  "adaptive_recommendations": {{
    "dietary_insights": [
      "<specific nutritional observation based on their goal>",
      "<macronutrient distribution tip>"
    ],
    "hydration_target_liters": <number, e.g. 2.8>,
    "weekly_adjustments": [
      "<actionable guideline for plateau management or progress tracking>",
      "<lifestyle/sleep/exercise tip>"
    ]
  }}
}}

Ensure no allergic ingredients are used. Total calories across breakfast, lunch, dinner, and snacks should sum close to {target_calories} kcal.
Return ONLY the JSON object, no markdown code fences, no extra conversational text.
"""


class MealPlannerService:
    """Service for agentic meal optimization and dynamic recipe generation."""

    def __init__(self, llm_engine: Optional[LLMEngine] = None):
        self.llm = llm_engine or LLMEngine()

    async def generate_personalized_meal_plan(
        self,
        profile_data: Union[UserProfile, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Activity 5.1 & 5.2 – Computes BMR/TDEE & target macros and generates
        a personalized daily meal plan with adaptive recommendations.
        """
        # Parse into UserProfile if dict provided
        if isinstance(profile_data, dict):
            profile = UserProfile(**profile_data)
        else:
            profile = profile_data

        # Step 1: Scientific calculations
        summary_dict = calculate_user_summary(profile)
        user_summary = UserSummary(
            bmr_kcal=summary_dict["bmr_kcal"],
            tdee_kcal=summary_dict["tdee_kcal"],
            target_calories=summary_dict["target_calories"],
            target_macros=TargetMacros(**summary_dict["target_macros"]),
            goal=summary_dict["goal"],
            dietary_preference=summary_dict["dietary_preference"],
            allergies=summary_dict["allergies"],
        )

        # Step 2: Format prompt for LLM
        prompt = MEAL_PLAN_PROMPT_TEMPLATE.format(
            goal=profile.goal,
            dietary_preference=profile.dietary_preference,
            allergies=", ".join(profile.allergies) if profile.allergies else "None",
            target_calories=summary_dict["target_calories"],
            protein_g=summary_dict["target_macros"]["protein_g"],
            carbs_g=summary_dict["target_macros"]["carbs_g"],
            fats_g=summary_dict["target_macros"]["fats_g"],
        )

        # Step 3: Call LLM with 3-tier fallback
        llm_result = await self.llm.generate_meal_plan_llm(
            prompt=prompt,
            profile_data=profile.model_dump(),
            summary=summary_dict,
        )

        raw_resp = llm_result.get("response", "{}")
        try:
            parsed = json.loads(raw_resp)
        except json.JSONDecodeError:
            parsed = {}

        # Handle nested objects if any
        if "daily_meal_plan" not in parsed and isinstance(parsed, dict):
            for v in parsed.values():
                if isinstance(v, dict) and "daily_meal_plan" in v:
                    parsed = v
                    break

        dmp_data = parsed.get("daily_meal_plan") or {}

        def parse_meal_item(item_data: Any, default_name: str, cal_pct: float) -> MealItem:
            default_cal = round(user_summary.target_calories * cal_pct)
            if not isinstance(item_data, dict):
                item_data = {}
            return MealItem(
                dish_name=item_data.get("dish_name") or default_name,
                description=item_data.get("description") or f"Nutritionally balanced {default_name.lower()}.",
                calories=float(item_data.get("calories", default_cal)),
                protein_g=float(item_data.get("protein_g", round(user_summary.target_macros.protein_g * cal_pct, 1))),
                carbs_g=float(item_data.get("carbs_g", round(user_summary.target_macros.carbs_g * cal_pct, 1))),
                fats_g=float(item_data.get("fats_g", round(user_summary.target_macros.fats_g * cal_pct, 1))),
                prep_instructions=item_data.get("prep_instructions") or "Prepare ingredients, cook thoroughly, and serve warm.",
            )

        breakfast = parse_meal_item(dmp_data.get("breakfast"), "Balanced Energizing Breakfast", 0.25)
        lunch = parse_meal_item(dmp_data.get("lunch"), "Nutrient-Dense Lunch Plate", 0.35)
        dinner = parse_meal_item(dmp_data.get("dinner"), "Light & Wholesome Dinner", 0.30)

        raw_snacks = dmp_data.get("snacks") or []
        snacks_list = []
        if isinstance(raw_snacks, list) and len(raw_snacks) > 0:
            for s in raw_snacks:
                snacks_list.append(parse_meal_item(s, "Healthy Snack", 0.05))
        else:
            snacks_list = [
                parse_meal_item({}, "Handful of Raw Mixed Nuts & Apple Slices", 0.05),
                parse_meal_item({}, "Fresh Cucumber Rounds with Roasted Red Pepper Hummus", 0.05),
            ]

        daily_meal_plan = DailyMealPlan(
            breakfast=breakfast,
            lunch=lunch,
            dinner=dinner,
            snacks=snacks_list,
        )

        rec_data = parsed.get("adaptive_recommendations") or {}
        hydration = float(rec_data.get("hydration_target_liters", round(profile.weight_kg * 0.035, 1)))

        adaptive_recommendations = AdaptiveRecommendations(
            dietary_insights=rec_data.get("dietary_insights") or [
                f"Caloric intake targeted at {user_summary.target_calories} kcal for your {profile.goal} objective.",
                f"Aim for {user_summary.target_macros.protein_g}g daily protein to support tissue repair and satiety.",
            ],
            hydration_target_liters=hydration,
            weekly_adjustments=rec_data.get("weekly_adjustments") or [
                "Track body weight weekly under identical conditions.",
                "If weight changes plateau after 14 days, adjust total calories by 100-150 kcal.",
            ],
        )

        result = PersonalizedMealPlanResult(
            status="success",
            user_summary=user_summary,
            daily_meal_plan=daily_meal_plan,
            adaptive_recommendations=adaptive_recommendations,
        )
        return result.model_dump()

    # Milestone 1 placeholder method kept for backward compatibility
    async def generate_meal_plan(self, request: MealPlanRequest) -> Dict[str, Any]:
        """Milestone 1 compat method."""
        profile = UserProfile(
            daily_calorie_target=request.target_calories_daily or 2000,
            dietary_preference=request.dietary_preferences[0] if request.dietary_preferences else "Balanced",
            allergies=request.allergies,
        )
        return await self.generate_personalized_meal_plan(profile)

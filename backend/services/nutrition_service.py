"""
Nutrition Service (Milestone 2)
Activity 2.1 – Food Recognition & Classification
Activity 2.2 – Nutrition Estimation, Health Scoring & Recommendations

Orchestrates vision_preprocessor → llm_engine → structured nutrition response.
"""
import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from services.vision_preprocessor import VisionPreprocessor
from services.llm_engine import LLMEngine


# --------------------------------------------------------------------------- #
#  Pydantic response models
# --------------------------------------------------------------------------- #
class FoodItem(BaseModel):
    name: str
    portion_grams: float = Field(default=100.0, description="Estimated portion weight in grams")
    calories: float = Field(default=0.0, description="Calories in kcal")
    protein_g: float = Field(default=0.0)
    carbs_g: float = Field(default=0.0)
    fats_g: float = Field(default=0.0)
    fiber_g: float = Field(default=0.0)


class NutritionalProfile(BaseModel):
    food_name: str
    portion_grams: float = Field(default=100.0, description="Estimated portion weight in grams")
    calories_kcal: float = Field(default=0.0, description="Calories in kcal")
    protein_g: float = Field(default=0.0, description="Protein in grams")
    carbohydrates_g: float = Field(default=0.0, description="Carbohydrates in grams")
    fats_g: float = Field(default=0.0, description="Fats in grams")
    fiber_g: float = Field(default=0.0, description="Dietary fiber in grams")
    sodium_mg: float = Field(default=0.0, description="Sodium in milligrams")
    health_rating: Optional[str] = Field(default="Balanced", description="Nutritional health index")


class NutritionAnalysisResult(BaseModel):
    food_items: List[FoodItem] = Field(default_factory=list)
    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fats_g: float = 0.0
    total_fiber_g: float = 0.0
    health_score: int = Field(default=70, ge=0, le=100)
    dietary_tags: List[str] = Field(default_factory=list)
    nutrition_insights: List[str] = Field(default_factory=list)
    health_recommendations: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
#  Nutrition analysis prompt
# --------------------------------------------------------------------------- #
NUTRITION_PROMPT = """You are FoodVerse AI, an expert multimodal food recognition and nutrition analysis engine.

Analyze the food image provided and return a JSON object with EXACTLY this structure:

{
  "food_items": [
    {
      "name": "<dish or food item name>",
      "portion_grams": <estimated portion weight in grams>,
      "calories": <estimated calories in kcal>,
      "protein_g": <protein in grams>,
      "carbs_g": <carbohydrates in grams>,
      "fats_g": <fats in grams>,
      "fiber_g": <dietary fiber in grams>
    }
  ],
  "total_calories": <sum of all item calories>,
  "total_protein_g": <sum>,
  "total_carbs_g": <sum>,
  "total_fats_g": <sum>,
  "total_fiber_g": <sum>,
  "health_score": <integer 0-100, where 100 is healthiest>,
  "dietary_tags": ["<e.g. High Protein>", "<Balanced>", "<Low Carb>"],
  "nutrition_insights": ["<insight 1>", "<insight 2>"],
  "health_recommendations": ["<recommendation 1>", "<recommendation 2>"]
}

Rules:
- Identify EVERY distinct dish / food item visible on the plate or in the image.
- Estimate realistic portion sizes and macros based on visual cues.
- health_score: 80+ for nutrient-dense whole foods, 40-60 for processed/fried, <40 for junk food.
- dietary_tags: include relevant labels such as "High Protein", "High Fiber", "Low Fat", "Low Carb", "Balanced", "Vegan", "Vegetarian", etc.
- nutrition_insights: 2-3 factual observations about the nutritional value.
- health_recommendations: 2-3 actionable tips to improve the meal.
- Return ONLY the JSON object, no markdown fences, no extra text.
"""


# --------------------------------------------------------------------------- #
#  Service class
# --------------------------------------------------------------------------- #
class NutritionService:
    """Service for multimodal dietary logging and nutritional decomposition."""

    def __init__(
        self,
        vision_preprocessor: Optional[VisionPreprocessor] = None,
        llm_engine: Optional[LLMEngine] = None,
    ):
        self.vision = vision_preprocessor or VisionPreprocessor()
        self.llm = llm_engine or LLMEngine()

    async def analyze_nutrition(
        self,
        image_bytes: bytes,
        user_notes: str = "",
    ) -> Dict[str, Any]:
        """
        End-to-end food recognition and nutrition estimation pipeline.

        1. Runs preprocess_image → OpenCV + PyTorch metrics + base64 image.
        2. Sends image to LLM for food classification (Activity 2.1).
        3. Parses structured nutrition JSON (Activity 2.2).
        """
        # Step 1 – Vision preprocessing
        preprocessed = self.vision.preprocess_image(image_bytes)
        image_base64 = preprocessed["image_base64"]
        cv_metrics = preprocessed["cv_metrics"]
        tensor_info = preprocessed["tensor_info"]

        # Build prompt (append user notes if provided)
        prompt = NUTRITION_PROMPT
        if user_notes:
            prompt += f"\n\nAdditional user context: {user_notes}"

        # Step 2 – LLM food analysis
        llm_result = await self.llm.analyze_food_image(
            prompt=prompt,
            image_base64=image_base64,
            cv_metrics=cv_metrics,
        )

        # Step 3 – Parse response (robust: handle nested JSON structures)
        raw_response = llm_result.get("response", "{}")
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {}

        # LLMs sometimes nest results inside a wrapper key — search recursively
        if "food_items" not in parsed and isinstance(parsed, dict):
            for key, value in parsed.items():
                if isinstance(value, dict) and "food_items" in value:
                    parsed = value
                    break

        # Normalise into our Pydantic model (defensive parsing)
        food_items = []
        for item in parsed.get("food_items", []):
            food_items.append(FoodItem(
                name=item.get("name", "Unknown Item"),
                portion_grams=item.get("portion_grams", 100),
                calories=item.get("calories", 0),
                protein_g=item.get("protein_g", 0),
                carbs_g=item.get("carbs_g", 0),
                fats_g=item.get("fats_g", 0),
                fiber_g=item.get("fiber_g", 0),
            ))

        analysis = NutritionAnalysisResult(
            food_items=food_items,
            total_calories=parsed.get("total_calories", sum(i.calories for i in food_items)),
            total_protein_g=parsed.get("total_protein_g", sum(i.protein_g for i in food_items)),
            total_carbs_g=parsed.get("total_carbs_g", sum(i.carbs_g for i in food_items)),
            total_fats_g=parsed.get("total_fats_g", sum(i.fats_g for i in food_items)),
            total_fiber_g=parsed.get("total_fiber_g", sum(i.fiber_g for i in food_items)),
            health_score=int(parsed.get("health_score", 70)),
            dietary_tags=parsed.get("dietary_tags", ["Balanced"]),
            nutrition_insights=parsed.get("nutrition_insights", []),
            health_recommendations=parsed.get("health_recommendations", []),
        )

        return {
            "status": "success",
            "model_used": llm_result.get("model", "unknown"),
            "used_fallback": llm_result.get("fallback", False),
            "cv_metrics": cv_metrics,
            "tensor_info": tensor_info,
            "nutrition_analysis": analysis.model_dump(),
        }

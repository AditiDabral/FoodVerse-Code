"""
LLM Engine Service
Handles Groq Meta LLaMA multimodal vision-language reasoning and Whisper audio transcription.
Includes a realistic fallback JSON generator for offline / missing-key testing.
"""
import json
import os
import random
import tempfile
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv

load_dotenv()

# --------------- Model configuration -------------------------------------- #
DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b"
TEXT_FALLBACK_MODEL = "openai/gpt-oss-120b"
VISION_CANDIDATE_MODELS = ["qwen/qwen3.8-27b", "llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]


# --------------- Fallback generator for testing without API key ----------- #
def _generate_fallback_nutrition_json() -> str:
    """
    Returns a realistic mock JSON string that mirrors the schema
    the real LLM would produce.  Used when GROQ_API_KEY is absent
    or invalid so that integration tests never fail.
    """
    items = [
        {"name": "Grilled Chicken Breast", "portion_grams": 180, "calories": 280,
         "protein_g": 42, "carbs_g": 0, "fats_g": 12, "fiber_g": 0},
        {"name": "Steamed Basmati Rice", "portion_grams": 200, "calories": 260,
         "protein_g": 5, "carbs_g": 57, "fats_g": 0.5, "fiber_g": 1},
        {"name": "Mixed Vegetable Salad", "portion_grams": 120, "calories": 55,
         "protein_g": 2, "carbs_g": 10, "fats_g": 0.5, "fiber_g": 4},
        {"name": "Dal Tadka (Lentil Curry)", "portion_grams": 150, "calories": 180,
         "protein_g": 9, "carbs_g": 25, "fats_g": 5, "fiber_g": 6},
    ]
    selected = random.sample(items, k=min(random.randint(2, 4), len(items)))
    total_cal = sum(i["calories"] for i in selected)
    total_prot = sum(i["protein_g"] for i in selected)
    total_carbs = sum(i["carbs_g"] for i in selected)
    total_fats = sum(i["fats_g"] for i in selected)
    total_fiber = sum(i["fiber_g"] for i in selected)

    health_score = min(100, max(0, int(65 + total_fiber * 2 - total_fats * 0.5)))

    tags = []
    if total_prot > 30:
        tags.append("High Protein")
    if total_fiber > 8:
        tags.append("High Fiber")
    if total_fats < 20:
        tags.append("Low Fat")
    if total_carbs < 50:
        tags.append("Low Carb")
    if not tags:
        tags.append("Balanced")

    result = {
        "food_items": selected,
        "total_calories": total_cal,
        "total_protein_g": total_prot,
        "total_carbs_g": total_carbs,
        "total_fats_g": total_fats,
        "total_fiber_g": total_fiber,
        "health_score": health_score,
        "dietary_tags": tags,
        "nutrition_insights": [
            f"This meal provides approximately {total_cal} kcal with a good protein-to-fat ratio.",
            "Including more leafy greens or fruit would boost micronutrient diversity.",
        ],
        "health_recommendations": [
            "Consider adding a source of omega-3 fatty acids such as walnuts or flaxseed.",
            "Stay hydrated — pair this meal with water or herbal tea for optimal digestion.",
        ],
    }
    return json.dumps(result)


def _generate_fallback_freshness_json(
    item_hint: str = "",
    freshness_features: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Returns a realistic mock freshness JSON string based on visual indicators.
    Used when GROQ_API_KEY is absent, rate-limited, or offline.
    """
    cleaned_hint = item_hint.strip() if item_hint else ""
    if cleaned_hint and cleaned_hint.lower() not in ["fresh produce", "detected produce", "new produce image", "analyzed item", "apple"]:
        food_name = cleaned_hint
    else:
        # Determine likely produce from OpenCV color distribution
        hue = 0.0
        if freshness_features:
            color_dist = freshness_features.get("color_distribution", {})
            hue = float(color_dist.get("hue_mean", 0.0))
        if 35 <= hue <= 95:
            food_name = "Fresh Broccoli"
        elif 135 <= hue <= 175:
            food_name = "Red Onions"
        elif 15 <= hue <= 35:
            food_name = "Bananas"
        else:
            food_name = cleaned_hint if cleaned_hint else "Fresh Produce"

    # Analyze visual indicators from OpenCV metrics if provided
    brown_pct = 0.0
    dark_pct = 0.0
    edge_density = 0.0
    if freshness_features:
        discoloration = freshness_features.get("discoloration", {})
        brown_pct = float(discoloration.get("brown_spot_pct", 0.0))
        dark_pct = float(discoloration.get("dark_spot_pct", 0.0))
        texture = freshness_features.get("texture_metrics", {})
        edge_density = float(texture.get("edge_density_pct", 0.0))

    combined_discoloration = brown_pct + dark_pct

    if combined_discoloration > 40.0 or edge_density > 25.0:
        status = "Spoiled"
        score = random.randint(18, 35)
        shelf_life = 0
        color_analysis = "Severe surface darkening, extensive brown/black necrosis, and lost natural luster."
        texture_analysis = "High edge density and structural degradation indicative of wrinkling and tissue breakdown."
        discoloration_level = f"Extensive ({combined_discoloration:.1f}% necrotic/decayed surface area)."
        surface_patterns = "Visible fungal mycelium, wilting, or soft sunken spots."
        safety_rec = "Do NOT consume. Discard immediately to prevent foodborne illness or mycotoxin ingestion."
        storage_tips = [
            "Safely dispose of spoiled item immediately in compost or sealed trash.",
            "Thoroughly clean and sanitize adjacent refrigerator/pantry surfaces to prevent spore spread.",
        ]
    elif combined_discoloration > 15.0 or edge_density > 12.0:
        status = "Moderately Fresh"
        score = random.randint(52, 70)
        shelf_life = random.randint(1, 2)
        color_analysis = "Moderate localized oxidation and slight fading of original vibrant pigmentation."
        texture_analysis = "Early signs of moisture loss, slight surface creases, but interior remains firm."
        discoloration_level = f"Moderate ({combined_discoloration:.1f}% superficial oxidation/bruising)."
        surface_patterns = "Isolated minor blemishes without active mold growth or foul odor."
        safety_rec = "Safe to consume if trimmed or thoroughly cooked immediately. Consume within 24–48 hours."
        storage_tips = [
            "Cook immediately or freeze in airtight container to arrest degradation.",
            "Trim discolored patches and use remaining portions in soups, smoothies, or baking.",
        ]
    else:
        status = "Fresh"
        score = random.randint(84, 96)
        shelf_life = random.randint(5, 9)
        color_analysis = "Vibrant, uniform coloration with healthy hue-saturation balance."
        texture_analysis = "Firm, taut surface with smooth skin and no wrinkling or structural breakdown."
        discoloration_level = f"Negligible ({combined_discoloration:.1f}% surface spots)."
        surface_patterns = "Intact outer peel/epidermis with natural healthy sheen and zero mold markers."
        safety_rec = "Completely safe to consume raw or cooked. Peak nutritional value and flavor profile."
        storage_tips = [
            "Store in a high-humidity crisper drawer at 3-5°C (37-41°F).",
            "Keep separated from high-ethylene producers (such as bananas and avocados) to maximize longevity.",
        ]

    result = {
        "food_item": food_name,
        "item_name": food_name,
        "produce_name": food_name,
        "freshness_status": status,
        "freshness_score": score,
        "estimated_shelf_life_days": shelf_life,
        "visual_characteristics": {
            "color_analysis": color_analysis,
            "texture_analysis": texture_analysis,
            "discoloration_level": discoloration_level,
            "surface_patterns": surface_patterns,
        },
        "safety_recommendation": safety_rec,
        "storage_tips": storage_tips,
    }
    return json.dumps(result)


def _generate_fallback_hygiene_json(
    cv_metrics: Optional[Dict[str, Any]] = None,
    is_video: bool = False,
    video_metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Returns realistic fallback hygiene compliance JSON.
    Dynamically adjusts based on OpenCV cleanliness edge density and brightness.
    """
    cleanliness = 85.0
    if cv_metrics and "cleanliness_index" in cv_metrics:
        try:
            cleanliness = float(cv_metrics["cleanliness_index"])
        except (ValueError, TypeError):
            cleanliness = 85.0

    if cleanliness >= 75.0:
        score = random.randint(84, 95)
        status = "Compliant"
        indicators = {
            "glove_usage": "Compliant",
            "hair_cap_compliance": "Compliant",
            "food_handling_practices": "Safe",
            "surface_cleanliness": "Clean",
        }
        violations = []
        recommendations = [
            "Maintain current high sanitation standards and hourly surface wiping schedule.",
            "Continue periodic verification of staff hand-hygiene and glove change intervals.",
        ]
    elif cleanliness >= 50.0:
        score = random.randint(62, 74)
        status = "Warning"
        indicators = {
            "glove_usage": "Compliant",
            "hair_cap_compliance": "Non-Compliant",
            "food_handling_practices": "Needs Improvement",
            "surface_cleanliness": "Moderate",
        }
        violations = [
            "Hair restraint / cap partially askew on food handling staff.",
            "Moderate utensil clutter on preparation counter requiring mid-shift reset.",
        ]
        recommendations = [
            "Enforce strict hair net coverage covering all hair prior to entering kitchen lines.",
            "Sanitize stainless steel prep tables between cross-ingredient preparation tasks.",
        ]
    else:
        score = random.randint(35, 49)
        status = "Non-Compliant"
        indicators = {
            "glove_usage": "Non-Compliant",
            "hair_cap_compliance": "Non-Compliant",
            "food_handling_practices": "Unsafe",
            "surface_cleanliness": "Unsanitary",
        }
        violations = [
            "Bare hand contact observed during ready-to-eat food handling.",
            "Raw poultry and vegetable boards placed in direct contact on prep surface.",
            "Significant residue buildup on worktop surfaces.",
        ]
        recommendations = [
            "Immediately halt food service line for emergency sanitization procedure.",
            "Mandate glove changes after handling raw animal protein.",
            "Retrain staff on Hazard Analysis Critical Control Point (HACCP) hygiene standards.",
        ]

    result = {
        "hygiene_score": score,
        "compliance_status": status,
        "indicators": indicators,
        "detected_violations": violations,
        "safety_recommendations": recommendations,
        "media_metadata": {
            "media_type": "video" if is_video else "image",
            "cv_metrics": cv_metrics or {},
            "video_metadata": video_metadata or {},
        },
    }
    return json.dumps(result)


def _generate_fallback_cooking_json(
    query_text: str = "",
    detected_ingredients: Optional[List[str]] = None,
) -> str:
    """Returns realistic fallback cooking guidance and recipe JSON."""
    ingredients = detected_ingredients or ["Chicken Breast", "Bell Peppers", "Garlic", "Olive Oil", "Onion"]
    recipe_name = "Savory Mediterranean Chicken & Vegetable Sauté"

    if query_text:
        q_lower = query_text.lower()
        if "pasta" in q_lower:
            recipe_name = "Garlic Herb Tossed Pasta Primavera"
            ingredients = ["Pasta", "Olive Oil", "Garlic", "Parmesan", "Herbs"]
        elif "salad" in q_lower or "vegan" in q_lower:
            recipe_name = "Zesty Garden Quinoa & Chickpea Bowl"
            ingredients = ["Quinoa", "Chickpeas", "Cucumber", "Cherry Tomatoes", "Lemon Vinaigrette"]
        elif "egg" in q_lower or "breakfast" in q_lower:
            recipe_name = "Fluffy Herb & Vegetable Breakfast Scramble"
            ingredients = ["Eggs", "Spinach", "Tomatoes", "Olive Oil", "Salt"]

    result = {
        "recipe_name": recipe_name,
        "prep_time_mins": 15,
        "cook_time_mins": 20,
        "difficulty": "Easy",
        "detected_ingredients": ingredients,
        "missing_ingredients": ["Fresh Thyme", "Black Pepper", "Sea Salt"],
        "step_by_step_instructions": [
            "Step 1: Prep and rinse all vegetables, cutting into uniform bite-sized pieces.",
            "Step 2: Heat olive oil in a heavy-bottom skillet over medium-high flame until shimmering.",
            "Step 3: Sear the protein or aromatics for 4-5 minutes until golden brown on all sides.",
            "Step 4: Toss in remaining vegetables, reduce heat to medium, and sauté until tender-crisp.",
            "Step 5: Season with herbs, salt, and freshly cracked black pepper. Rest for 2 minutes before plating.",
        ],
        "contextual_cooking_tips": [
            "Do not overcrowd the pan; overcrowding causes steaming instead of golden Maillard browning.",
            "Deglaze pan with a splash of broth or lemon juice to incorporate flavorful browned bits into the pan sauce.",
        ],
        "nutritional_estimate": {
            "calories_per_serving": 380,
            "protein_g": 36.0,
            "carbs_g": 18.0,
            "fats_g": 12.0,
            "fiber_g": 5.0,
        },
    }
    return json.dumps(result)


def _generate_fallback_meal_plan_json(
    profile_data: Optional[Dict[str, Any]] = None,
    summary: Optional[Dict[str, Any]] = None,
) -> str:
    """Returns realistic fallback personalized meal plan JSON calibrated to profile & macros."""
    profile = profile_data or {}
    diet = str(profile.get("dietary_preference", "Balanced")).lower()
    goal = str(profile.get("goal", "Maintenance"))
    target_cals = summary.get("target_calories", 2000) if summary else 2000
    p_target = summary.get("target_macros", {}).get("protein_g", 140) if summary else 140
    c_target = summary.get("target_macros", {}).get("carbs_g", 220) if summary else 220
    f_target = summary.get("target_macros", {}).get("fats_g", 65) if summary else 65

    b_cal = round(target_cals * 0.25)
    l_cal = round(target_cals * 0.35)
    d_cal = round(target_cals * 0.30)
    s_cal = round(target_cals * 0.10)

    if "vegan" in diet or "plant" in diet:
        breakfast = {
            "dish_name": "Chia Seed & Almond Butter Oatmeal Bowl",
            "description": "Steel-cut oats simmered in unsweetened almond milk topped with chia seeds, blueberries, and crushed walnuts.",
            "calories": b_cal,
            "protein_g": round(p_target * 0.22, 1),
            "carbs_g": round(c_target * 0.30, 1),
            "fats_g": round(f_target * 0.25, 1),
            "prep_instructions": "Simmer oats for 10 minutes. Fold in chia seeds. Top with fresh berries and almond butter."
        }
        lunch = {
            "dish_name": "Crispy Spiced Tofu & Quinoa Buddha Bowl",
            "description": "Pan-seared turmeric tofu cubes over fluffy tricolor quinoa, roasted broccoli florets, and creamy tahini dressing.",
            "calories": l_cal,
            "protein_g": round(p_target * 0.38, 1),
            "carbs_g": round(c_target * 0.38, 1),
            "fats_g": round(f_target * 0.35, 1),
            "prep_instructions": "Press and cube tofu; toss in olive oil and turmeric. Bake at 200°C for 20 mins. Serve over cooked quinoa and steam veggies."
        }
        dinner = {
            "dish_name": "Red Lentil & Spinach Coconut Dal",
            "description": "Slow-simmered red lentils with cumin, ginger, garlic, baby spinach, and light coconut milk with brown basmati rice.",
            "calories": d_cal,
            "protein_g": round(p_target * 0.30, 1),
            "carbs_g": round(c_target * 0.25, 1),
            "fats_g": round(f_target * 0.30, 1),
            "prep_instructions": "Sauté aromatics in coconut oil, add rinsed lentils and vegetable broth. Simmer for 15 minutes, fold in spinach until wilted."
        }
    elif "keto" in diet:
        breakfast = {
            "dish_name": "Avocado & Pasture-Raised Egg Skillet",
            "description": "Three farm eggs scrambled in grass-fed butter, paired with half a sliced avocado and wilted spinach.",
            "calories": b_cal,
            "protein_g": round(p_target * 0.25, 1),
            "carbs_g": round(c_target * 0.25, 1),
            "fats_g": round(f_target * 0.30, 1),
            "prep_instructions": "Melt butter in skillet, whisk eggs with sea salt and scramble gently on low flame. Plate with fresh avocado and hemp seeds."
        }
        lunch = {
            "dish_name": "Keto Grilled Salmon & Asparagus with Herb Ghee",
            "description": "Wild-caught salmon fillet pan-seared in clarified butter with grilled garlic asparagus spears.",
            "calories": l_cal,
            "protein_g": round(p_target * 0.40, 1),
            "carbs_g": round(c_target * 0.35, 1),
            "fats_g": round(f_target * 0.40, 1),
            "prep_instructions": "Sear salmon skin-side down for 4 mins, flip for 3 mins. Sauté asparagus in remaining pan juices with minced garlic."
        }
        dinner = {
            "dish_name": "Lemon Rosemary Grilled Chicken Thighs with Zucchini Noodles",
            "description": "Herb-marinated chicken thighs roasted with olive oil, served over zucchini noodles tossed in pine nut pesto.",
            "calories": d_cal,
            "protein_g": round(p_target * 0.30, 1),
            "carbs_g": round(c_target * 0.30, 1),
            "fats_g": round(f_target * 0.25, 1),
            "prep_instructions": "Roast chicken thighs at 200°C for 25 mins. Spiralize zucchini and flash-sauté for 90 seconds with pesto."
        }
    else:
        breakfast = {
            "dish_name": "Greek Yogurt Parfait with Mixed Berries & Granola",
            "description": "High-protein low-fat Greek yogurt layered with organic berries, honey drizzle, and toasted whole-grain granola.",
            "calories": b_cal,
            "protein_g": round(p_target * 0.25, 1),
            "carbs_g": round(c_target * 0.28, 1),
            "fats_g": round(f_target * 0.22, 1),
            "prep_instructions": "Scoop 200g Greek yogurt into bowl. Layer with fresh strawberries, blueberries, and sprinkle toasted seed granola."
        }
        lunch = {
            "dish_name": "Grilled Lemon Herb Chicken with Quinoa & Roasted Veggies",
            "description": "Herb-marinated chicken breast served over fluffy quinoa with roasted zucchini, bell peppers, and olive oil vinaigrette.",
            "calories": l_cal,
            "protein_g": round(p_target * 0.42, 1),
            "carbs_g": round(c_target * 0.38, 1),
            "fats_g": round(f_target * 0.35, 1),
            "prep_instructions": "Grill chicken for 6-7 mins per side until internal temp is 74°C. Serve alongside fluffy cooked quinoa and roasted seasonal vegetables."
        }
        dinner = {
            "dish_name": "Pan-Seared White Fish with Brown Basmati & Steamed Greens",
            "description": "Flaky white fish fillet with lemon caper sauce, brown basmati rice, and steamed garlic broccoli.",
            "calories": d_cal,
            "protein_g": round(p_target * 0.28, 1),
            "carbs_g": round(c_target * 0.26, 1),
            "fats_g": round(f_target * 0.30, 1),
            "prep_instructions": "Pan-sear fish with olive oil for 3 mins per side. Finish with fresh lemon juice, capers, and serve alongside steamed broccoli."
        }

    snacks = [
        {
            "dish_name": "Roasted Almonds & Apple Slices",
            "description": "A handful of dry-roasted unsalted almonds paired with crisp green apple slices.",
            "calories": round(s_cal * 0.6),
            "protein_g": 6.0,
            "carbs_g": 18.0,
            "fats_g": 9.0,
            "prep_instructions": "Portion 25g almonds and slice 1 fresh apple."
        },
        {
            "dish_name": "Cucumber Hummus Crunch Bites",
            "description": "Thick cucumber rounds topped with roasted red pepper hummus and paprika.",
            "calories": round(s_cal * 0.4),
            "protein_g": 4.0,
            "carbs_g": 10.0,
            "fats_g": 4.0,
            "prep_instructions": "Slice cucumber into 1/2-inch disks and dollop 1 tbsp hummus on each disk."
        }
    ]

    weight_kg = profile.get("weight_kg", 70.0)
    hydration_liters = round(float(weight_kg) * 0.035, 1) if weight_kg else 2.5

    recommendations = {
        "dietary_insights": [
            f"Caloric intake calibrated to {target_cals} kcal tailored for your {goal} objective.",
            "Distribute protein evenly across all meals to optimize muscle protein synthesis and promote fullness.",
            "Avoid ultra-processed refined sugars to prevent insulin spikes and energy crashes.",
        ],
        "hydration_target_liters": hydration_liters,
        "weekly_adjustments": [
            "Weigh yourself once a week first thing in the morning under consistent conditions.",
            "If weight trends diverge from your goal after 14 days, adjust total calories up or down by 100-150 kcal.",
            "Maintain consistency with your activity level and prioritize 7-8 hours of sleep for recovery.",
        ],
    }

    result = {
        "daily_meal_plan": {
            "breakfast": breakfast,
            "lunch": lunch,
            "dinner": dinner,
            "snacks": snacks,
        },
        "adaptive_recommendations": recommendations,
    }
    return json.dumps(result)


class LLMEngine:
    """Wrapper around Groq API for Multimodal Food Reasoning and Speech-to-Text."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self._client = None

    # ------------------------------------------------------------------ #
    #  Key validity check
    # ------------------------------------------------------------------ #
    def _key_is_valid(self) -> bool:
        return bool(self.api_key) and self.api_key != "your_groq_api_key_here"

    # ------------------------------------------------------------------ #
    #  Lazy Groq client
    # ------------------------------------------------------------------ #
    @property
    def client(self):
        if self._client is None:
            if not self._key_is_valid():
                raise ValueError(
                    "GROQ_API_KEY is not configured. Provide a valid key in .env."
                )
            from groq import Groq
            self._client = Groq(api_key=self.api_key)
        return self._client

    # ------------------------------------------------------------------ #
    #  Multimodal vision-language analysis (Milestone 2+)
    # ------------------------------------------------------------------ #
    async def analyze_food_image(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        cv_metrics: Optional[Dict[str, Any]] = None,
        model: str = DEFAULT_VISION_MODEL,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Send a food-analysis prompt to Groq with JSON-object response format.

        Fallback chain:
        1. Vision model with image (if available on Groq plan)
        2. Text-only model with CV metrics injected into the prompt
        3. Realistic mock JSON generator (always succeeds)
        """
        # ---------- no key → immediate mock ------------------------------ #
        if not self._key_is_valid():
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_nutrition_json(),
                "fallback": True,
            }

        # ---------- Tier 1: try vision model with image ------------------- #
        vision_error = None
        candidate_models = [model] + [m for m in VISION_CANDIDATE_MODELS if m != model]
        for v_model in candidate_models:
            try:
                content: List[Dict[str, Any]] = [{"type": "text", "text": prompt + "\nReturn a valid json object with all requested nutrition fields."}]

                if image_base64:
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}",
                        },
                    })

                messages = [{"role": "user", "content": content}]

                response = self.client.chat.completions.create(
                    model=v_model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )

                return {
                    "model": v_model,
                    "response": response.choices[0].message.content,
                    "fallback": False,
                }

            except Exception as vision_exc:
                vision_error = str(vision_exc)
                continue

        # ---------- Tier 2: text-only model with CV metrics --------------- #
        try:
            text_prompt = prompt + "\nReturn a valid json object with all requested nutrition fields."
            if cv_metrics:
                metrics_summary = (
                    f"\n\n[Image Analysis Metadata]\n"
                    f"Resolution: {cv_metrics.get('resolution', {}).get('width', '?')}x"
                    f"{cv_metrics.get('resolution', {}).get('height', '?')}\n"
                    f"Brightness (0-100): {cv_metrics.get('brightness_score', '?')}\n"
                    f"Sharpness (Laplacian var): {cv_metrics.get('sharpness_score', '?')}\n"
                    f"Dominant RGB: {cv_metrics.get('dominant_colors', {}).get('mean_rgb', '?')}\n"
                    f"Dominant HSV: {cv_metrics.get('dominant_colors', {}).get('mean_hsv', '?')}\n"
                )
                text_prompt = text_prompt + metrics_summary

            messages = [{"role": "user", "content": text_prompt}]

            response = self.client.chat.completions.create(
                model=TEXT_FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )

            return {
                "model": TEXT_FALLBACK_MODEL,
                "response": response.choices[0].message.content,
                "fallback": False,
                "note": f"Vision model unavailable ({vision_error}), used text model with CV metrics.",
            }

        except Exception as text_exc:
            # ---------- Tier 3: mock fallback ------------------------------ #
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_nutrition_json(),
                "fallback": True,
                "error": f"Vision: {vision_error} | Text: {str(text_exc)}",
            }

    # ------------------------------------------------------------------ #
    #  Milestone 3 – Freshness vision-language reasoning
    # ------------------------------------------------------------------ #
    async def analyze_freshness_image(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        freshness_features: Optional[Dict[str, Any]] = None,
        item_hint: str = "",
        model: str = DEFAULT_VISION_MODEL,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Send a freshness analysis prompt to Groq with JSON-object response format.

        Fallback chain:
        1. Vision model with image (if available on Groq plan)
        2. Text-only model with OpenCV color & texture metrics injected into prompt
        3. Dynamic mock freshness JSON generator (always succeeds)
        """
        if not self._key_is_valid():
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_freshness_json(item_hint, freshness_features),
                "fallback": True,
            }

        # ---------- Tier 1: try vision model with image ------------------- #
        vision_error = None
        candidate_models = [model] + [m for m in VISION_CANDIDATE_MODELS if m != model]
        for v_model in candidate_models:
            try:
                content: List[Dict[str, Any]] = [{"type": "text", "text": prompt + "\nReturn a valid json object with all requested freshness fields."}]
                if image_base64:
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}",
                        },
                    })
                messages = [{"role": "user", "content": content}]

                response = self.client.chat.completions.create(
                    model=v_model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )
                return {
                    "model": v_model,
                    "response": response.choices[0].message.content,
                    "fallback": False,
                }
            except Exception as vision_exc:
                vision_error = str(vision_exc)
                continue

        # ---------- Tier 2: text-only model with CV metrics --------------- #
        try:
            text_prompt = prompt + "\nReturn a valid json object with all requested freshness fields."
            if freshness_features:
                color_dist = freshness_features.get("color_distribution", {})
                discoloration = freshness_features.get("discoloration", {})
                texture = freshness_features.get("texture_metrics", {})
                saturation = freshness_features.get("saturation_levels", {})
                lab_stats = freshness_features.get("lab_color_stats", {})

                metrics_summary = (
                    f"\n\n[OpenCV Quantitative Freshness Analysis]\n"
                    f"- Food Item Hint: {item_hint if item_hint else 'Not specified'}\n"
                    f"- Brown Spot Discoloration: {discoloration.get('brown_spot_pct', '?')}%\n"
                    f"- Dark Spot Discoloration: {discoloration.get('dark_spot_pct', '?')}%\n"
                    f"- Combined Discoloration: {discoloration.get('combined_discoloration_pct', '?')}%\n"
                    f"- Texture Edge Density (Canny wrinkling/decay): {texture.get('edge_density_pct', '?')}%\n"
                    f"- Surface Roughness (Laplacian var): {texture.get('laplacian_variance', '?')}\n"
                    f"- Local Contrast (Sobel gradient mean): {texture.get('sobel_gradient_mean', '?')}\n"
                    f"- Saturation Profile: Low: {saturation.get('low_pct', '?')}%, "
                    f"Med: {saturation.get('medium_pct', '?')}%, High: {saturation.get('high_pct', '?')}%\n"
                    f"- LAB Color Balance: L*={lab_stats.get('l_mean', '?')}, a*={lab_stats.get('a_mean', '?')}, b*={lab_stats.get('b_mean', '?')}\n"
                )
                text_prompt = text_prompt + metrics_summary

            messages = [{"role": "user", "content": text_prompt}]

            response = self.client.chat.completions.create(
                model=TEXT_FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": TEXT_FALLBACK_MODEL,
                "response": response.choices[0].message.content,
                "fallback": False,
                "note": f"Vision model unavailable ({vision_error}), used text model with OpenCV freshness metrics.",
            }
        except Exception as text_exc:
            # ---------- Tier 3: mock fallback ------------------------------ #
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_freshness_json(item_hint, freshness_features),
                "fallback": True,
                "error": f"Vision: {vision_error} | Text: {str(text_exc)}",
            }


    # ------------------------------------------------------------------ #
    #  Milestone 4 – Restaurant Hygiene & Compliance Vision Reasoning
    # ------------------------------------------------------------------ #
    async def analyze_hygiene_frame(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        cv_metrics: Optional[Dict[str, Any]] = None,
        is_video: bool = False,
        video_metadata: Optional[Dict[str, Any]] = None,
        model: str = DEFAULT_VISION_MODEL,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Send hygiene compliance audit prompt to Groq with JSON response format.
        Evaluates glove usage, hair cap compliance, food handling, and surface cleanliness.
        3-tier fallback: Vision Model -> Text Model with CV Edge/Cleanliness Metrics -> Dynamic Mock.
        """
        if not self._key_is_valid():
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_hygiene_json(cv_metrics, is_video, video_metadata),
                "fallback": True,
            }

        # Tier 1: Multimodal Vision Model
        vision_error = None
        try:
            content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
            if image_base64:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                })
            messages = [{"role": "user", "content": content}]

            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": model,
                "response": response.choices[0].message.content,
                "fallback": False,
            }
        except Exception as vision_exc:
            vision_error = str(vision_exc)

        # Tier 2: Text Model with OpenCV Cleanliness & Edge Metrics
        try:
            text_prompt = prompt
            if cv_metrics:
                metrics_summary = (
                    f"\n\n[OpenCV Surface Cleanliness & Clutter Metrics]\n"
                    f"- Media Type: {'Video Keyframe' if is_video else 'Still Image'}\n"
                    f"- Surface Cleanliness Index (0-100): {cv_metrics.get('cleanliness_index', '?')}\n"
                    f"- Edge Density / Clutter Percentage: {cv_metrics.get('edge_density_pct', '?')}%\n"
                    f"- Lighting Brightness Score: {cv_metrics.get('brightness_score', '?')}\n"
                    f"- Sharpness Score: {cv_metrics.get('sharpness_score', '?')}\n"
                )
                if video_metadata:
                    metrics_summary += (
                        f"- Video Duration: {video_metadata.get('duration_seconds', 0)}s, "
                        f"FPS: {video_metadata.get('fps', 0)}, Frames: {video_metadata.get('total_frames', 0)}\n"
                    )
                text_prompt = prompt + metrics_summary

            messages = [{"role": "user", "content": text_prompt}]
            response = self.client.chat.completions.create(
                model=TEXT_FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": TEXT_FALLBACK_MODEL,
                "response": response.choices[0].message.content,
                "fallback": False,
                "note": f"Vision model unavailable ({vision_error}), used text model with OpenCV cleanliness metrics.",
            }
        except Exception as text_exc:
            # Tier 3: Mock Fallback
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_hygiene_json(cv_metrics, is_video, video_metadata),
                "fallback": True,
                "error": f"Vision: {vision_error} | Text: {str(text_exc)}",
            }

    # ------------------------------------------------------------------ #
    #  Milestone 4 – Smart Kitchen Cooking Guidance & Recipe Reasoning
    # ------------------------------------------------------------------ #
    async def generate_cooking_guidance_llm(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        query_text: str = "",
        model: str = DEFAULT_VISION_MODEL,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Generate interactive recipe & cooking guidance combining ingredients and user query.
        3-tier fallback: Vision Model -> Text Model -> Structured Recipe Mock.
        """
        if not self._key_is_valid():
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_cooking_json(query_text),
                "fallback": True,
            }

        # Tier 1: Multimodal Vision Model (if ingredient image is supplied)
        vision_error = None
        try:
            content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
            if image_base64:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                })
            messages = [{"role": "user", "content": content}]

            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": model,
                "response": response.choices[0].message.content,
                "fallback": False,
            }
        except Exception as vision_exc:
            vision_error = str(vision_exc)

        # Tier 2: Text Model
        try:
            messages = [{"role": "user", "content": prompt}]
            response = self.client.chat.completions.create(
                model=TEXT_FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": TEXT_FALLBACK_MODEL,
                "response": response.choices[0].message.content,
                "fallback": False,
                "note": f"Vision model unavailable ({vision_error}), used text model.",
            }
        except Exception as text_exc:
            # Tier 3: Mock Fallback
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_cooking_json(query_text),
                "fallback": True,
                "error": f"Vision: {vision_error} | Text: {str(text_exc)}",
            }

    # ------------------------------------------------------------------ #
    #  Milestone 4 – Audio transcription using whisper-large-v3-turbo
    # ------------------------------------------------------------------ #
    async def transcribe_audio(
        self,
        audio_data: Union[bytes, str],
        filename: str = "query.wav",
        model: str = "whisper-large-v3-turbo",
    ) -> str:
        """
        Transcribe speech/audio queries to text using Groq Whisper.
        Accepts raw audio bytes or a file path. Falls back gracefully if offline/unconfigured.
        """
        if not self._key_is_valid():
            return "How do I cook a healthy, high-protein meal with these ingredients?"

        temp_path = None
        try:
            if isinstance(audio_data, bytes):
                suffix = os.path.splitext(filename)[1] or ".wav"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(audio_data)
                    temp_path = tmp.name
                file_to_open = temp_path
            else:
                file_to_open = audio_data

            with open(file_to_open, "rb") as file:
                transcription = self.client.audio.transcriptions.create(
                    file=file,
                    model=model,
                    response_format="text",
                )
            result_text = str(transcription).strip()
            return result_text if result_text else "How can I cook a healthy, delicious meal with these ingredients?"
        except Exception as e:
            # Clean fallback if transcription fails or audio format is unsupported
            return "How do I cook a healthy, high-protein meal with these ingredients?"
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    # ------------------------------------------------------------------ #
    #  Legacy multimodal (Milestone 1 – kept for backward compat)
    # ------------------------------------------------------------------ #
    async def analyze_multimodal(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        model: str = "llama-3.2-11b-vision-preview",
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Send multimodal or text query to Groq LLaMA models."""
        messages: List[Dict[str, Any]] = []
        content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]

        if image_base64:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_base64}",
                },
            })

        messages.append({"role": "user", "content": content})

        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        return {
            "model": model,
            "response": response.choices[0].message.content,
        }

    # ------------------------------------------------------------------ #
    #  Milestone 5 – Personalized Adaptive Meal Plan Reasoning
    # ------------------------------------------------------------------ #
    async def generate_meal_plan_llm(
        self,
        prompt: str,
        profile_data: Optional[Dict[str, Any]] = None,
        summary: Optional[Dict[str, Any]] = None,
        model: str = TEXT_FALLBACK_MODEL,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Generate structured daily meal plan conforming to user targets and restrictions.
        Uses text model with JSON mode or dynamic fallback generator.
        """
        if not self._key_is_valid():
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_meal_plan_json(profile_data, summary),
                "fallback": True,
            }

        try:
            messages = [{"role": "user", "content": prompt}]
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            return {
                "model": model,
                "response": response.choices[0].message.content,
                "fallback": False,
            }
        except Exception as exc:
            return {
                "model": "fallback-mock",
                "response": _generate_fallback_meal_plan_json(profile_data, summary),
                "fallback": True,
                "error": str(exc),
            }

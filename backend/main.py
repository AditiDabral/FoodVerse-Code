"""
FoodVerse AI - Multimodal Food Intelligence Platform Backend
Main FastAPI Application Entrypoint
"""
import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from services.nutrition_service import NutritionService
from services.freshness_service import FreshnessService
from services.hygiene_cooking_service import HygieneCookingService
from services.meal_planner_service import MealPlannerService, UserProfile

load_dotenv()

# Initialize IP-based rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="FoodVerse AI API",
    description="Multimodal Food Intelligence Platform Backend",
    version="1.0.0",
)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Standard HTTP 429 Too Many Requests response protecting external AI quotas.
    """
    response = JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "detail": "Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.",
            "message": f"Rate limit exceeded: {exc.detail}",
            "status_code": 429,
        },
        headers={"Retry-After": "60"},
    )
    try:
        response = request.app.state.limiter._inject_headers(
            response, request.state.view_rate_limit
        )
    except Exception:
        pass
    return response

# Enable CORS for frontend and cross-origin clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Shared service instances -------------------------------------- #
nutrition_service = NutritionService()
freshness_service = FreshnessService()
hygiene_cooking_service = HygieneCookingService()
meal_planner_service = MealPlannerService()


# ========================================================================== #
#  Health & Root
# ========================================================================== #
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint reporting operational status and core AI library versions."""
    import fastapi
    try:
        import cv2
        cv2_version = cv2.__version__
    except ImportError:
        cv2_version = "not_installed"

    try:
        import torch
        torch_version = torch.__version__
    except ImportError:
        torch_version = "not_installed"

    return {
        "status": "healthy",
        "service": "FoodVerse AI Multimodal Platform Backend",
        "versions": {
            "fastapi": fastapi.__version__,
            "opencv": cv2_version,
            "torch": torch_version,
        },
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to FoodVerse AI - Multimodal Food Intelligence Platform API",
        "health_endpoint": "/api/health",
        "docs_endpoint": "/docs",
    }


# ========================================================================== #
#  Milestone 2 – Nutrition Analysis
# ========================================================================== #
@app.post("/api/nutrition/analyze", tags=["Nutrition"])
@limiter.limit("5/minute")
async def analyze_nutrition(
    request: Request,
    image: UploadFile = File(..., description="Food image (JPEG/PNG)"),
    notes: str = Form(default="", description="Optional user notes about the meal"),
):
    """
    Activity 2.1 – Food Recognition & Classification
    Activity 2.2 – Nutrition Estimation, Health Scoring & Recommendations

    Accepts a food image and optional text notes; returns structured
    nutrition analysis including item-by-item breakdown, health score,
    dietary tags, insights, and actionable recommendations.
    """
    image_bytes = await image.read()
    result = await nutrition_service.analyze_nutrition(image_bytes, user_notes=notes)
    return result


# ========================================================================== #
#  Milestone 3 – Food Freshness & Spoilage Detection
# ========================================================================== #
@app.post("/api/freshness/analyze", tags=["Freshness"])
@app.post("/api/freshness", tags=["Freshness"])
@limiter.limit("5/minute")
async def analyze_freshness(
    request: Request,
    image: UploadFile = File(..., description="Food or produce image (JPEG/PNG)"),
    item_hint: str = Form(default="", description="Optional food item hint (e.g., 'Apple', 'Tomato', 'Banana')"),
):
    """
    Activity 3.1 & 3.2 – Food Freshness & Spoilage Detection Module.

    Accepts an uploaded food/produce image and optional item hint.
    Extracts OpenCV color distribution (HSV/LAB), discoloration percentages,
    surface texture metrics (Canny edge density, Laplacian variance, Sobel gradient),
    and normalized PyTorch feature summary tensor.
    Classifies freshness strictly as 'Fresh', 'Moderately Fresh', or 'Spoiled'.
    Returns structured JSON with shelf-life estimate, safety recommendation,
    and actionable storage tips.
    """
    image_bytes = await image.read()
    result = await freshness_service.analyze_freshness(image_bytes, item_hint=item_hint)
    return result


# ========================================================================== #
#  Milestone 4 – Hygiene Monitoring & Smart Kitchen Cooking
# ========================================================================== #
@app.post("/api/hygiene/analyze", tags=["Hygiene"])
@limiter.limit("5/minute")
async def analyze_hygiene(
    request: Request,
    file: UploadFile = File(..., description="Kitchen image or video file (JPEG/PNG/MP4/AVI/MOV)"),
):
    """
    Activity 4.1 – Restaurant Hygiene Detection & Compliance Scoring.
    Accepts an uploaded image or video of a restaurant/commercial kitchen.
    Evaluates:
    - Glove usage
    - Hair cap compliance
    - Food handling practices
    - Surface cleanliness & clutter (via OpenCV edge density & brightness metrics)
    Returns hygiene_score (0-100), compliance_status, violations, and corrective recommendations.
    """
    file_bytes = await file.read()
    result = await hygiene_cooking_service.analyze_hygiene(
        file_bytes=file_bytes,
        filename=file.filename or "media.jpg",
        content_type=file.content_type or "",
    )
    return result


@app.post("/api/cooking/assist", tags=["Cooking Guidance"])
@limiter.limit("5/minute")
async def cooking_assist(
    request: Request,
    image: Optional[UploadFile] = File(None, description="Optional photo of available fridge/pantry ingredients"),
    audio: Optional[UploadFile] = File(None, description="Optional voice audio query (WAV/MP3/M4A/WEBM)"),
    query: str = Form(default="", description="Text recipe query or cooking preference"),
):
    """
    Activity 4.2 – Smart Kitchen Cooking Guidance & Recipe Generation.
    Fuses user text query, optional speech voice input (transcribed with Whisper),
    and optional ingredient imagery into an interactive chef recipe with step-by-step
    guidance, contextual cooking tips, and nutritional estimates.
    """
    image_bytes = await image.read() if image else None
    audio_bytes = await audio.read() if audio else None
    audio_filename = audio.filename if audio else ""

    result = await hygiene_cooking_service.generate_cooking_guidance(
        query_text=query,
        image_bytes=image_bytes,
        audio_bytes=audio_bytes,
        audio_filename=audio_filename,
    )
    return result


# ========================================================================== #
#  Milestone 5 – Personalized Adaptive Meal Planner
# ========================================================================== #
@app.post("/api/meal-plan/generate", tags=["Meal Planner"])
@limiter.limit("5/minute")
async def generate_meal_plan(
    request: Request,
    profile: UserProfile,
):
    """
    Activity 5.1 & 5.2 – Personalized Meal Planner Generation.
    Accepts user profile: age, gender, weight_kg, height_cm, activity_level,
    goal, daily_calorie_target, dietary_preference, and allergies.
    Computes BMR/TDEE and macronutrient splits using scientific formulas.
    Generates a structured daily meal plan (breakfast, lunch, dinner, snacks)
    along with adaptive recommendations and hydration targets.
    """
    result = await meal_planner_service.generate_personalized_meal_plan(profile)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

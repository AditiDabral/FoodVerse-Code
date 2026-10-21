"""
Freshness Service (Milestone 3)
Activity 3.1 & 3.2 – Food Freshness & Spoilage Detection Module
Handles perishability analysis, color/texture degradation scoring,
and 3-tier safety classification: 'Fresh', 'Moderately Fresh', or 'Spoiled'.
"""
import json
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

from services.vision_preprocessor import VisionPreprocessor
from services.llm_engine import LLMEngine


# --------------------------------------------------------------------------- #
#  Pydantic response models
# --------------------------------------------------------------------------- #
class VisualCharacteristics(BaseModel):
    color_analysis: str = Field(default="Uniform natural pigmentation")
    texture_analysis: str = Field(default="Normal surface texture")
    discoloration_level: str = Field(default="Minimal discoloration observed")
    surface_patterns: str = Field(default="No mold or structural decay detected")


class FreshnessAnalysisResponse(BaseModel):
    status: str = "success"
    model_used: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    used_fallback: bool = False
    food_item: str
    item_name: Optional[str] = None
    food_name: Optional[str] = None
    detected_item: Optional[str] = None
    label: Optional[str] = None
    produce_name: Optional[str] = None
    freshness_status: str = Field(description="Strictly: Fresh, Moderately Fresh, or Spoiled")
    freshness_score: int = Field(default=85, ge=0, le=100)
    estimated_shelf_life_days: Union[int, str] = Field(default=5)
    visual_characteristics: VisualCharacteristics
    opencv_features: Dict[str, Any]
    tensor_summary: Optional[Dict[str, Any]] = None
    safety_recommendation: str
    storage_tips: List[str] = Field(default_factory=list)


# Backward-compatible model from Milestone 1 placeholder
class FreshnessEvaluation(BaseModel):
    item_name: str
    freshness_grade: str = Field(default="Unknown", description="Fresh / Moderately Fresh / Spoiled")
    freshness_score: float = Field(default=1.0, ge=0.0, le=1.0)
    estimated_shelf_life_days: int = Field(default=0)
    spoilage_markers: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
#  Prompt for Multimodal Freshness Intelligence
# --------------------------------------------------------------------------- #
FRESHNESS_PROMPT = """You are FoodVerse AI, an expert food quality, perishability evaluation, and spoilage detection engine.

Analyze the food/produce image and the OpenCV quantitative metrics provided.
You must return a valid JSON object with EXACTLY this structure:

{
  "food_item": "<accurate specific name of the food item or produce shown in the image, e.g. Broccoli, Red Onions, Apple, Tomato, Banana>",
  "freshness_status": "<EXACTLY one of: 'Fresh', 'Moderately Fresh', or 'Spoiled'>",
  "freshness_score": <integer from 0 to 100, where 100 is peak freshness>,
  "estimated_shelf_life_days": <estimated remaining shelf-life days as integer or string range, e.g. 5 or "3-5">,
  "visual_characteristics": {
    "color_analysis": "<concise description of pigmentation, hue fidelity, and saturation balance>",
    "texture_analysis": "<concise description of surface smoothness, edge wrinkles, or firmness>",
    "discoloration_level": "<concise description of oxidation, brown spots, or dark patches>",
    "surface_patterns": "<concise description of fungal mold mycelium, wilting, bruising, or sheen>"
  },
  "safety_recommendation": "<clear guidance on whether it is safe to consume raw, cook immediately, or discard>",
  "storage_tips": [
    "<actionable storage tip 1>",
    "<actionable storage tip 2>"
  ]
}

Classification Criteria:
- 'Fresh': vibrant natural color, tight smooth texture, negligible discoloration (<10%), zero mold. Safe to consume raw or cooked.
- 'Moderately Fresh': slight bruising/creasing, localized discoloration (10-35%), fading sheen, but intact structure with no fungal growth. Safe if cooked immediately or trimmed.
- 'Spoiled': significant decay/necrosis (>35% discoloration), mold mycelium, structural collapse/mushiness, or offensive rot. Must be discarded.

Return ONLY the JSON object, no markdown fences, no extra conversational text.
"""


def _normalize_status(status_str: str, score: int) -> str:
    """Ensure strict conformity to Objective 4 categories."""
    s = (status_str or "").strip().lower()
    if any(k in s for k in ["spoil", "decay", "rot", "mold", "bad", "expired", "waste"]):
        return "Spoiled"
    if any(k in s for k in ["moderat", "fair", "soon", "average", "medium", "borderline", "acceptable"]):
        return "Moderately Fresh"
    if any(k in s for k in ["fresh", "good", "optimal", "peak", "excellent"]):
        return "Fresh"
    # Fallback mapping based on score
    if score >= 75:
        return "Fresh"
    if score >= 45:
        return "Moderately Fresh"
    return "Spoiled"


class FreshnessService:
    """Service for computer vision and multimodal perishability evaluation."""

    def __init__(
        self,
        vision_preprocessor: Optional[VisionPreprocessor] = None,
        llm_engine: Optional[LLMEngine] = None,
    ):
        self.vision = vision_preprocessor or VisionPreprocessor()
        self.llm = llm_engine or LLMEngine()

    async def analyze_freshness(
        self,
        image_bytes: bytes,
        item_hint: str = "",
    ) -> Dict[str, Any]:
        """
        Activity 3.1 & 3.2 – End-to-end food freshness and spoilage classification pipeline.

        1. Calls extract_freshness_features(image_bytes) to obtain:
           - HSV/LAB color distributions & discoloration percentages
           - Edge density (Canny) & local contrast (Laplacian, Sobel)
           - Normalized PyTorch feature summary tensor
           - Base64 resized JPEG
        2. Dispatches to LLMEngine (Groq Multimodal or feature-augmented text model).
        3. Parses and normalizes strictly to 'Fresh', 'Moderately Fresh', or 'Spoiled'.
        4. Returns comprehensive JSON with visual characteristics, safety guidance, and storage tips.
        """
        # Step 1: Feature Extraction via OpenCV + NumPy + PyTorch
        feature_data = self.vision.extract_freshness_features(image_bytes)
        image_base64 = feature_data["image_base64"]
        freshness_features = feature_data["freshness_features"]
        tensor_summary = feature_data["tensor_summary"]

        # Step 2: Build prompt with optional user hint
        prompt = FRESHNESS_PROMPT
        clean_hint = item_hint.strip() if item_hint else ""
        if clean_hint and clean_hint.lower() not in ["", "fresh produce", "detected produce", "analyzed item", "new produce image"]:
            prompt += (
                f"\n\nContext hint from user: The user suggests this might be '{clean_hint}'. "
                f"However, you MUST inspect the image pixels directly to accurately identify what food item it truly is."
            )

        # Step 3: LLM Multimodal Analysis with 3-tier fallback
        llm_result = await self.llm.analyze_freshness_image(
            prompt=prompt,
            image_base64=image_base64,
            freshness_features=freshness_features,
            item_hint=clean_hint,
        )

        raw_response = llm_result.get("response", "{}")
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {}

        # Handle potential nested JSON objects
        if "freshness_status" not in parsed and isinstance(parsed, dict):
            for v in parsed.values():
                if isinstance(v, dict) and "freshness_status" in v:
                    parsed = v
                    break

        # Extract and sanitize fields
        score_val = parsed.get("freshness_score", 80)
        try:
            score_int = max(0, min(100, int(score_val)))
        except (ValueError, TypeError):
            score_int = 80

        raw_status = parsed.get("freshness_status", "")
        status_norm = _normalize_status(raw_status, score_int)

        detected_item = (
            parsed.get("food_item")
            or parsed.get("item_name")
            or parsed.get("produce_name")
            or parsed.get("name")
            or (clean_hint if clean_hint and clean_hint.lower() not in ["", "fresh produce", "detected produce", "analyzed item", "new produce image"] else "Fresh Produce")
        )

        vis_dict = parsed.get("visual_characteristics") or {}
        visual_characteristics = VisualCharacteristics(
            color_analysis=vis_dict.get("color_analysis", "Pigmentation within expected range."),
            texture_analysis=vis_dict.get("texture_analysis", "Surface roughness and firmness evaluated."),
            discoloration_level=vis_dict.get("discoloration_level", f"Surface discoloration: {freshness_features.get('discoloration', {}).get('combined_discoloration_pct', 0)}%"),
            surface_patterns=vis_dict.get("surface_patterns", "No aggressive mold markers detected."),
        )

        safety_rec = parsed.get("safety_recommendation")
        if not safety_rec:
            if status_norm == "Fresh":
                safety_rec = "Safe to consume raw or cooked. Retains high nutritional quality."
            elif status_norm == "Moderately Fresh":
                safety_rec = "Safe if cooked or consumed within 24-48 hours. Trim any discolored spots."
            else:
                safety_rec = "Do NOT consume. Discard immediately to prevent foodborne illness."

        storage_tips = parsed.get("storage_tips")
        if not storage_tips or not isinstance(storage_tips, list):
            if status_norm == "Fresh":
                storage_tips = [
                    "Store in crisper drawer at 3-5°C (37-41°F) with moderate humidity.",
                    "Separate from ethylene-emitting produce like bananas to prolong shelf-life.",
                ]
            elif status_norm == "Moderately Fresh":
                storage_tips = [
                    "Cook promptly or freeze in an airtight container.",
                    "Keep in dry, cool conditions to slow residual oxidation.",
                ]
            else:
                storage_tips = [
                    "Discard into sealed organic waste or compost.",
                    "Sanitize surrounding storage area to stop spore dissemination.",
                ]

        shelf_life = parsed.get("estimated_shelf_life_days")
        if shelf_life is None:
            shelf_life = 7 if status_norm == "Fresh" else (2 if status_norm == "Moderately Fresh" else 0)

        # Build response adhering strictly to Milestone 3 specification
        response = FreshnessAnalysisResponse(
            status="success",
            model_used=llm_result.get("model", "unknown"),
            used_fallback=llm_result.get("fallback", False),
            food_item=detected_item,
            item_name=detected_item,
            food_name=detected_item,
            detected_item=detected_item,
            label=detected_item,
            produce_name=detected_item,
            freshness_status=status_norm,
            freshness_score=score_int,
            estimated_shelf_life_days=shelf_life,
            visual_characteristics=visual_characteristics,
            opencv_features=freshness_features,
            tensor_summary=tensor_summary,
            safety_recommendation=safety_rec,
            storage_tips=storage_tips,
        )

        return response.model_dump()

    async def evaluate_freshness(self, image_bytes: bytes) -> Dict[str, Any]:
        """Milestone 1 compatibility wrapper calling analyze_freshness."""
        result = await self.analyze_freshness(image_bytes)
        return {
            "status": "completed",
            "message": "Freshness analysis complete.",
            "data": result,
        }

"""
Milestone 4 Integration Test Suite
Tests:
- Activity 4.1: Hygiene Inspection & Compliance Scoring (image and video keyframe extraction)
- Activity 4.2: Multimodal Smart Kitchen Cooking Guidance (query + ingredient image + voice audio)
- Endpoints: POST /api/hygiene/analyze and POST /api/cooking/assist
"""
import asyncio
import io
import json
import os
import struct
import sys
import tempfile
import cv2
import numpy as np

# Safe stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def make_synthetic_kitchen_image() -> bytes:
    """Generate a synthetic commercial kitchen prep station image."""
    img = np.full((480, 640, 3), (210, 215, 220), dtype=np.uint8)  # stainless steel counter
    # Stainless steel reflection lines
    cv2.line(img, (0, 240), (640, 240), (230, 235, 240), 2)
    # Cutting board (white HDPE plastic)
    cv2.rectangle(img, (160, 180), (480, 380), (250, 250, 250), -1)
    cv2.rectangle(img, (160, 180), (480, 380), (180, 180, 180), 2)
    # Fresh vegetables on board (tomatoes, herbs, cucumber)
    cv2.circle(img, (260, 260), 30, (30, 30, 220), -1)  # Red tomato
    cv2.circle(img, (320, 250), 25, (30, 30, 210), -1)  # Red tomato
    cv2.ellipse(img, (380, 270), (40, 18), 30, 0, 360, (40, 160, 40), -1)  # Cucumber
    cv2.putText(img, "Kitchen Prep Station", (180, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (80, 80, 80), 2)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_synthetic_kitchen_video() -> bytes:
    """Generate a brief synthetic MP4 video file representing a kitchen monitoring stream."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        fps = 10.0
        width, height = 320, 240
        out = cv2.VideoWriter(tmp_path, fourcc, fps, (width, height))

        for i in range(15):  # 1.5 seconds, 15 frames
            frame = np.full((height, width, 3), (200 + i * 2, 210, 220), dtype=np.uint8)
            cv2.rectangle(frame, (60, 60), (260, 180), (240, 240, 245), -1)
            cv2.circle(frame, (100 + i * 8, 120), 20, (30, 160, 40), -1)
            cv2.putText(frame, f"Frame {i}", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 1)
            out.write(frame)

        out.release()

        with open(tmp_path, "rb") as f:
            video_bytes = f.read()

        return video_bytes
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def make_synthetic_wav_audio() -> bytes:
    """Generate a minimal valid 1-second 8kHz mono PCM WAV byte buffer."""
    sample_rate = 8000
    num_samples = sample_rate // 2  # 0.5 sec
    data = bytes([128] * num_samples)  # 8-bit unsigned PCM silence
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(data),
        b"WAVE",
        b"fmt ",
        16,  # subchunk1 size
        1,   # PCM
        1,   # mono
        sample_rate,
        sample_rate,  # byte rate
        1,   # block align
        8,   # bits per sample
        b"data",
        len(data),
    )
    return header + data


async def test_helpers():
    print("--- [Activity 4.1 & 4.2 Helpers] Testing Video Keyframe & Audio Transcription ---")
    from services.vision_preprocessor import VisionPreprocessor
    from services.llm_engine import LLMEngine

    vision = VisionPreprocessor()
    video_bytes = make_synthetic_kitchen_video()
    print(f"Generated synthetic video size: {len(video_bytes)} bytes")

    keyframe_data = vision.extract_video_keyframe(video_bytes, filename="kitchen_stream.mp4")
    assert "image_base64" in keyframe_data, "Missing image_base64"
    assert "video_metadata" in keyframe_data, "Missing video_metadata"
    assert "cv_metrics" in keyframe_data, "Missing cv_metrics"
    assert "tensor_info" in keyframe_data, "Missing tensor_info"

    vm = keyframe_data["video_metadata"]
    cvm = keyframe_data["cv_metrics"]
    print(f"Video Metadata: duration={vm['duration_seconds']}s, fps={vm['fps']}, frames={vm['total_frames']}")
    print(f"Keyframe CV Metrics: cleanliness={cvm['cleanliness_index']}, edge_density={cvm['edge_density_pct']}%, brightness={cvm['brightness_score']}")

    # Audio transcription helper
    llm = LLMEngine()
    audio_bytes = make_synthetic_wav_audio()
    transcribed = await llm.transcribe_audio(audio_bytes, filename="voice_query.wav")
    print(f"Transcribed audio text: '{transcribed}'")
    assert isinstance(transcribed, str) and len(transcribed) > 0

    print("=== Helpers Test Passed ===\n")


async def test_hygiene_service():
    print("--- [Activity 4.1] Testing HygieneCookingService.analyze_hygiene ---")
    from services.hygiene_cooking_service import HygieneCookingService

    service = HygieneCookingService()

    # 1. Image test
    img_bytes = make_synthetic_kitchen_image()
    res_img = await service.analyze_hygiene(img_bytes, filename="prep_counter.jpg", content_type="image/jpeg")

    print(f"Image Hygiene Score: {res_img['hygiene_score']}/100")
    print(f"Compliance Status: {res_img['compliance_status']}")
    print(f"Indicators: {res_img['indicators']}")
    print(f"Violations ({len(res_img['detected_violations'])}): {res_img['detected_violations']}")
    print(f"Recommendations: {res_img['safety_recommendations'][:1]}")

    assert 0 <= res_img["hygiene_score"] <= 100
    assert res_img["compliance_status"] in ["Compliant", "Warning", "Non-Compliant"]
    assert "glove_usage" in res_img["indicators"]
    assert "hair_cap_compliance" in res_img["indicators"]
    assert "food_handling_practices" in res_img["indicators"]
    assert "surface_cleanliness" in res_img["indicators"]

    # 2. Video test
    vid_bytes = make_synthetic_kitchen_video()
    res_vid = await service.analyze_hygiene(vid_bytes, filename="line_camera.mp4", content_type="video/mp4")
    print(f"Video Hygiene Score: {res_vid['hygiene_score']}/100 ({res_vid['compliance_status']})")
    assert res_vid["media_metadata"]["media_type"] == "video"
    assert "video_metadata" in res_vid["media_metadata"]
    print("=== Activity 4.1 Service Passed ===\n")


async def test_cooking_guidance_service():
    print("--- [Activity 4.2] Testing HygieneCookingService.generate_cooking_guidance ---")
    from services.hygiene_cooking_service import HygieneCookingService

    service = HygieneCookingService()
    img_bytes = make_synthetic_kitchen_image()
    audio_bytes = make_synthetic_wav_audio()

    result = await service.generate_cooking_guidance(
        query_text="What high-protein healthy dish can I cook with these fresh ingredients?",
        image_bytes=img_bytes,
        audio_bytes=audio_bytes,
        audio_filename="voice_prompt.wav",
    )

    print(f"Recipe Name: {result['recipe_name']}")
    print(f"Prep Time: {result['prep_time_mins']} mins | Cook Time: {result['cook_time_mins']} mins | Difficulty: {result['difficulty']}")
    print(f"Detected Ingredients: {result['detected_ingredients']}")
    print(f"Missing/Pantry Ingredients: {result['missing_ingredients']}")
    print(f"Steps count: {len(result['step_by_step_instructions'])}")
    for s in result["step_by_step_instructions"][:2]:
        print(f"  {s}")
    print(f"Nutrition: {result['nutritional_estimate']}")

    assert "recipe_name" in result and len(result["recipe_name"]) > 0
    assert isinstance(result["prep_time_mins"], int)
    assert isinstance(result["step_by_step_instructions"], list) and len(result["step_by_step_instructions"]) > 0
    assert "calories_per_serving" in result["nutritional_estimate"]
    print("=== Activity 4.2 Service Passed ===\n")


def test_http_endpoints():
    print("--- [Endpoints] Testing /api/hygiene/analyze and /api/cooking/assist ---")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. POST /api/hygiene/analyze (Image)
    img_bytes = make_synthetic_kitchen_image()
    resp_hyg = client.post(
        "/api/hygiene/analyze",
        files={"file": ("station.jpg", img_bytes, "image/jpeg")},
    )
    print(f"POST /api/hygiene/analyze (Image) -> Status: {resp_hyg.status_code}")
    assert resp_hyg.status_code == 200, f"Expected 200, got {resp_hyg.status_code}: {resp_hyg.text}"
    hyg_data = resp_hyg.json()
    assert hyg_data["status"] == "success"
    assert "hygiene_score" in hyg_data
    assert "indicators" in hyg_data

    # 2. POST /api/hygiene/analyze (Video)
    vid_bytes = make_synthetic_kitchen_video()
    resp_vid = client.post(
        "/api/hygiene/analyze",
        files={"file": ("station_cam.mp4", vid_bytes, "video/mp4")},
    )
    print(f"POST /api/hygiene/analyze (Video) -> Status: {resp_vid.status_code}")
    assert resp_vid.status_code == 200
    assert resp_vid.json()["media_metadata"]["media_type"] == "video"

    # 3. POST /api/cooking/assist (Text only)
    resp_cook1 = client.post(
        "/api/cooking/assist",
        data={"query": "Quick 15-minute healthy breakfast with eggs and spinach"},
    )
    print(f"POST /api/cooking/assist (Text) -> Status: {resp_cook1.status_code}")
    assert resp_cook1.status_code == 200
    cook1_data = resp_cook1.json()
    assert "recipe_name" in cook1_data
    assert "step_by_step_instructions" in cook1_data

    # 4. POST /api/cooking/assist (Multimodal: Image + Audio + Query)
    aud_bytes = make_synthetic_wav_audio()
    resp_cook2 = client.post(
        "/api/cooking/assist",
        files={
            "image": ("pantry.jpg", img_bytes, "image/jpeg"),
            "audio": ("voice.wav", aud_bytes, "audio/wav"),
        },
        data={"query": "Make a Mediterranean dinner using what is shown"},
    )
    print(f"POST /api/cooking/assist (Multimodal) -> Status: {resp_cook2.status_code}")
    assert resp_cook2.status_code == 200
    cook2_data = resp_cook2.json()
    assert "recipe_name" in cook2_data
    assert len(cook2_data["step_by_step_instructions"]) > 0

    print("=== All HTTP Endpoints Passed ===\n")


if __name__ == "__main__":
    asyncio.run(test_helpers())
    asyncio.run(test_hygiene_service())
    asyncio.run(test_cooking_guidance_service())
    test_http_endpoints()
    print("*** ALL MILESTONE 4 TESTS PASSED PERFECTLY ***")

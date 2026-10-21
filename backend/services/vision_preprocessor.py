"""
Vision Preprocessor Service
Handles OpenCV image/video frame extraction, PyTorch tensor transformations,
and comprehensive CV metrics extraction for multimodal food analysis.
"""
import base64
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch


class VisionPreprocessor:
    """Preprocesses images and video feeds for multimodal computer vision workflows."""

    MAX_WIDTH = 1024

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size

    # ------------------------------------------------------------------ #
    #  Core helpers (preserved from Milestone 1)
    # ------------------------------------------------------------------ #
    def decode_image_bytes(self, image_bytes: bytes) -> np.ndarray:
        """Decode raw image bytes into an OpenCV BGR numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image from byte buffer.")
        return image

    def resize_and_normalize(self, image: np.ndarray) -> np.ndarray:
        """Resize image to target dimensions and convert to RGB."""
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb_image, self.target_size, interpolation=cv2.INTER_AREA)
        return resized

    def to_torch_tensor(self, image: np.ndarray) -> torch.Tensor:
        """Convert numpy array (H, W, C) to normalized PyTorch tensor (C, H, W)."""
        tensor = torch.from_numpy(image).permute(2, 0, 1).float() / 255.0
        return tensor

    def extract_video_frames(
        self,
        video_path: str,
        max_frames: int = 16,
        sample_fps: Optional[float] = None,
    ) -> List[np.ndarray]:
        """Extract key frames from video file using OpenCV."""
        cap = cv2.VideoCapture(video_path)
        frames: List[np.ndarray] = []
        if not cap.isOpened():
            raise IOError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = int(fps / sample_fps) if sample_fps and sample_fps > 0 else 1

        frame_idx = 0
        while cap.isOpened() and len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                frames.append(frame)
            frame_idx += 1

        cap.release()
        return frames

    def extract_video_keyframe(self, video_bytes: bytes, filename: str = "video.mp4") -> Dict[str, Any]:
        """
        Milestone 4 helper: extracts a representative middle frame from uploaded video bytes,
        computes OpenCV brightness, sharpness, cleanliness edge metrics, and PyTorch tensor stats.
        Returns the base64 JPEG string + video metadata (duration, FPS, frame count).
        """
        suffix = os.path.splitext(filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = None
        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise IOError("Failed to open video file stream from uploaded bytes.")

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_sec = round(total_frames / fps, 2) if fps > 0 and total_frames > 0 else 0.0

            # Target representative middle frame
            middle_frame_idx = max(0, total_frames // 2)
            cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame_idx)
            ret, frame = cap.read()

            if not ret or frame is None:
                # Fallback to first frame if middle frame cannot be read
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()

            if not ret or frame is None:
                raise ValueError("Could not extract any valid keyframe from video.")

            h, w = frame.shape[:2]

            # OpenCV metrics on keyframe
            brightness = self._compute_brightness(frame)
            sharpness = self._compute_sharpness(frame)
            dominant_colors = self._dominant_color_stats(frame)

            # Cleanliness edge density (Canny on surfaces: lower clutter = cleaner worktop)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = round(float(edges.sum() / 255) / float(gray.size) * 100, 2)
            cleanliness_score = round(max(0.0, min(100.0, 100.0 - (edge_density * 2.0))), 1)

            cv_metrics = {
                "resolution": {"width": w, "height": h},
                "brightness_score": brightness,
                "sharpness_score": sharpness,
                "edge_density_pct": edge_density,
                "cleanliness_index": cleanliness_score,
                "dominant_colors": dominant_colors,
            }

            # PyTorch tensor
            rgb_resized = self.resize_and_normalize(frame)
            tensor = self.to_torch_tensor(rgb_resized)
            channel_means = [round(float(tensor[c].mean()), 4) for c in range(tensor.shape[0])]
            tensor_info = {
                "shape": list(tensor.shape),
                "channel_means": {
                    "red": channel_means[0],
                    "green": channel_means[1],
                    "blue": channel_means[2],
                },
            }

            # Resized base64 JPEG
            resized_bgr = self._resize_for_llm(frame)
            image_base64 = self._to_base64_jpeg(resized_bgr)

            video_metadata = {
                "duration_seconds": duration_sec,
                "fps": round(float(fps), 2),
                "total_frames": total_frames,
                "keyframe_index": middle_frame_idx,
            }

            return {
                "image_base64": image_base64,
                "video_metadata": video_metadata,
                "cv_metrics": cv_metrics,
                "tensor_info": tensor_info,
            }

        finally:
            if cap is not None and cap.isOpened():
                cap.release()
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    # ------------------------------------------------------------------ #
    #  Milestone 2 – preprocess_image (CV metrics + tensor + base64)
    # ------------------------------------------------------------------ #
    def _compute_brightness(self, bgr_image: np.ndarray) -> float:
        """Average perceived brightness on a 0-100 scale."""
        gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
        return round(float(gray.mean()) / 255.0 * 100, 2)

    def _compute_sharpness(self, bgr_image: np.ndarray) -> float:
        """Laplacian variance as a sharpness/blur metric (higher = sharper)."""
        gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
        return round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2)

    def _dominant_color_stats(self, bgr_image: np.ndarray) -> Dict[str, Any]:
        """Return mean RGB and HSV values as dominant colour summary."""
        rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
        hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)
        mean_rgb = [round(float(v), 1) for v in rgb.mean(axis=(0, 1))]
        mean_hsv = [round(float(v), 1) for v in hsv.mean(axis=(0, 1))]
        return {
            "mean_rgb": {"r": mean_rgb[0], "g": mean_rgb[1], "b": mean_rgb[2]},
            "mean_hsv": {"h": mean_hsv[0], "s": mean_hsv[1], "v": mean_hsv[2]},
        }

    def _resize_for_llm(self, bgr_image: np.ndarray) -> np.ndarray:
        """Downscale images wider than MAX_WIDTH while keeping aspect ratio."""
        h, w = bgr_image.shape[:2]
        if w <= self.MAX_WIDTH:
            return bgr_image
        scale = self.MAX_WIDTH / w
        new_w = self.MAX_WIDTH
        new_h = int(h * scale)
        return cv2.resize(bgr_image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def _to_base64_jpeg(self, bgr_image: np.ndarray, quality: int = 85) -> str:
        """Encode a BGR image as a base64 JPEG string."""
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, buf = cv2.imencode(".jpg", bgr_image, encode_params)
        return base64.b64encode(buf.tobytes()).decode("utf-8")

    def preprocess_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Full preprocessing pipeline for food image analysis.

        Returns
        -------
        dict with keys:
            image_base64  – JPEG-encoded base64 string (resized ≤ 1024px wide)
            cv_metrics    – resolution, brightness, sharpness, dominant colours
            tensor_info   – shape and per-channel means of the normalised tensor
        """
        # Decode
        bgr = self.decode_image_bytes(image_bytes)
        h, w = bgr.shape[:2]

        # CV metrics
        cv_metrics: Dict[str, Any] = {
            "resolution": {"width": w, "height": h},
            "brightness_score": self._compute_brightness(bgr),
            "sharpness_score": self._compute_sharpness(bgr),
            "dominant_colors": self._dominant_color_stats(bgr),
        }

        # Torch tensor (uses the 224×224 normalised path)
        rgb_resized = self.resize_and_normalize(bgr)
        tensor = self.to_torch_tensor(rgb_resized)
        channel_means = [round(float(tensor[c].mean()), 4) for c in range(tensor.shape[0])]
        tensor_info = {
            "shape": list(tensor.shape),            # [3, 224, 224]
            "channel_means": {
                "red": channel_means[0],
                "green": channel_means[1],
                "blue": channel_means[2],
            },
        }

        # Resize for LLM and encode
        resized_bgr = self._resize_for_llm(bgr)
        image_base64 = self._to_base64_jpeg(resized_bgr)

        return {
            "image_base64": image_base64,
            "cv_metrics": cv_metrics,
            "tensor_info": tensor_info,
        }

    # ------------------------------------------------------------------ #
    #  Milestone 3 – extract_freshness_features (color + texture + tensor)
    # ------------------------------------------------------------------ #
    def _color_distribution(self, hsv: np.ndarray) -> Dict[str, Any]:
        """Compute HSV channel statistics for freshness colour profiling."""
        h, s, v = cv2.split(hsv)
        return {
            "hue_mean": round(float(h.mean()), 2),
            "hue_std": round(float(h.std()), 2),
            "saturation_mean": round(float(s.mean()), 2),
            "saturation_std": round(float(s.std()), 2),
            "value_mean": round(float(v.mean()), 2),
            "value_std": round(float(v.std()), 2),
        }

    def _discoloration_percentage(self, hsv: np.ndarray, lab: np.ndarray) -> Dict[str, Any]:
        """
        Estimate the percentage of brown/dark discoloured pixels.
        Brown range in HSV: H 10-30, S 50-200, V 30-180.
        Dark spots: L < 60 in LAB space.
        """
        h, s, v = cv2.split(hsv)
        l_ch = lab[:, :, 0]
        total_pixels = float(hsv.shape[0] * hsv.shape[1])

        brown_mask = ((h >= 10) & (h <= 30) & (s >= 50) & (s <= 200) & (v >= 30) & (v <= 180))
        brown_pct = round(float(brown_mask.sum()) / total_pixels * 100, 2)

        dark_mask = l_ch < 60
        dark_pct = round(float(dark_mask.sum()) / total_pixels * 100, 2)

        return {
            "brown_spot_pct": brown_pct,
            "dark_spot_pct": dark_pct,
            "combined_discoloration_pct": round(brown_pct + dark_pct, 2),
        }

    def _texture_metrics(self, gray: np.ndarray) -> Dict[str, Any]:
        """
        Compute surface texture indicators for spoilage detection.
        - Edge density via Canny (wrinkling / mold boundaries)
        - Local contrast via Laplacian variance (roughness)
        - Gradient magnitude via Sobel (surface irregularity)
        """
        # Canny edge density
        edges = cv2.Canny(gray, 50, 150)
        total_pixels = float(gray.shape[0] * gray.shape[1])
        edge_density = round(float(edges.sum() / 255) / total_pixels * 100, 2)

        # Laplacian variance (local contrast / roughness)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        laplacian_var = round(float(laplacian.var()), 2)
        laplacian_mean = round(float(np.abs(laplacian).mean()), 2)

        # Sobel gradient magnitude
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(sobel_x ** 2 + sobel_y ** 2)
        gradient_mean = round(float(gradient_mag.mean()), 2)
        gradient_std = round(float(gradient_mag.std()), 2)

        return {
            "edge_density_pct": edge_density,
            "laplacian_variance": laplacian_var,
            "laplacian_mean_abs": laplacian_mean,
            "sobel_gradient_mean": gradient_mean,
            "sobel_gradient_std": gradient_std,
        }

    def _saturation_levels(self, hsv: np.ndarray) -> Dict[str, Any]:
        """Classify saturation into low / medium / high bands."""
        s = hsv[:, :, 1]
        total = float(s.size)
        low = round(float((s < 50).sum()) / total * 100, 2)
        mid = round(float(((s >= 50) & (s < 150)).sum()) / total * 100, 2)
        high = round(float((s >= 150).sum()) / total * 100, 2)
        return {"low_pct": low, "medium_pct": mid, "high_pct": high}

    def extract_freshness_features(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Activity 3.1 – Specialized freshness feature extraction pipeline.

        Returns
        -------
        dict with keys:
            image_base64       – JPEG-encoded base64 (resized ≤ 1024px)
            freshness_features – quantitative OpenCV + NumPy metrics
            tensor_summary     – normalized PyTorch feature vector stats
        """
        bgr = self.decode_image_bytes(image_bytes)
        h, w = bgr.shape[:2]

        # Colour spaces
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        # --- quantitative features ----------------------------------- #
        color_dist = self._color_distribution(hsv)
        discoloration = self._discoloration_percentage(hsv, lab)
        texture = self._texture_metrics(gray)
        saturation = self._saturation_levels(hsv)

        # LAB channel stats (useful for freshness – a* and b* axes)
        l_ch, a_ch, b_ch = cv2.split(lab)
        lab_stats = {
            "l_mean": round(float(l_ch.mean()), 2),
            "a_mean": round(float(a_ch.mean()), 2),
            "b_mean": round(float(b_ch.mean()), 2),
            "a_std": round(float(a_ch.std()), 2),
            "b_std": round(float(b_ch.std()), 2),
        }

        freshness_features: Dict[str, Any] = {
            "resolution": {"width": w, "height": h},
            "color_distribution": color_dist,
            "discoloration": discoloration,
            "saturation_levels": saturation,
            "texture_metrics": texture,
            "lab_color_stats": lab_stats,
        }

        # --- PyTorch feature summary tensor --------------------------- #
        raw_features = np.array([
            color_dist["hue_mean"],
            color_dist["saturation_mean"],
            color_dist["value_mean"],
            discoloration["brown_spot_pct"],
            discoloration["dark_spot_pct"],
            texture["edge_density_pct"],
            texture["laplacian_variance"],
            texture["sobel_gradient_mean"],
            saturation["low_pct"],
            saturation["medium_pct"],
            saturation["high_pct"],
            lab_stats["a_mean"],
            lab_stats["b_mean"],
        ], dtype=np.float32)

        feature_tensor = torch.from_numpy(raw_features)
        # Normalize to 0-1 range
        t_min = feature_tensor.min()
        t_max = feature_tensor.max()
        if t_max - t_min > 0:
            feature_tensor_norm = (feature_tensor - t_min) / (t_max - t_min)
        else:
            feature_tensor_norm = torch.zeros_like(feature_tensor)

        tensor_summary = {
            "shape": list(feature_tensor.shape),
            "raw_values": [round(float(v), 4) for v in feature_tensor.tolist()],
            "normalized_values": [round(float(v), 4) for v in feature_tensor_norm.tolist()],
            "feature_labels": [
                "hue_mean", "saturation_mean", "value_mean",
                "brown_spot_pct", "dark_spot_pct",
                "edge_density_pct", "laplacian_variance", "sobel_gradient_mean",
                "sat_low_pct", "sat_medium_pct", "sat_high_pct",
                "lab_a_mean", "lab_b_mean",
            ],
        }

        # Base64 for LLM
        resized_bgr = self._resize_for_llm(bgr)
        image_base64 = self._to_base64_jpeg(resized_bgr)

        return {
            "image_base64": image_base64,
            "freshness_features": freshness_features,
            "tensor_summary": tensor_summary,
        }

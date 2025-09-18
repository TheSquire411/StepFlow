"""
Image analysis service for computer vision tasks
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import httpx
from loguru import logger
import asyncio
from io import BytesIO
from PIL import Image

from ..config import settings


class ImageAnalysisService:
    """Service for analyzing images using computer vision"""
    
    def __init__(self):
        self.initialized = False
        self.models = {}
    
    async def _initialize(self):
        """Initialize the image analysis service"""
        if self.initialized:
            return
        
        try:
            logger.info("Initializing image analysis service")
            # Initialize any ML models here
            # For example: YOLO, face detection, etc.
            self.initialized = True
            logger.info("Image analysis service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize image analysis service: {e}")
            raise
    
    async def process(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process image analysis task"""
        await self._initialize()
        
        image_url = task_data.get("image_url")
        analysis_types = task_data.get("analysis_types", [])
        
        if not image_url:
            raise ValueError("image_url is required")
        
        if not analysis_types:
            raise ValueError("analysis_types is required")
        
        # Download image
        image = await self._download_image(image_url)
        
        # Perform requested analyses
        analysis_results = {}
        detected_objects = []
        
        for analysis_type in analysis_types:
            if analysis_type == "object_detection":
                objects = await self._detect_objects(image)
                detected_objects.extend(objects)
                analysis_results["object_detection"] = objects
            
            elif analysis_type == "face_detection":
                faces = await self._detect_faces(image)
                analysis_results["face_detection"] = faces
            
            elif analysis_type == "color_analysis":
                colors = await self._analyze_colors(image)
                analysis_results["color_analysis"] = colors
            
            elif analysis_type == "edge_detection":
                edges = await self._detect_edges(image)
                analysis_results["edge_detection"] = edges
            
            elif analysis_type == "image_quality":
                quality = await self._analyze_image_quality(image)
                analysis_results["image_quality"] = quality
            
            else:
                logger.warning(f"Unknown analysis type: {analysis_type}")
        
        # Get image metadata
        image_metadata = await self._get_image_metadata(image)
        
        return {
            "analysis_results": analysis_results,
            "detected_objects": detected_objects,
            "image_metadata": image_metadata
        }
    
    async def _download_image(self, url: str) -> np.ndarray:
        """Download image from URL and convert to OpenCV format"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                
                # Convert to PIL Image then to OpenCV
                pil_image = Image.open(BytesIO(response.content))
                cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                
                return cv_image
                
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            raise
    
    async def _detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in the image"""
        objects = []
        
        try:
            # This is a simplified implementation
            # In a real system, you would use YOLO, SSD, or similar models
            
            # For now, we'll use basic contour detection as a placeholder
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for i, contour in enumerate(contours[:20]):  # Limit to top 20
                area = cv2.contourArea(contour)
                if area < 500:  # Skip small objects
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                
                objects.append({
                    "object_id": i,
                    "class": "unknown_object",
                    "confidence": 0.5,  # Placeholder confidence
                    "bounding_box": {
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h)
                    },
                    "area": int(area),
                    "center": {
                        "x": int(x + w/2),
                        "y": int(y + h/2)
                    }
                })
            
            logger.debug(f"Detected {len(objects)} objects")
            return objects
            
        except Exception as e:
            logger.error(f"Error in object detection: {e}")
            return []
    
    async def _detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces in the image"""
        faces = []
        
        try:
            # Use OpenCV's Haar cascade for face detection
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            detected_faces = face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(30, 30)
            )
            
            for i, (x, y, w, h) in enumerate(detected_faces):
                faces.append({
                    "face_id": i,
                    "confidence": 0.8,  # Haar cascades don't provide confidence scores
                    "bounding_box": {
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h)
                    },
                    "center": {
                        "x": int(x + w/2),
                        "y": int(y + h/2)
                    },
                    "area": int(w * h)
                })
            
            logger.debug(f"Detected {len(faces)} faces")
            return faces
            
        except Exception as e:
            logger.error(f"Error in face detection: {e}")
            return []
    
    async def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze color distribution in the image"""
        
        try:
            # Convert to RGB for color analysis
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Calculate color histograms
            hist_r = cv2.calcHist([rgb_image], [0], None, [256], [0, 256])
            hist_g = cv2.calcHist([rgb_image], [1], None, [256], [0, 256])
            hist_b = cv2.calcHist([rgb_image], [2], None, [256], [0, 256])
            
            # Calculate dominant colors using k-means
            pixels = rgb_image.reshape(-1, 3)
            
            # Sample pixels for performance
            if len(pixels) > 10000:
                indices = np.random.choice(len(pixels), 10000, replace=False)
                pixels = pixels[indices]
            
            # Simple dominant color detection (most frequent color ranges)
            dominant_colors = []
            
            # Calculate mean color
            mean_color = np.mean(pixels, axis=0)
            dominant_colors.append({
                "color": [int(c) for c in mean_color],
                "percentage": 100.0,
                "name": "average"
            })
            
            # Calculate brightness and contrast
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            return {
                "dominant_colors": dominant_colors,
                "brightness": float(brightness),
                "contrast": float(contrast),
                "color_space": "RGB",
                "histogram_peaks": {
                    "red": int(np.argmax(hist_r)),
                    "green": int(np.argmax(hist_g)),
                    "blue": int(np.argmax(hist_b))
                }
            }
            
        except Exception as e:
            logger.error(f"Error in color analysis: {e}")
            return {}
    
    async def _detect_edges(self, image: np.ndarray) -> Dict[str, Any]:
        """Detect edges in the image"""
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Canny edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Count edge pixels
            edge_pixels = np.sum(edges > 0)
            total_pixels = edges.shape[0] * edges.shape[1]
            edge_density = edge_pixels / total_pixels
            
            # Find contours from edges
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            return {
                "edge_density": float(edge_density),
                "total_edge_pixels": int(edge_pixels),
                "contour_count": len(contours),
                "edge_detection_method": "Canny",
                "parameters": {
                    "low_threshold": 50,
                    "high_threshold": 150
                }
            }
            
        except Exception as e:
            logger.error(f"Error in edge detection: {e}")
            return {}
    
    async def _analyze_image_quality(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze image quality metrics"""
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate sharpness using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate noise level (simplified)
            noise_level = np.std(gray)
            
            # Calculate brightness and contrast
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            # Determine quality score (0-100)
            quality_score = min(100, max(0, (laplacian_var / 1000) * 100))
            
            return {
                "quality_score": float(quality_score),
                "sharpness": float(laplacian_var),
                "noise_level": float(noise_level),
                "brightness": float(brightness),
                "contrast": float(contrast),
                "resolution": {
                    "width": image.shape[1],
                    "height": image.shape[0]
                },
                "aspect_ratio": float(image.shape[1] / image.shape[0])
            }
            
        except Exception as e:
            logger.error(f"Error in image quality analysis: {e}")
            return {}
    
    async def _get_image_metadata(self, image: np.ndarray) -> Dict[str, Any]:
        """Get basic image metadata"""
        
        height, width = image.shape[:2]
        channels = image.shape[2] if len(image.shape) > 2 else 1
        
        return {
            "dimensions": {
                "width": int(width),
                "height": int(height),
                "channels": int(channels)
            },
            "total_pixels": int(width * height),
            "color_space": "BGR" if channels == 3 else "Grayscale",
            "data_type": str(image.dtype),
            "file_size_estimate": int(image.nbytes),
            "analysis_timestamp": asyncio.get_event_loop().time()
        }
"""
OCR (Optical Character Recognition) service
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import httpx
from loguru import logger
import asyncio
from io import BytesIO
from PIL import Image
import easyocr

from ..config import settings


class OCRService:
    """Service for extracting text from images using OCR"""
    
    def __init__(self):
        self.reader = None
        self.initialized = False
    
    async def _initialize(self):
        """Initialize the OCR service (lazy loading)"""
        if self.initialized:
            return
        
        try:
            logger.info("Initializing OCR service")
            # Initialize EasyOCR reader
            languages = settings.OCR_LANGUAGES.split(',')
            self.reader = easyocr.Reader(languages, gpu=False)  # Set gpu=True if CUDA available
            self.initialized = True
            logger.info(f"OCR service initialized with languages: {languages}")
        except Exception as e:
            logger.error(f"Failed to initialize OCR service: {e}")
            raise
    
    async def process(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process OCR extraction task"""
        await self._initialize()
        
        image_url = task_data.get("image_url")
        languages = task_data.get("languages", ["en"])
        extract_regions = task_data.get("extract_regions")
        
        if not image_url:
            raise ValueError("image_url is required")
        
        # Download image
        image = await self._download_image(image_url)
        
        # Extract text
        if extract_regions:
            # Extract from specific regions
            extracted_text, text_regions, confidence_scores = await self._extract_from_regions(
                image, extract_regions
            )
        else:
            # Extract from entire image
            extracted_text, text_regions, confidence_scores = await self._extract_full_image(image)
        
        # Detect language
        detected_language = await self._detect_language(extracted_text)
        
        return {
            "extracted_text": extracted_text,
            "text_regions": text_regions,
            "confidence_scores": confidence_scores,
            "language_detected": detected_language
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
    
    async def _extract_full_image(self, image: np.ndarray) -> tuple[str, List[Dict[str, Any]], List[float]]:
        """Extract text from the entire image"""
        try:
            # Run OCR in a thread to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self.reader.readtext, image)
            
            extracted_text = ""
            text_regions = []
            confidence_scores = []
            
            for (bbox, text, confidence) in results:
                if confidence > 0.3:  # Filter low confidence results
                    extracted_text += text + " "
                    
                    # Convert bbox to standard format
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    text_regions.append({
                        "text": text,
                        "bounding_box": {
                            "x": int(min(x_coords)),
                            "y": int(min(y_coords)),
                            "width": int(max(x_coords) - min(x_coords)),
                            "height": int(max(y_coords) - min(y_coords))
                        },
                        "confidence": float(confidence),
                        "bbox_points": [[int(x), int(y)] for x, y in bbox]
                    })
                    
                    confidence_scores.append(float(confidence))
            
            return extracted_text.strip(), text_regions, confidence_scores
            
        except Exception as e:
            logger.error(f"Error in OCR extraction: {e}")
            return "", [], []
    
    async def _extract_from_regions(
        self, 
        image: np.ndarray, 
        regions: List[Dict[str, float]]
    ) -> tuple[str, List[Dict[str, Any]], List[float]]:
        """Extract text from specific regions of the image"""
        
        extracted_text = ""
        text_regions = []
        confidence_scores = []
        
        try:
            for region in regions:
                # Extract region coordinates
                x = int(region.get("x", 0))
                y = int(region.get("y", 0))
                width = int(region.get("width", image.shape[1]))
                height = int(region.get("height", image.shape[0]))
                
                # Crop image to region
                cropped = image[y:y+height, x:x+width]
                
                if cropped.size == 0:
                    continue
                
                # Run OCR on cropped region
                loop = asyncio.get_event_loop()
                results = await loop.run_in_executor(None, self.reader.readtext, cropped)
                
                for (bbox, text, confidence) in results:
                    if confidence > 0.3:
                        extracted_text += text + " "
                        
                        # Adjust bbox coordinates to original image
                        x_coords = [point[0] + x for point in bbox]
                        y_coords = [point[1] + y for point in bbox]
                        
                        text_regions.append({
                            "text": text,
                            "bounding_box": {
                                "x": int(min(x_coords)),
                                "y": int(min(y_coords)),
                                "width": int(max(x_coords) - min(x_coords)),
                                "height": int(max(y_coords) - min(y_coords))
                            },
                            "confidence": float(confidence),
                            "bbox_points": [[int(x), int(y)] for x, y in zip(x_coords, y_coords)],
                            "region_index": regions.index(region)
                        })
                        
                        confidence_scores.append(float(confidence))
            
            return extracted_text.strip(), text_regions, confidence_scores
            
        except Exception as e:
            logger.error(f"Error in region OCR extraction: {e}")
            return "", [], []
    
    async def _detect_language(self, text: str) -> str:
        """Detect the language of extracted text"""
        try:
            # Simple language detection based on character patterns
            # In a production system, you might use a proper language detection library
            
            if not text:
                return "unknown"
            
            # Count different character types
            latin_chars = sum(1 for c in text if c.isascii() and c.isalpha())
            total_chars = sum(1 for c in text if c.isalpha())
            
            if total_chars == 0:
                return "unknown"
            
            latin_ratio = latin_chars / total_chars
            
            if latin_ratio > 0.8:
                return "en"  # Likely English or other Latin-based language
            else:
                return "other"  # Non-Latin script
                
        except Exception as e:
            logger.error(f"Error in language detection: {e}")
            return "unknown"
    
    async def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR results"""
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Apply denoising
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Apply adaptive thresholding for better text contrast
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            return thresh
            
        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            return image
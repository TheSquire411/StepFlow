"""
Step detection service using computer vision and AI
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
import httpx
from loguru import logger
import asyncio
from io import BytesIO
from PIL import Image

from ..config import settings


class StepDetectionService:
    """Service for detecting user interaction steps from screenshots"""
    
    def __init__(self):
        self.initialized = False
    
    async def _initialize(self):
        """Initialize the service (lazy loading)"""
        if self.initialized:
            return
        
        try:
            # Initialize any ML models here
            logger.info("Initializing step detection service")
            self.initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize step detection service: {e}")
            raise
    
    async def process(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process step detection task"""
        await self._initialize()
        
        screenshot_url = task_data.get("screenshot_url")
        previous_screenshot_url = task_data.get("previous_screenshot_url")
        session_context = task_data.get("session_context", {})
        
        if not screenshot_url:
            raise ValueError("screenshot_url is required")
        
        # Download and process screenshots
        current_image = await self._download_image(screenshot_url)
        previous_image = None
        
        if previous_screenshot_url:
            previous_image = await self._download_image(previous_screenshot_url)
        
        # Detect steps
        detected_steps = await self._detect_steps(
            current_image, 
            previous_image, 
            session_context
        )
        
        # Analyze screenshot
        screenshot_analysis = await self._analyze_screenshot(current_image)
        
        return {
            "detected_steps": detected_steps,
            "screenshot_analysis": screenshot_analysis,
            "processing_metadata": {
                "has_previous_screenshot": previous_image is not None,
                "image_dimensions": current_image.shape[:2],
                "session_context_keys": list(session_context.keys())
            }
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
    
    async def _detect_steps(
        self, 
        current_image: np.ndarray, 
        previous_image: Optional[np.ndarray],
        session_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect interaction steps from screenshots"""
        
        detected_steps = []
        
        try:
            # Convert to grayscale for processing
            current_gray = cv2.cvtColor(current_image, cv2.COLOR_BGR2GRAY)
            
            # Detect UI elements
            ui_elements = await self._detect_ui_elements(current_image)
            
            # If we have a previous image, detect changes
            if previous_image is not None:
                previous_gray = cv2.cvtColor(previous_image, cv2.COLOR_BGR2GRAY)
                changes = await self._detect_changes(current_gray, previous_gray)
                
                # Correlate changes with UI elements
                for change in changes:
                    step = await self._correlate_change_to_step(change, ui_elements, session_context)
                    if step:
                        detected_steps.append(step)
            else:
                # No previous image, analyze current state
                step = await self._analyze_current_state(ui_elements, session_context)
                if step:
                    detected_steps.append(step)
            
            return detected_steps
            
        except Exception as e:
            logger.error(f"Error in step detection: {e}")
            return []
    
    async def _detect_ui_elements(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect UI elements in the image"""
        elements = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect buttons using template matching and contours
            buttons = await self._detect_buttons(gray)
            elements.extend(buttons)
            
            # Detect input fields
            inputs = await self._detect_input_fields(gray)
            elements.extend(inputs)
            
            # Detect clickable areas
            clickable = await self._detect_clickable_areas(gray)
            elements.extend(clickable)
            
            return elements
            
        except Exception as e:
            logger.error(f"Error detecting UI elements: {e}")
            return []
    
    async def _detect_buttons(self, gray_image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect button elements"""
        buttons = []
        
        try:
            # Use edge detection to find rectangular shapes
            edges = cv2.Canny(gray_image, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                # Filter by area and aspect ratio
                area = cv2.contourArea(contour)
                if area < 100 or area > 50000:  # Skip very small or large areas
                    continue
                
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                
                # Button-like aspect ratio
                if 0.5 <= aspect_ratio <= 5.0:
                    buttons.append({
                        "type": "button",
                        "bounding_box": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                        "center": {"x": int(x + w/2), "y": int(y + h/2)},
                        "confidence": 0.7,
                        "area": int(area)
                    })
            
            return buttons[:20]  # Limit to top 20 candidates
            
        except Exception as e:
            logger.error(f"Error detecting buttons: {e}")
            return []
    
    async def _detect_input_fields(self, gray_image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect input field elements"""
        inputs = []
        
        try:
            # Use morphological operations to detect rectangular input fields
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 5))
            morph = cv2.morphologyEx(gray_image, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 200 or area > 20000:
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                
                # Input field-like aspect ratio (wider than tall)
                if aspect_ratio >= 2.0:
                    inputs.append({
                        "type": "input",
                        "bounding_box": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                        "center": {"x": int(x + w/2), "y": int(y + h/2)},
                        "confidence": 0.6,
                        "area": int(area)
                    })
            
            return inputs[:10]  # Limit to top 10 candidates
            
        except Exception as e:
            logger.error(f"Error detecting input fields: {e}")
            return []
    
    async def _detect_clickable_areas(self, gray_image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect other clickable areas"""
        # This is a simplified implementation
        # In a real system, you might use ML models trained on UI elements
        return []
    
    async def _detect_changes(self, current: np.ndarray, previous: np.ndarray) -> List[Dict[str, Any]]:
        """Detect changes between two images"""
        changes = []
        
        try:
            # Compute absolute difference
            diff = cv2.absdiff(current, previous)
            
            # Threshold to get binary image
            _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
            
            # Find contours of changes
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 50:  # Skip very small changes
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                
                changes.append({
                    "type": "visual_change",
                    "bounding_box": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "center": {"x": int(x + w/2), "y": int(y + h/2)},
                    "area": int(area),
                    "change_intensity": float(np.mean(diff[y:y+h, x:x+w]))
                })
            
            return changes
            
        except Exception as e:
            logger.error(f"Error detecting changes: {e}")
            return []
    
    async def _correlate_change_to_step(
        self, 
        change: Dict[str, Any], 
        ui_elements: List[Dict[str, Any]],
        session_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Correlate a detected change to a user interaction step"""
        
        change_center = change["center"]
        
        # Find the closest UI element to the change
        closest_element = None
        min_distance = float('inf')
        
        for element in ui_elements:
            element_center = element["center"]
            distance = np.sqrt(
                (change_center["x"] - element_center["x"])**2 + 
                (change_center["y"] - element_center["y"])**2
            )
            
            if distance < min_distance:
                min_distance = distance
                closest_element = element
        
        if closest_element and min_distance < 50:  # Within 50 pixels
            # Determine action type based on element type and change characteristics
            action = "click"
            if closest_element["type"] == "input":
                action = "type"
            
            return {
                "action": action,
                "element": f"{closest_element['type']}_element",
                "coordinates": change_center,
                "confidence": min(0.9, closest_element["confidence"] + 0.1),
                "bounding_box": closest_element["bounding_box"],
                "description": f"User {action}ed on {closest_element['type']} element",
                "text": None  # Would be extracted via OCR in a full implementation
            }
        
        return None
    
    async def _analyze_current_state(
        self, 
        ui_elements: List[Dict[str, Any]],
        session_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Analyze current state when no previous image is available"""
        
        if not ui_elements:
            return None
        
        # For now, just return a generic navigation step
        return {
            "action": "navigate",
            "element": None,
            "coordinates": None,
            "confidence": 0.5,
            "bounding_box": None,
            "description": f"User navigated to page with {len(ui_elements)} interactive elements",
            "text": None
        }
    
    async def _analyze_screenshot(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze screenshot for additional metadata"""
        
        height, width = image.shape[:2]
        
        # Calculate basic image statistics
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        contrast = np.std(gray)
        
        # Detect if it's likely a web page, mobile app, etc.
        page_type = "unknown"
        if width > height and width > 1000:
            page_type = "desktop_web"
        elif height > width:
            page_type = "mobile_app"
        
        return {
            "dimensions": {"width": int(width), "height": int(height)},
            "brightness": float(brightness),
            "contrast": float(contrast),
            "estimated_page_type": page_type,
            "analysis_timestamp": asyncio.get_event_loop().time()
        }
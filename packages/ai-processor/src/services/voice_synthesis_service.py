"""
Voice synthesis service using ElevenLabs
"""

from typing import Dict, Any, Optional
import httpx
from loguru import logger
import asyncio
import tempfile
import os
from elevenlabs import generate, save, set_api_key, voices

from ..config import settings


class VoiceSynthesisService:
    """Service for generating speech from text using ElevenLabs"""
    
    def __init__(self):
        self.initialized = False
        self.available_voices = {}
    
    async def _initialize(self):
        """Initialize the voice synthesis service"""
        if self.initialized:
            return
        
        try:
            if not settings.ELEVENLABS_API_KEY:
                raise ValueError("ELEVENLABS_API_KEY is required for voice synthesis")
            
            logger.info("Initializing voice synthesis service")
            set_api_key(settings.ELEVENLABS_API_KEY)
            
            # Load available voices
            await self._load_available_voices()
            
            self.initialized = True
            logger.info("Voice synthesis service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize voice synthesis service: {e}")
            raise
    
    async def process(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process voice synthesis task"""
        await self._initialize()
        
        text = task_data.get("text")
        voice_id = task_data.get("voice_id", settings.DEFAULT_VOICE_ID)
        voice_settings = task_data.get("voice_settings", {})
        
        if not text:
            raise ValueError("text is required")
        
        # Generate audio
        audio_data, duration = await self._generate_speech(text, voice_id, voice_settings)
        
        # Save audio to temporary file and get URL
        audio_url = await self._save_audio_file(audio_data)
        
        # Get voice metadata
        voice_metadata = await self._get_voice_metadata(voice_id)
        
        return {
            "audio_url": audio_url,
            "duration": duration,
            "voice_metadata": {
                "voice_id": voice_id,
                "voice_name": voice_metadata.get("name", "Unknown"),
                "settings": voice_settings,
                "text_length": len(text),
                "estimated_words": len(text.split())
            }
        }
    
    async def _load_available_voices(self):
        """Load available voices from ElevenLabs"""
        try:
            loop = asyncio.get_event_loop()
            voice_list = await loop.run_in_executor(None, voices)
            
            for voice in voice_list:
                self.available_voices[voice.voice_id] = {
                    "name": voice.name,
                    "category": voice.category,
                    "description": getattr(voice, 'description', ''),
                    "preview_url": getattr(voice, 'preview_url', None)
                }
            
            logger.info(f"Loaded {len(self.available_voices)} available voices")
            
        except Exception as e:
            logger.error(f"Failed to load available voices: {e}")
            # Continue with default voice
            self.available_voices[settings.DEFAULT_VOICE_ID] = {
                "name": "Default Voice",
                "category": "premade",
                "description": "Default voice for synthesis"
            }
    
    async def _generate_speech(
        self, 
        text: str, 
        voice_id: str, 
        voice_settings: Dict[str, Any]
    ) -> tuple[bytes, float]:
        """Generate speech from text"""
        
        try:
            # Prepare voice settings
            stability = voice_settings.get("stability", 0.75)
            similarity_boost = voice_settings.get("similarity_boost", 0.75)
            style = voice_settings.get("style", 0.0)
            use_speaker_boost = voice_settings.get("use_speaker_boost", True)
            
            # Generate audio in a thread to avoid blocking
            loop = asyncio.get_event_loop()
            
            def _generate():
                return generate(
                    text=text,
                    voice=voice_id,
                    model="eleven_monolingual_v1",
                    voice_settings={
                        "stability": stability,
                        "similarity_boost": similarity_boost,
                        "style": style,
                        "use_speaker_boost": use_speaker_boost
                    }
                )
            
            audio_data = await loop.run_in_executor(None, _generate)
            
            # Estimate duration (rough calculation: ~150 words per minute)
            word_count = len(text.split())
            estimated_duration = (word_count / 150) * 60  # seconds
            
            logger.debug(f"Generated speech: {len(audio_data)} bytes, ~{estimated_duration:.1f}s")
            
            return audio_data, estimated_duration
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            raise RuntimeError(f"Speech generation failed: {str(e)}")
    
    async def _save_audio_file(self, audio_data: bytes) -> str:
        """Save audio data to file and return URL"""
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(
                suffix=".mp3", 
                delete=False, 
                dir=settings.TEMP_DIR
            ) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            # In a real implementation, you would upload this to S3 or similar
            # For now, we'll return a local file URL
            filename = os.path.basename(temp_path)
            audio_url = f"/tmp/audio/{filename}"
            
            logger.debug(f"Saved audio file: {audio_url}")
            return audio_url
            
        except Exception as e:
            logger.error(f"Error saving audio file: {e}")
            raise RuntimeError(f"Failed to save audio file: {str(e)}")
    
    async def _get_voice_metadata(self, voice_id: str) -> Dict[str, Any]:
        """Get metadata for a voice"""
        
        return self.available_voices.get(voice_id, {
            "name": "Unknown Voice",
            "category": "unknown",
            "description": ""
        })
    
    async def get_available_voices(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available voices"""
        await self._initialize()
        return self.available_voices
    
    async def clone_voice(self, voice_name: str, audio_files: list[str]) -> str:
        """Clone a voice from audio samples (premium feature)"""
        # This would implement voice cloning functionality
        # Requires ElevenLabs premium subscription
        raise NotImplementedError("Voice cloning not implemented")
    
    async def _validate_text_length(self, text: str) -> bool:
        """Validate text length for synthesis"""
        
        # ElevenLabs has character limits depending on subscription
        max_chars = 5000  # Adjust based on your subscription
        
        if len(text) > max_chars:
            raise ValueError(f"Text too long: {len(text)} characters (max: {max_chars})")
        
        return True
    
    async def _preprocess_text(self, text: str) -> str:
        """Preprocess text for better speech synthesis"""
        
        # Remove or replace problematic characters
        processed_text = text.replace("&", "and")
        processed_text = processed_text.replace("@", "at")
        processed_text = processed_text.replace("#", "number")
        processed_text = processed_text.replace("%", "percent")
        
        # Add pauses for better speech flow
        processed_text = processed_text.replace(".", ". ")
        processed_text = processed_text.replace(",", ", ")
        processed_text = processed_text.replace(";", "; ")
        
        # Remove extra whitespace
        processed_text = " ".join(processed_text.split())
        
        return processed_text
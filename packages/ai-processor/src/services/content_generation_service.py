"""
Content generation service using OpenAI GPT
"""

from typing import Dict, Any, Optional
import openai
from loguru import logger
import asyncio

from ..config import settings


class ContentGenerationService:
    """Service for generating content using AI"""
    
    def __init__(self):
        self.client = None
        self.initialized = False
    
    async def _initialize(self):
        """Initialize the content generation service"""
        if self.initialized:
            return
        
        try:
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY is required for content generation")
            
            logger.info("Initializing content generation service")
            self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.initialized = True
            logger.info("Content generation service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize content generation service: {e}")
            raise
    
    async def process(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process content generation task"""
        await self._initialize()
        
        prompt = task_data.get("prompt")
        content_type = task_data.get("content_type")
        context = task_data.get("context", {})
        max_length = task_data.get("max_length", settings.MAX_CONTENT_LENGTH)
        
        if not prompt:
            raise ValueError("prompt is required")
        
        if not content_type:
            raise ValueError("content_type is required")
        
        # Generate content based on type
        if content_type == "step_description":
            generated_content = await self._generate_step_description(prompt, context, max_length)
        elif content_type == "guide_title":
            generated_content = await self._generate_guide_title(prompt, context, max_length)
        elif content_type == "guide_summary":
            generated_content = await self._generate_guide_summary(prompt, context, max_length)
        elif content_type == "step_instructions":
            generated_content = await self._generate_step_instructions(prompt, context, max_length)
        else:
            generated_content = await self._generate_generic_content(prompt, context, max_length)
        
        return {
            "generated_content": generated_content,
            "content_type": content_type,
            "generation_metadata": {
                "prompt_length": len(prompt),
                "context_keys": list(context.keys()),
                "max_length": max_length,
                "model_used": "gpt-3.5-turbo"
            }
        }
    
    async def _generate_step_description(
        self, 
        prompt: str, 
        context: Dict[str, Any], 
        max_length: int
    ) -> str:
        """Generate a description for a user interaction step"""
        
        system_prompt = """You are an expert at creating clear, concise descriptions of user interface interactions. 
        Generate a brief, actionable description of the user step based on the provided information.
        Focus on what the user did and why it's important in the workflow.
        Keep descriptions under 100 words and use simple, clear language."""
        
        user_prompt = f"""
        Context: {context}
        
        Generate a clear description for this user interaction step:
        {prompt}
        
        The description should be:
        - Clear and actionable
        - Focused on the user's intent
        - Suitable for a step-by-step guide
        """
        
        return await self._call_openai(system_prompt, user_prompt, max_tokens=150)
    
    async def _generate_guide_title(
        self, 
        prompt: str, 
        context: Dict[str, Any], 
        max_length: int
    ) -> str:
        """Generate a title for a guide"""
        
        system_prompt = """You are an expert at creating engaging, descriptive titles for how-to guides.
        Generate a clear, concise title that accurately describes what the guide teaches.
        Titles should be under 60 characters and use action-oriented language."""
        
        user_prompt = f"""
        Context: {context}
        
        Generate an engaging title for a guide about:
        {prompt}
        
        The title should be:
        - Clear and descriptive
        - Action-oriented (How to...)
        - Under 60 characters
        - Engaging for users
        """
        
        return await self._call_openai(system_prompt, user_prompt, max_tokens=50)
    
    async def _generate_guide_summary(
        self, 
        prompt: str, 
        context: Dict[str, Any], 
        max_length: int
    ) -> str:
        """Generate a summary for a guide"""
        
        system_prompt = """You are an expert at creating concise, informative summaries for instructional guides.
        Generate a brief summary that explains what the guide covers and what users will learn.
        Keep summaries under 200 words and focus on the value to the user."""
        
        user_prompt = f"""
        Context: {context}
        
        Generate a helpful summary for a guide about:
        {prompt}
        
        The summary should:
        - Explain what the guide covers
        - Highlight key learning outcomes
        - Be under 200 words
        - Appeal to the target audience
        """
        
        return await self._call_openai(system_prompt, user_prompt, max_tokens=250)
    
    async def _generate_step_instructions(
        self, 
        prompt: str, 
        context: Dict[str, Any], 
        max_length: int
    ) -> str:
        """Generate detailed instructions for a step"""
        
        system_prompt = """You are an expert at creating clear, detailed instructions for software interactions.
        Generate step-by-step instructions that are easy to follow and understand.
        Use numbered lists and be specific about what users should click, type, or look for."""
        
        user_prompt = f"""
        Context: {context}
        
        Generate detailed instructions for:
        {prompt}
        
        The instructions should:
        - Be specific and actionable
        - Use numbered steps if multiple actions are needed
        - Include what users should expect to see
        - Be clear for beginners
        """
        
        return await self._call_openai(system_prompt, user_prompt, max_tokens=300)
    
    async def _generate_generic_content(
        self, 
        prompt: str, 
        context: Dict[str, Any], 
        max_length: int
    ) -> str:
        """Generate generic content"""
        
        system_prompt = """You are a helpful assistant that generates clear, useful content based on user requests.
        Create content that is well-structured, informative, and appropriate for the given context."""
        
        user_prompt = f"""
        Context: {context}
        
        Generate content for:
        {prompt}
        """
        
        max_tokens = min(max_length // 4, 1000)  # Rough estimate: 4 chars per token
        return await self._call_openai(system_prompt, user_prompt, max_tokens=max_tokens)
    
    async def _call_openai(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Make a call to OpenAI API"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            generated_content = response.choices[0].message.content.strip()
            
            logger.debug(f"Generated content: {len(generated_content)} characters")
            return generated_content
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise RuntimeError(f"Content generation failed: {str(e)}")
    
    async def _enhance_prompt_with_context(self, prompt: str, context: Dict[str, Any]) -> str:
        """Enhance the prompt with additional context"""
        
        enhanced_prompt = prompt
        
        # Add relevant context information
        if "page_title" in context:
            enhanced_prompt += f"\nPage: {context['page_title']}"
        
        if "element_type" in context:
            enhanced_prompt += f"\nElement type: {context['element_type']}"
        
        if "user_action" in context:
            enhanced_prompt += f"\nUser action: {context['user_action']}"
        
        if "workflow_step" in context:
            enhanced_prompt += f"\nWorkflow step: {context['workflow_step']}"
        
        return enhanced_prompt
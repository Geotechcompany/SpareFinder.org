"""OpenAI DALL-E image generation service for reengagement emails."""

import os
import base64
import logging
from typing import Optional
from io import BytesIO
from datetime import datetime
import random
import requests

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")


class ImageGenerator:
    """Service for generating images using OpenAI DALL-E API."""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.model = os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3").strip()  # dall-e-3 or dall-e-2
        self._client = None
    
    def _get_client(self):
        """Get or create OpenAI client."""
        if not OPENAI_AVAILABLE:
            raise ImportError("openai package is not installed. Install it with: pip install openai")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required for image generation")
        
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key)
        
        return self._client

    def generate_reengagement_image(
        self, theme: str = "industrial"
    ) -> Optional[str]:
        """
        Generate a unique image for reengagement emails using OpenAI DALL-E.
        
        Args:
            theme: Image theme - "industrial", "parts", "maintenance", or "technology"
            
        Returns:
            Public URL of uploaded image in Supabase Storage, or fallback URL if generation fails
        """
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not configured, skipping image generation")
            return self._get_fallback_image(theme)
        
        if not OPENAI_AVAILABLE:
            logger.warning("openai package not installed, using fallback image")
            return self._get_fallback_image(theme)

        try:
            # Get unique prompt based on theme
            prompt = self._get_image_prompt(theme)
            
            logger.info(f"Generating image with theme: {theme}, model: {self.model}")

            # Use OpenAI DALL-E
            client = self._get_client()
            
            # Generate image using DALL-E
            # DALL-E 3 supports: 1024x1024, 1792x1024, or 1024x1792
            # DALL-E 2 supports: 256x256, 512x512, or 1024x1024
            size = "1792x1024" if self.model == "dall-e-3" else "1024x1024"
            quality = "hd" if self.model == "dall-e-3" else "standard"
            
            response = client.images.generate(
                model=self.model,
                prompt=prompt.strip(),
                size=size,
                quality=quality,
                n=1,  # Number of images to generate
            )
            
            # Get image URL from response
            image_url = response.data[0].url
            
            # Download the image
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            image_bytes = image_response.content
            
            logger.info(f"Image generated successfully, size: {len(image_bytes)} bytes")
            
            # Upload to Supabase Storage and get public URL
            public_url = self._upload_to_supabase_storage(image_bytes, theme)
            
            if public_url:
                logger.info(f"Image generated and uploaded to Supabase: {public_url}")
                return public_url
            else:
                # If upload fails, use the OpenAI URL directly (temporary, expires after 1 hour)
                logger.warning("Failed to upload to Supabase, using OpenAI URL directly")
                return image_url

        except Exception as e:
            logger.error(f"Failed to generate OpenAI DALL-E image: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Return fallback image URL
            return self._get_fallback_image(theme)
    
    def _upload_to_supabase_storage(
        self, image_bytes: bytes, theme: str
    ) -> Optional[str]:
        """
        Upload generated image to Supabase Storage and return public URL.
        
        Args:
            image_bytes: Raw image bytes (PNG format)
            theme: Image theme for folder organization
            
        Returns:
            Public URL of uploaded image, or None if upload failed
        """
        try:
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured - cannot upload image to storage")
                return None
            
            # Import supabase client
            try:
                from supabase import create_client
            except ImportError:
                logger.warning("supabase package not installed - cannot upload image to storage")
                return None
            
            # Create Supabase client
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            random_id = random.randint(1000, 9999)
            filename = f"reengagement_{theme}_{timestamp}_{random_id}.png"
            
            # Storage path: email-images/{theme}/{filename}
            storage_path = f"email-images/{theme}/{filename}"
            bucket_name = "sparefinder"
            
            logger.info(f"Uploading image to Supabase Storage: {bucket_name}/{storage_path}")
            
            # Upload to Supabase Storage
            try:
                supabase.storage.from_(bucket_name).upload(
                    storage_path,
                    image_bytes,
                    file_options={
                        "content-type": "image/png",
                        "x-upsert": "true",  # Overwrite if exists
                    }
                )
                
                # Get public URL
                try:
                    public_url_response = supabase.storage.from_(bucket_name).get_public_url(storage_path)
                    # Handle different response formats
                    if isinstance(public_url_response, dict):
                        public_url = public_url_response.get("publicUrl") or public_url_response.get("url")
                    elif hasattr(public_url_response, 'data'):
                        public_url = public_url_response.data.get("publicUrl") if isinstance(public_url_response.data, dict) else str(public_url_response.data)
                    else:
                        public_url = str(public_url_response)
                except Exception as url_error:
                    logger.warning(f"Could not get public URL, constructing manually: {url_error}")
                    # Construct public URL manually
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{storage_path}"
                
                logger.info(f"Image uploaded successfully: {public_url}")
                return public_url
                
            except Exception as upload_error:
                logger.error(f"Failed to upload image to Supabase Storage: {upload_error}")
                return None
                
        except Exception as e:
            logger.error(f"Error uploading image to Supabase Storage: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    def _get_image_prompt(self, theme: str) -> str:
        """Get dynamic image prompt based on theme."""
        prompts = {
            "industrial": [
                "Professional industrial workshop with organized spare parts storage, modern lighting, clean environment, high quality, detailed, photorealistic",
                "Industrial maintenance technician identifying mechanical parts with digital tablet, modern factory setting, professional photography, sharp focus",
                "Aerial view of organized industrial parts warehouse with labeled shelves, bright lighting, professional photography, detailed, high resolution",
                "Close-up of precision mechanical parts arranged on clean workbench, professional lighting, industrial photography, sharp details, high quality",
                "Modern industrial facility with advanced parts identification system, clean environment, professional photography, detailed, photorealistic",
            ],
            "parts": [
                "Colorful array of industrial spare parts neatly organized on display, professional photography, sharp focus, high quality, detailed",
                "Close-up of various mechanical components with labels and part numbers, clean background, professional lighting, high resolution",
                "Organized parts inventory system with digital scanning technology, modern industrial setting, professional photography, detailed",
                "Precision mechanical parts arranged by category, clean workspace, professional lighting, high quality photography, sharp details",
                "Industrial parts catalog display with clear organization, modern setting, professional photography, detailed, high resolution",
            ],
            "maintenance": [
                "Professional maintenance team working with digital tools to identify parts, modern industrial setting, professional photography, detailed",
                "Maintenance technician using tablet to scan and identify mechanical parts, clean workshop, professional lighting, high quality",
                "Modern maintenance facility with digital parts identification system, organized workspace, professional photography, detailed, sharp focus",
                "Close-up of maintenance tools and parts identification technology, professional setting, high quality photography, detailed, sharp",
                "Professional maintenance workflow with parts identification, modern industrial environment, clean setting, professional photography, detailed",
            ],
            "technology": [
                "Futuristic AI-powered parts identification system in modern industrial setting, professional photography, high quality, detailed",
                "Digital interface displaying part identification results, modern technology, clean design, professional photography, sharp focus",
                "Advanced scanning technology identifying industrial parts, modern facility, professional lighting, high quality photography, detailed",
                "Smart industrial parts management system with digital displays, modern technology, professional photography, detailed, high resolution",
                "Cutting-edge parts identification technology in action, modern industrial setting, professional photography, high quality, detailed",
            ],
        }

        theme_prompts = prompts.get(theme, prompts["industrial"])
        import random
        return random.choice(theme_prompts)

    def _get_fallback_image(self, theme: str) -> str:
        """Get fallback image URL if generation fails."""
        fallback_images = {
            "industrial": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
            "parts": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80",
            "maintenance": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
            "technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        }
        return fallback_images.get(theme, fallback_images["industrial"])


# Global instance
image_generator = ImageGenerator()


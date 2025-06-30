"""
Google Vision API Service for General Parts Recognition
Uses Google's powerful Vision API to identify any type of part or object
"""

import logging
import os
import asyncio
from typing import Dict, List, Optional, Any, Tuple
import base64
import io
from PIL import Image
import requests
import json

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GoogleVisionService:
    """Google Vision API service for general parts and object recognition."""
    
    def __init__(self):
        """Initialize Google Vision service."""
        settings = get_settings()
        self.api_key = settings.GOOGLE_VISION_API_KEY
        if not self.api_key:
            raise ValueError("GOOGLE_VISION_API_KEY environment variable is required")
        
        self.vision_api_url = "https://vision.googleapis.com/v1/images:annotate"
        
        # General part categories with price ranges
        self.general_categories = {
            'automotive': {
                'keywords': ['car', 'auto', 'vehicle', 'motor', 'brake', 'tire', 'engine', 'door', 'bumper'],
                'price_range': '£20 - £500'
            },
            'electronics': {
                'keywords': ['circuit', 'board', 'chip', 'resistor', 'capacitor', 'electronic', 'pcb', 'processor'],
                'price_range': '£5 - £200'
            },
            'mechanical': {
                'keywords': ['gear', 'bearing', 'screw', 'bolt', 'nut', 'washer', 'spring', 'shaft'],
                'price_range': '£1 - £100'
            },
            'appliance': {
                'keywords': ['appliance', 'kitchen', 'washing', 'dryer', 'refrigerator', 'oven', 'microwave'],
                'price_range': '£10 - £300'
            },
            'industrial': {
                'keywords': ['industrial', 'machinery', 'equipment', 'pump', 'valve', 'motor', 'compressor'],
                'price_range': '£50 - £1000'
            },
            'computer': {
                'keywords': ['computer', 'laptop', 'keyboard', 'mouse', 'monitor', 'cpu', 'ram', 'hard drive'],
                'price_range': '£10 - £500'
            },
            'furniture': {
                'keywords': ['furniture', 'chair', 'table', 'desk', 'cabinet', 'drawer', 'handle', 'hinge'],
                'price_range': '£5 - £200'
            },
            'tools': {
                'keywords': ['tool', 'wrench', 'screwdriver', 'hammer', 'drill', 'saw', 'pliers'],
                'price_range': '£5 - £150'
            },
            'plumbing': {
                'keywords': ['pipe', 'fitting', 'valve', 'faucet', 'toilet', 'sink', 'drain', 'plumbing'],
                'price_range': '£5 - £200'
            },
            'electrical': {
                'keywords': ['wire', 'cable', 'switch', 'outlet', 'breaker', 'electrical', 'plug', 'socket'],
                'price_range': '£2 - £100'
            }
        }
        
        logger.info("Google Vision API service initialized for general part recognition")
    
    async def analyze_automotive_part(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze any part or object using Google Vision API.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Analysis results with part identification and confidence
        """
        try:
            # Encode image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare Vision API request
            request_data = {
                'requests': [
                    {
                        'image': {
                            'content': image_base64
                        },
                        'features': [
                            {
                                'type': 'LABEL_DETECTION',
                                'maxResults': 30
                            },
                            {
                                'type': 'OBJECT_LOCALIZATION',
                                'maxResults': 20
                            },
                            {
                                'type': 'TEXT_DETECTION',
                                'maxResults': 15
                            }
                        ]
                    }
                ]
            }
            
            # Make API request
            response = await self._make_vision_api_request(request_data)
            
            if not response or 'responses' not in response:
                raise ValueError("Invalid response from Google Vision API")
            
            vision_response = response['responses'][0]
            
            # Extract and analyze results
            analysis_result = await self._analyze_vision_response(vision_response)
            
            logger.info(f"Google Vision analysis completed: {analysis_result['part_name']} with {analysis_result['confidence']:.1f}% confidence")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Google Vision analysis failed: {e}")
            raise
    
    async def _make_vision_api_request(self, request_data: Dict) -> Dict:
        """Make request to Google Vision API."""
        headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': self.api_key
        }
        
        try:
            # Use requests for synchronous call, wrap in asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    self.vision_api_url,
                    headers=headers,
                    json=request_data,
                    timeout=30
                )
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Google Vision API error {response.status_code}: {error_text}")
                raise ValueError(f"Google Vision API request failed: {response.status_code}")
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Failed to call Google Vision API: {e}")
            raise
    
    async def _analyze_vision_response(self, vision_response: Dict) -> Dict[str, Any]:
        """Analyze Google Vision API response and identify automotive parts."""
        
        # Extract labels, objects, and text
        labels = vision_response.get('labelAnnotations', [])
        objects = vision_response.get('localizedObjectAnnotations', [])
        text_annotations = vision_response.get('textAnnotations', [])
        
        # Combine all detected text
        detected_text = ""
        if text_annotations:
            detected_text = " ".join([annotation.get('description', '') for annotation in text_annotations])
        
        # Combine all labels and objects
        all_descriptions = []
        for label in labels:
            all_descriptions.append(label.get('description', '').lower())
        
        for obj in objects:
            all_descriptions.append(obj.get('name', '').lower())
        
        # Add detected text to descriptions
        if detected_text:
            all_descriptions.append(detected_text.lower())
        
        combined_description = " ".join(all_descriptions)
        
        logger.info(f"Google Vision detected: {combined_description[:200]}...")
        
        # Analyze for automotive parts
        part_analysis = self._identify_automotive_part(combined_description, labels, objects)
        
        return part_analysis
    
    def _identify_automotive_part(self, description: str, labels: List[Dict], objects: List[Dict]) -> Dict[str, Any]:
        """Identify any type of part from Google Vision analysis."""
        
        # First, try to identify from the most confident labels
        best_match = self._identify_from_labels(labels, description)
        
        if best_match and best_match['confidence'] > 40:
            return best_match
        
        # Try to identify from detected text
        text_match = self._identify_from_text(description)
        if text_match and text_match['confidence'] > best_match.get('confidence', 0):
            best_match = text_match
        
        # Try to categorize based on general categories
        category_match = self._identify_from_categories(description, labels)
        if category_match and category_match['confidence'] > best_match.get('confidence', 0):
            best_match = category_match
        
        # Final fallback
        if not best_match or best_match['confidence'] < 25:
            best_match = self._create_generic_identification(description, labels)
        
        # Add detailed description
        best_match['description'] = self._generate_part_description(best_match, description[:100])
        
        return best_match
    
    def _identify_from_labels(self, labels: List[Dict], description: str) -> Dict[str, Any]:
        """Identify part from Google Vision labels."""
        if not labels:
            return None
        
        # First, try to extract part name from detected text
        text_part_name = self._extract_part_name_from_text(description)
        
        # Initialize base confidence
        base_confidence = 0.0
        
        # If we found a good part name from text
        if text_part_name and len(text_part_name) > 3:
            part_name = text_part_name
            # Calculate confidence based on text quality
            base_confidence = 65.0  # Start with base confidence
            
            # Boost confidence based on text characteristics
            if any(char.isdigit() for char in text_part_name):  # Contains numbers (likely a part)
                base_confidence += 10.0
            if len(text_part_name) > 5:  # Longer text usually more specific
                base_confidence += 5.0
            if any(label.get('description', '').lower() in text_part_name.lower() for label in labels):
                base_confidence += 10.0  # Text matches vision labels
            
            confidence = min(base_confidence, 95.0)  # Cap at 95%
        else:
            # Fall back to labels, but skip generic ones
            part_name = self._get_meaningful_label(labels)
            # Use vision API's confidence score
            confidence = labels[0].get('score', 0) * 100 + 10
        
        # Determine category and price range
        category = self._determine_category(part_name, description)
        price_range = self.general_categories.get(category, {}).get('price_range', '£5 - £100')
        
        result = {
            'part_type': part_name.lower().replace(' ', '_'),
            'part_name': part_name,
            'category': category.title(),
            'price_range': price_range,
            'confidence': min(confidence, 95)  # Ensure we never exceed 95%
        }
        
        # Add description
        result['description'] = self._generate_part_description(result, description[:100])
        
        return result
    
    def _extract_part_name_from_text(self, description: str) -> str:
        """Extract meaningful part name from detected text."""
        import re
        
        # Look for common part patterns in the text
        text_upper = description.upper()
        
        # Pattern 1: Part numbers (letters + numbers)
        part_number_pattern = r'\b([A-Z]{2,}\s*\d+[A-Z]*\d*)\b'
        part_numbers = re.findall(part_number_pattern, text_upper)
        if part_numbers:
            return part_numbers[0].strip()
        
        # Pattern 2: Multi-word part names
        multi_word_patterns = [
            r'\b(CAR\s+DOOR\s+HANDLE)\b',
            r'\b(DOOR\s+HANDLE)\b',
            r'\b(CIRCUIT\s+BOARD)\b',
            r'\b(KEYBOARD\s+KEY)\b',
            r'\b(COMPUTER\s+KEYBOARD)\b',
            r'\b(KITCHEN\s+APPLIANCE\s+PART)\b',
            r'\b(APPLIANCE\s+PART)\b',
            r'\b(ELECTRONIC\s+CIRCUIT\s+BOARD)\b',
            r'\b(METAL\s+SCREW\s+BOLT)\b',
            r'\b(SCREW\s+BOLT)\b',
            r'\b([A-Z]+\s+[A-Z]+\s+[A-Z]+)\b',  # Three words
            r'\b([A-Z]+\s+[A-Z]+)\b'            # Two words
        ]
        
        for pattern in multi_word_patterns:
            matches = re.findall(pattern, text_upper)
            if matches:
                return matches[0].strip()
        
        # Pattern 3: Single meaningful words (but not generic ones)
        single_word_pattern = r'\b([A-Z]{4,})\b'
        words = re.findall(single_word_pattern, text_upper)
        
        # Filter out generic words
        generic_words = {'WHITE', 'BLACK', 'METAL', 'PLASTIC', 'PART', 'COMPONENT', 'ITEM'}
        meaningful_words = [word for word in words if word not in generic_words and len(word) >= 4]
        
        if meaningful_words:
            return meaningful_words[0]
        
        return None
    
    def _get_meaningful_label(self, labels: List[Dict]) -> str:
        """Get a meaningful label, skipping generic visual descriptors."""
        
        # Words to skip as they're too generic
        generic_labels = {
            'white', 'black', 'gray', 'grey', 'color', 'colorfulness',
            'rectangle', 'square', 'circle', 'line', 'angle', 'pattern',
            'material', 'surface', 'texture', 'object', 'thing', 'item',
            'screenshot', 'image', 'photo', 'picture'
        }
        
        for label in labels:
            label_desc = label.get('description', '').lower()
            if label_desc not in generic_labels and len(label_desc) > 2:
                return label.get('description', '')
        
        # If all labels are generic, return the first one
        if labels:
            return labels[0].get('description', 'Unknown Part')
        
        return 'Unknown Part'
    
    def _identify_from_text(self, description: str) -> Dict[str, Any]:
        """Identify part from detected text."""
        import re
        
        # Look for part numbers, model numbers, or specific part names
        patterns = [
            r'\b([A-Z]{2,}\s*\d+[A-Z]*\d*)\b',  # Part numbers like ABC123, XYZ456A
            r'\b(MODEL\s*[A-Z0-9\-]+)\b',       # Model numbers
            r'\b([A-Z]+\s*[A-Z]+)\b'            # Two-word part names
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, description.upper())
            if matches:
                part_name = matches[0].strip()
                category = self._determine_category(part_name, description)
                price_range = self.general_categories.get(category, {}).get('price_range', '£10 - £200')
                
                result = {
                    'part_type': part_name.lower().replace(' ', '_'),
                    'part_name': part_name,
                    'category': category.title(),
                    'price_range': price_range,
                    'confidence': 60.0
                }
                
                # Add description
                result['description'] = self._generate_part_description(result, description[:100])
                
                return result
        
        return None
    
    def _identify_from_categories(self, description: str, labels: List[Dict]) -> Dict[str, Any]:
        """Identify part category from description and labels."""
        
        best_category = None
        best_score = 0.0
        
        # Combine all text for analysis
        all_text = description.lower()
        for label in labels:
            all_text += " " + label.get('description', '').lower()
        
        # Score each category
        for category, data in self.general_categories.items():
            score = 0.0
            
            for keyword in data['keywords']:
                if keyword.lower() in all_text:
                    score += 1.0
            
            # Normalize score
            normalized_score = (score / len(data['keywords'])) * 100
            
            if normalized_score > best_score:
                best_score = normalized_score
                best_category = category
        
        if best_category and best_score > 20:
            # Use the most relevant label as the part name
            part_name = self._get_most_relevant_label(labels, best_category)
            
            result = {
                'part_type': part_name.lower().replace(' ', '_'),
                'part_name': part_name,
                'category': best_category.title(),
                'price_range': self.general_categories[best_category]['price_range'],
                'confidence': min(best_score + 15, 85)
            }
            
            # Add description
            result['description'] = self._generate_part_description(result, description[:100])
            
            return result
        
        return None
    
    def _determine_category(self, part_name: str, description: str) -> str:
        """Determine the category of a part based on its name and description."""
        
        part_lower = part_name.lower()
        desc_lower = description.lower()
        
        for category, data in self.general_categories.items():
            for keyword in data['keywords']:
                if keyword.lower() in part_lower or keyword.lower() in desc_lower:
                    return category
        
        # Default categorization based on common patterns
        if any(word in part_lower for word in ['screw', 'bolt', 'nut', 'washer']):
            return 'mechanical'
        elif any(word in part_lower for word in ['circuit', 'board', 'chip']):
            return 'electronics'
        elif any(word in part_lower for word in ['handle', 'hinge', 'knob']):
            return 'furniture'
        elif any(word in part_lower for word in ['wire', 'cable', 'plug']):
            return 'electrical'
        else:
            return 'general'
    
    def _get_most_relevant_label(self, labels: List[Dict], category: str) -> str:
        """Get the most relevant label for a specific category."""
        
        category_keywords = self.general_categories.get(category, {}).get('keywords', [])
        
        # Find labels that match category keywords
        for label in labels:
            label_desc = label.get('description', '').lower()
            for keyword in category_keywords:
                if keyword.lower() in label_desc:
                    return label.get('description', '')
        
        # Return the first label if no specific match
        if labels:
            return labels[0].get('description', 'Unknown Part')
        
        return 'Unknown Part'
    
    def _create_generic_identification(self, description: str, labels: List[Dict]) -> Dict[str, Any]:
        """Create a generic identification when specific automotive parts aren't detected."""
        
        # Use the first meaningful label or fallback to "Unknown Part"
        part_name = "Unknown Part"
        
        if labels:
            part_name = self._get_meaningful_label(labels)
        
        # If we have text but no good labels, try to extract something from text
        if part_name == "Unknown Part" and description:
            text_part = self._extract_part_name_from_text(description)
            if text_part:
                part_name = text_part
        
        # Default values for generic identification
        result = {
            'part_type': part_name.lower().replace(' ', '_'),
            'part_name': part_name,
            'category': 'General',
            'price_range': '£5 - £100',
            'confidence': 25.0  # Low confidence for generic identification
        }
        
        # Add description
        result['description'] = self._generate_part_description(result, description[:100])
        
        return result
    
    def _generate_part_description(self, part_match: Dict, vision_description: str) -> str:
        """Generate a detailed part description."""
        part_name = part_match['part_name']
        category = part_match['category']
        
        # Generic descriptions for different categories
        base_descriptions = {
            'Automotive': f'{part_name} for vehicles. Essential component for automotive applications.',
            'Electronics': f'{part_name} electronic component. Used in electronic circuits and devices.',
            'Mechanical': f'{part_name} mechanical component. Used in mechanical assemblies and machinery.',
            'Appliance': f'{part_name} appliance part. Component for household appliances.',
            'Industrial': f'{part_name} industrial component. Used in industrial equipment and machinery.',
            'Computer': f'{part_name} computer component. Used in computing devices and systems.',
            'Furniture': f'{part_name} furniture component. Used in furniture assembly and hardware.',
            'Tools': f'{part_name} tool or tool component. Used for various applications.',
            'Plumbing': f'{part_name} plumbing component. Used in plumbing systems and installations.',
            'Electrical': f'{part_name} electrical component. Used in electrical systems and wiring.',
            'General': f'{part_name} component. General purpose part for various applications.'
        }
        
        base_desc = base_descriptions.get(category, f'{part_name} component for general applications.')
        
        # Add Google Vision insights if relevant
        if len(vision_description) > 10:
            base_desc += f" Detected features: {vision_description}."
        
        return base_desc

    async def test_connection(self) -> bool:
        """Test Google Vision API connection."""
        try:
            # Create a simple test image (1x1 pixel)
            test_image = Image.new('RGB', (1, 1), color='white')
            img_byte_arr = io.BytesIO()
            test_image.save(img_byte_arr, format='PNG')
            test_image_data = img_byte_arr.getvalue()
            
            # Test the API
            result = await self.analyze_automotive_part(test_image_data)
            logger.info("✅ Google Vision API connection test successful")
            return True
            
        except Exception as e:
            logger.error(f"❌ Google Vision API connection test failed: {e}")
            return False 
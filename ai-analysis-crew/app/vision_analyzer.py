"""Direct GPT-4o Vision API integration for image analysis."""

import os
import re
import base64
from openai import OpenAI
from typing import Optional

# Lines/sentences to drop before sending vision text to CrewAI agents
_VISION_DISCLAIMER_FRAGMENTS = (
    "unable to identify",
    "can't identify",
    "cannot identify",
    "i'm unable to",
    "i am unable to",
    "specific people",
    "specific brands",
    "not able to identify",
)


def analyze_image_with_gpt4o(image_data: bytes) -> str:
    """
    Analyze an image using GPT-4o's vision capabilities directly.
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Detailed description of the car part from the image
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable must be set")
    
    # Initialize OpenAI client
    client = OpenAI(api_key=openai_api_key)
    
    # Convert image to base64
    base64_image = base64.b64encode(image_data).decode('utf-8')
    
    # Determine image type
    if image_data[:4] == b'\x89PNG':
        image_type = "image/png"
    elif image_data[:2] == b'\xff\xd8':
        image_type = "image/jpeg"
    elif image_data[:4] == b'GIF8':
        image_type = "image/gif"
    elif image_data[:4] == b'RIFF' and image_data[8:12] == b'WEBP':
        image_type = "image/webp"
    else:
        image_type = "image/jpeg"  # Default
    
    # Create the vision prompt
    prompt = """Analyze this manufacturer part/component image carefully and provide a detailed identification.

Please identify:
1. **Type of Part/Component**: What specific part is this? (e.g., motor, sensor, valve, bearing, circuit board, mechanical component)
2. **Visible Details**: Any visible text, part numbers, model numbers, serial numbers, logos, or markings
3. **Physical Characteristics**: Shape, color, dimensions, material, condition, connectors, mounting points
4. **Manufacturer/Brand**: Identify any visible branding, logos, or manufacturer marks
5. **Part Numbers**: Extract ALL visible part numbers, model numbers, or identification codes
6. **Application/Compatibility**: What equipment, machinery, or products does this part fit? (vehicles, industrial equipment, appliances, electronics, etc.)
7. **Technical Specifications**: Any visible specs (voltage, amperage, pressure ratings, dimensions, etc.)
8. **Notable Features**: Any distinctive features, connectors, or characteristics that help identify this part

Be as specific as possible. If you can't determine something with certainty, say "unknown" for that field.
Do NOT include disclaimers about identifying people, faces, or brands — describe only the part/component.
Focus on extracting ALL visible text and numbers on the part."""

    try:
        # Call GPT-4o with vision
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_type};base64,{base64_image}",
                                "detail": "high"  # High detail for better recognition
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500,
            temperature=0.3  # Lower temperature for more factual analysis
        )
        
        # Extract the analysis
        analysis = response.choices[0].message.content
        
        return analysis
    
    except Exception as e:
        error_msg = f"Error analyzing image with GPT-4o Vision: {str(e)}"
        print(error_msg)
        return f"Unable to analyze image: {str(e)}"


def sanitize_vision_description(text: str) -> str:
    """
    Remove vision safety boilerplate so Crew agents get a clean part description.
    Keeps user keyword notes when present in combined get_image_description output.
    """
    if not text or not text.strip():
        return ""

    body = text.strip()
    extra_keywords = ""
    if "**Additional Keywords:**" in body:
        parts = re.split(r"\*\*Additional Keywords:\*\*\s*", body, maxsplit=1, flags=re.IGNORECASE)
        body = parts[0]
        if len(parts) > 1:
            extra_keywords = parts[1].strip()

    body = re.sub(r"^\*\*Image Analysis:\*\*\s*", "", body, flags=re.IGNORECASE).strip()

    kept_lines: list[str] = []
    for line in body.splitlines():
        low = line.lower()
        if any(fragment in low for fragment in _VISION_DISCLAIMER_FRAGMENTS):
            continue
        if line.strip():
            kept_lines.append(line)

    cleaned = "\n".join(kept_lines).strip()
    if extra_keywords:
        cleaned = (
            f"{cleaned}\n\nUser notes: {extra_keywords}".strip()
            if cleaned
            else f"User notes: {extra_keywords}"
        )
    return cleaned or text.strip()


def get_image_description(image_data: Optional[bytes], keywords: Optional[str] = None) -> str:
    """
    Get a comprehensive description combining image analysis and keywords.
    
    Args:
        image_data: Optional image bytes
        keywords: Optional text keywords
        
    Returns:
        Combined description for CrewAI agents
    """
    descriptions = []
    
    # Analyze image if provided
    if image_data:
        try:
            image_analysis = analyze_image_with_gpt4o(image_data)
            descriptions.append(f"**Image Analysis:**\n{image_analysis}")
        except Exception as e:
            print(f"Image analysis failed: {e}")
            descriptions.append("Image provided but could not be analyzed.")
    
    # Add keywords if provided
    if keywords:
        descriptions.append(f"**Additional Keywords:**\n{keywords}")
    
    # Combine all descriptions
    if descriptions:
        return "\n\n".join(descriptions)
    else:
        return "No specific part information provided."


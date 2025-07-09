import os
import logging
from openai import OpenAI
from typing import Dict, Any, Optional

class GitHubPartAnalysisService:
    def __init__(self):
        # Retrieve GitHub token from environment variable
        self.token = os.getenv('GITHUB_TOKEN')
        if not self.token:
            raise ValueError("GitHub token is not set in environment variables")

        # Initialize GitHub AI client
        self.client = OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=self.token,
        )
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def analyze_part_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze a part image using GitHub AI model
        
        Args:
            image_path (str): Path to the image file to be analyzed
        
        Returns:
            Dict[str, Any]: Detailed analysis of the part
        """
        try:
            # Read the image file
            with open(image_path, "rb") as image_file:
                # Prepare the system prompt with specific requirements
                system_prompt = """
                You are an expert industrial parts and components analyzer. 
                When given an image of a mechanical, electrical, or electronic part:

                Detailed Analysis Requirements:
                1. Precise Part Identification
                   - Exact part type and category
                   - Potential manufacturer or industry standard
                   - Estimated age/generation of the part

                2. Technical Specifications
                   - Detailed material composition
                   - Precise dimensions (if possible)
                   - Functional characteristics
                   - Potential wear or damage indicators

                3. Sourcing and Replacement
                   - Recommended suppliers or manufacturers
                   - Estimated replacement cost range
                   - Potential alternative parts or cross-references

                4. Contextual Insights
                   - Typical applications or industries
                   - Maintenance recommendations
                   - Potential failure modes or common issues

                5. Contact Recommendations
                   - Suggest potential manufacturers or specialist suppliers
                   - Provide guidance on further investigation

                Respond in a structured, professional format that aids quick decision-making.
                """

                # Create chat completion request
                response = self.client.chat.completions.create(
                    model="openai/gpt-4.1",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user", 
                            "content": [
                                {"type": "text", "text": "Analyze this part image in detail"},
                                {"type": "image", "image": image_file}
                            ]
                        }
                    ],
                    temperature=0.7,
                    max_tokens=1024
                )

                # Extract and return the analysis
                analysis = response.choices[0].message.content
                self.logger.info(f"Part analysis completed for {image_path}")
                
                return {
                    "success": True,
                    "analysis": analysis,
                    "source": "GitHub AI Model"
                }

        except Exception as e:
            self.logger.error(f"Error in part analysis: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "source": "GitHub AI Model"
            }

# Example usage
def analyze_part(image_path: str) -> Optional[Dict[str, Any]]:
    """
    Convenience function to analyze a part image
    
    Args:
        image_path (str): Path to the image file
    
    Returns:
        Optional analysis result
    """
    try:
        service = GitHubPartAnalysisService()
        return service.analyze_part_image(image_path)
    except Exception as e:
        logging.error(f"Part analysis failed: {str(e)}")
        return None 
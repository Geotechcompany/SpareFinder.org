"""Dynamic email content generation for reengagement emails."""

import random
from typing import Dict, List


class EmailContentGenerator:
    """Generate dynamic, appealing email content for reengagement."""

    @staticmethod
    def generate_content(user_name: str) -> Dict[str, any]:
        """
        Generate unique email content for reengagement.
        
        Returns:
            Dictionary with subject, headline, subhead, bullets, cta_label, and theme
        """
        subjects = [
            f"We've got something new for you, {user_name}!",
            "Your next part identification is just a photo away",
            "See what SpareFinder can do for your next job",
            "Ready to identify parts faster? We're here to help",
            "Don't let unknown parts slow you down",
            "Your parts identification assistant is waiting",
            "Quick question: What part are you looking for?",
            "We've made identifying parts even easier",
            f"Welcome back, {user_name}! Your parts are waiting",
            "Never wonder 'what part is this?' again",
        ]

        headlines = [
            f"{user_name}, spare parts shouldn't slow your team down",
            f"Hey {user_name}, ready to identify parts in seconds?",
            f"{user_name}, your parts identification tool is ready",
            f"Welcome back, {user_name}! Let's identify some parts",
            f"{user_name}, never wonder 'what part is this?' again",
            f"Hey {user_name}, we've got your parts covered",
            f"{user_name}, identify parts faster than ever",
            f"Welcome back, {user_name}! Your parts are waiting",
            f"{user_name}, transform your parts workflow today",
            f"Hey {user_name}, let's get back to identifying parts",
        ]

        subheads = [
            "Upload a photo (or add keywords), get a confident match, and share a clean result with your team—without digging through old catalogues.",
            "Our AI-powered system can identify parts from photos in seconds. No more guessing, no more delays.",
            "Simply snap a photo of any part and get instant identification with detailed specifications and supplier information.",
            "Join thousands of teams who save hours every week by identifying parts instantly instead of searching through manuals.",
            "Transform your workflow: from photo to part identification in under 30 seconds.",
            "The fastest way to identify industrial parts. Upload, identify, share—it's that simple.",
            "Stop wasting time searching for part numbers. Let AI do the heavy lifting for you.",
            "Your one-stop solution for identifying, cataloging, and sharing part information with your team.",
            "Experience the power of AI-driven part identification. Fast, accurate, and reliable.",
            "Get back in the game with instant part identification and comprehensive supplier information.",
        ]

        bullets_sets = [
            [
                "Field engineers needing fast identification from site.",
                "Stores teams dealing with unlabelled or legacy stock.",
                "Maintenance teams logging parts for repeat orders.",
            ],
            [
                "Identify parts in seconds, not hours.",
                "Build a searchable database of all your parts.",
                "Share accurate part info with your entire team.",
            ],
            [
                "Reduce downtime by identifying parts instantly.",
                "Eliminate guesswork with AI-powered accuracy.",
                "Keep your team aligned with consistent part data.",
            ],
            [
                "Works with photos, part numbers, or keywords.",
                "Get detailed specs and supplier information.",
                "Save every identification to your history.",
            ],
            [
                "Perfect for maintenance and reliability teams.",
                "Ideal for inventory and stores management.",
                "Great for procurement and purchasing workflows.",
            ],
            [
                "AI-powered accuracy you can trust.",
                "Comprehensive supplier information included.",
                "Professional reports ready to share.",
            ],
        ]

        cta_labels = [
            "Upload a part photo",
            "Start identifying parts",
            "Try it now",
            "Identify your first part",
            "Get started",
            "Upload and identify",
            "Take a photo",
            "Begin identification",
            "Start your search",
            "Identify parts now",
        ]

        themes = ["industrial", "parts", "maintenance", "technology"]

        # Randomly select variations
        return {
            "subject": random.choice(subjects),
            "headline": random.choice(headlines),
            "subhead": random.choice(subheads),
            "bullets": random.choice(bullets_sets),
            "cta_label": random.choice(cta_labels),
            "theme": random.choice(themes),
        }


import axios from "axios";

/**
 * Service for generating images using Hugging Face Inference API
 */
class HuggingFaceService {
  private apiToken: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.HF_TOKEN || "";
    this.model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-dev";
    // Provider is stored in env but not directly used in API calls
    // It's available via process.env.HF_PROVIDER if needed
    this.baseUrl = "https://api-inference.huggingface.co/models";
  }

  /**
   * Generate a unique image for reengagement emails
   * Creates industrial/spare parts themed images with variations
   */
  async generateReengagementImage(
    theme: "industrial" | "parts" | "maintenance" | "technology" = "industrial"
  ): Promise<string | null> {
    if (!this.apiToken) {
      console.warn("HF_TOKEN not configured, skipping image generation");
      return null;
    }

    try {
      // Create unique prompts based on theme and random elements
      const prompts = this.getImagePrompts(theme);
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

      // Add seed for variation
      const seed = Math.floor(Math.random() * 1000000);

      // Hugging Face Inference API for image generation
      const response = await axios.post(
        `${this.baseUrl}/${this.model}`,
        {
          inputs: randomPrompt,
          parameters: {
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed: seed,
            width: 1024,
            height: 512,
          },
          options: {
            wait_for_model: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          timeout: 90000, // 90 seconds timeout for image generation
          responseType: "arraybuffer",
        }
      );

      // Convert binary response to base64
      const imageBuffer = Buffer.from(response.data);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = response.headers["content-type"] || "image/png";

      // Return data URL for embedding in email
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error: any) {
      console.error("Failed to generate Hugging Face image:", error.message);
      
      // Fallback to a default image URL if generation fails
      return this.getFallbackImage(theme);
    }
  }

  /**
   * Get dynamic image prompts based on theme
   */
  private getImagePrompts(theme: string): string[] {
    const prompts: Record<string, string[]> = {
      industrial: [
        "Professional industrial workshop with organized spare parts storage, modern lighting, clean environment, high quality, detailed, photorealistic",
        "Industrial maintenance technician identifying mechanical parts with digital tablet, modern factory setting, professional photography, sharp focus",
        "Aerial view of organized industrial parts warehouse with labeled shelves, bright lighting, professional photography, detailed, high resolution",
        "Close-up of precision mechanical parts arranged on clean workbench, professional lighting, industrial photography, sharp details, high quality",
        "Modern industrial facility with advanced parts identification system, clean environment, professional photography, detailed, photorealistic",
      ],
      parts: [
        "Colorful array of industrial spare parts neatly organized on display, professional photography, sharp focus, high quality, detailed",
        "Close-up of various mechanical components with labels and part numbers, clean background, professional lighting, high resolution",
        "Organized parts inventory system with digital scanning technology, modern industrial setting, professional photography, detailed",
        "Precision mechanical parts arranged by category, clean workspace, professional lighting, high quality photography, sharp details",
        "Industrial parts catalog display with clear organization, modern setting, professional photography, detailed, high resolution",
      ],
      maintenance: [
        "Professional maintenance team working with digital tools to identify parts, modern industrial setting, professional photography, detailed",
        "Maintenance technician using tablet to scan and identify mechanical parts, clean workshop, professional lighting, high quality",
        "Modern maintenance facility with digital parts identification system, organized workspace, professional photography, detailed, sharp focus",
        "Close-up of maintenance tools and parts identification technology, professional setting, high quality photography, detailed, sharp",
        "Professional maintenance workflow with parts identification, modern industrial environment, clean setting, professional photography, detailed",
      ],
      technology: [
        "Futuristic AI-powered parts identification system in modern industrial setting, professional photography, high quality, detailed",
        "Digital interface displaying part identification results, modern technology, clean design, professional photography, sharp focus",
        "Advanced scanning technology identifying industrial parts, modern facility, professional lighting, high quality photography, detailed",
        "Smart industrial parts management system with digital displays, modern technology, professional photography, detailed, high resolution",
        "Cutting-edge parts identification technology in action, modern industrial setting, professional photography, high quality, detailed",
      ],
    };

    return prompts[theme] || prompts.industrial;
  }

  /**
   * Get fallback image URL if generation fails
   */
  private getFallbackImage(theme: string): string {
    const fallbackImages: Record<string, string> = {
      industrial:
        "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
      parts:
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80",
      maintenance:
        "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
      technology:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    };

    return fallbackImages[theme] || fallbackImages.industrial;
  }

  /**
   * Generate dynamic email content variations
   */
  generateEmailContent(userName: string): {
    subject: string;
    headline: string;
    subhead: string;
    bullets: string[];
    ctaLabel: string;
    theme: string;
  } {
    const subjects = [
      "We've got something new for you, ${userName}!",
      "Your next part identification is just a photo away",
      "See what SpareFinder can do for your next job",
      "Ready to identify parts faster? We're here to help",
      "Don't let unknown parts slow you down",
      "Your parts identification assistant is waiting",
      "Quick question: What part are you looking for?",
      "We've made identifying parts even easier",
    ];

    const headlines = [
      `${userName}, spare parts shouldn't slow your team down`,
      `Hey ${userName}, ready to identify parts in seconds?`,
      `${userName}, your parts identification tool is ready`,
      `Welcome back, ${userName}! Let's identify some parts`,
      `${userName}, never wonder "what part is this?" again`,
      `Hey ${userName}, we've got your parts covered`,
      `${userName}, identify parts faster than ever`,
      `Welcome back, ${userName}! Your parts are waiting`,
    ];

    const subheads = [
      "Upload a photo (or add keywords), get a confident match, and share a clean result with your team—without digging through old catalogues.",
      "Our AI-powered system can identify parts from photos in seconds. No more guessing, no more delays.",
      "Simply snap a photo of any part and get instant identification with detailed specifications and supplier information.",
      "Join thousands of teams who save hours every week by identifying parts instantly instead of searching through manuals.",
      "Transform your workflow: from photo to part identification in under 30 seconds.",
      "The fastest way to identify industrial parts. Upload, identify, share—it's that simple.",
      "Stop wasting time searching for part numbers. Let AI do the heavy lifting for you.",
      "Your one-stop solution for identifying, cataloging, and sharing part information with your team.",
    ];

    const bulletsSets = [
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
    ];

    const ctaLabels = [
      "Upload a part photo",
      "Start identifying parts",
      "Try it now",
      "Identify your first part",
      "Get started",
      "Upload and identify",
      "Take a photo",
      "Begin identification",
    ];

    const themes: Array<"industrial" | "parts" | "maintenance" | "technology"> = [
      "industrial",
      "parts",
      "maintenance",
      "technology",
    ];

    // Randomly select variations
    const subject = subjects[Math.floor(Math.random() * subjects.length)].replace(
      "${userName}",
      userName
    );
    const headline = headlines[Math.floor(Math.random() * headlines.length)];
    const subhead = subheads[Math.floor(Math.random() * subheads.length)];
    const bullets = bulletsSets[Math.floor(Math.random() * bulletsSets.length)];
    const ctaLabel = ctaLabels[Math.floor(Math.random() * ctaLabels.length)];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    return {
      subject,
      headline,
      subhead,
      bullets,
      ctaLabel,
      theme,
    };
  }
}

export const huggingFaceService = new HuggingFaceService();


/** Client-side pre-checks (backend enforces the real validation). */

const NON_PART_KEYWORD_RE =
  /\b(cat|cats|kitten|dog|puppy|pet|animal|meme|selfie|food|pizza|recipe|football|soccer|celebrity|movie|song|landscape|sunset|beach|wedding|baby|gaming|flower|tree|nature|vacation)\b/i;

export function getClientKeywordValidationError(keywords: string): string | null {
  const text = keywords.trim();
  if (text.length < 2) {
    return "Enter at least 2 characters describing a part or component.";
  }
  if (NON_PART_KEYWORD_RE.test(text)) {
    return "SpareFinder analyzes spare parts and components (industrial, manufacturing, and automotive). Please describe a part, not animals, food, or nature scenes.";
  }
  return null;
}

export function extractApiErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } })
      .response?.data;
    if (data?.message) return data.message;
    if (typeof data?.error === "string") return data.error;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

export type ReviewJobType = "image" | "keyword" | "both";

/** Map upload/history mode values to API `job_type` (image | keyword | both). */
export function normalizeReviewJobType(
  raw: string | null | undefined
): ReviewJobType {
  const mode = (raw || "image").toLowerCase().trim();
  if (mode === "both") return "both";
  if (mode === "keyword" || mode === "keywords" || mode === "keywords_only") {
    return "keyword";
  }
  return "image";
}

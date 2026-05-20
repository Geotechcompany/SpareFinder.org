import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, CheckCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobType: "image" | "keyword" | "both";
  partSearchId?: string;
  onReviewSubmitted?: () => void;
}

const feedbackOptions = [
  { value: "accuracy", label: "Accuracy", emoji: "🎯" },
  { value: "speed", label: "Speed", emoji: "⚡" },
  { value: "usability", label: "Usability", emoji: "👍" },
  { value: "general", label: "General", emoji: "💬" },
];

const helpfulFeatures = [
  "Part Identification",
  "Price Estimates",
  "Technical Specifications",
  "Supplier Information",
  "Compatibility Info",
  "Visual Recognition",
];

function reviewSubmitErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string; detail?: string | { message?: string } }
      | undefined;
    if (data?.error === "duplicate") return "duplicate";
    if (data?.message) return data.message;
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
  }
  if (error instanceof Error) return error.message;
  return "Failed to submit review. Please try again.";
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobType,
  partSearchId,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackType, setFeedbackType] = useState<string>("general");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [improvementSuggestions, setImprovementSuggestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to submit a review.",
        variant: "destructive",
      });
      return;
    }

    const jobIdTrimmed = jobId?.trim();
    if (!jobIdTrimmed) {
      toast({
        title: "Missing analysis",
        description: "This review is not linked to an analysis job. Try again from History.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.analysisReviews.create({
        job_id: jobIdTrimmed,
        job_type: jobType,
        part_search_id: partSearchId || null,
        rating,
        comment: comment.trim() || null,
        feedback_type: feedbackType,
        helpful_features: selectedFeatures.length > 0 ? selectedFeatures : null,
        improvement_suggestions: improvementSuggestions.trim() || null,
      });

      if (!result.success) {
        if (result.error === "duplicate") {
          throw new Error("duplicate");
        }
        throw new Error(
          result.message || result.error || "Failed to submit review"
        );
      }

      setIsSuccess(true);
      toast({
        title: "Thank You!",
        description: "Your review has been submitted successfully.",
      });

      // Wait a moment before closing
      setTimeout(() => {
        handleClose();
        if (onReviewSubmitted) onReviewSubmitted();
      }, 1500);
    } catch (error: unknown) {
      console.error("Error submitting review:", error);
      const message = reviewSubmitErrorMessage(error);

      if (message === "duplicate") {
        toast({
          title: "Review Already Exists",
          description: "You have already reviewed this analysis.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Submission Failed",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setFeedbackType("general");
    setSelectedFeatures([]);
    setImprovementSuggestions("");
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-brand to-brand-dark dark:from-brand-light dark:to-blue-400 bg-clip-text text-transparent">
            Rate Your Analysis
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Help us improve by sharing your experience with this analysis
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Thank You!
              </h3>
              <p className="text-muted-foreground text-center">
                Your feedback helps us improve SpareFinder AI
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Star Rating */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80">
                  Overall Rating *
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </motion.button>
                  ))}
                  {rating > 0 && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-4 text-lg font-semibold text-foreground"
                    >
                      {rating} / 5
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Feedback Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80">
                  What aspect are you reviewing?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {feedbackOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={
                        feedbackType === option.value ? "default" : "outline"
                      }
                      onClick={() => setFeedbackType(option.value)}
                      className={`${
                        feedbackType === option.value
                          ? "bg-gradient-to-r from-brand to-brand-dark border-brand/30 text-white"
                          : "bg-card border-border hover:bg-accent"
                      }`}
                    >
                      <span className="mr-2">{option.emoji}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Helpful Features */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80">
                  Which features were most helpful?
                </label>
                <div className="flex flex-wrap gap-2">
                  {helpfulFeatures.map((feature) => (
                    <Badge
                      key={feature}
                      onClick={() => handleFeatureToggle(feature)}
                      className={`cursor-pointer transition-all ${
                        selectedFeatures.includes(feature)
                          ? "bg-gradient-to-r from-brand to-brand-dark border-brand/30 text-white hover:opacity-90"
                          : "bg-muted/30 border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {feature}
                      {selectedFeatures.includes(feature) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80">
                  Your Feedback (Optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked or what could be improved..."
                  className="bg-background/60 border-border text-foreground placeholder:text-muted-foreground/70 min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comment.length} / 500
                </p>
              </div>

              {/* Improvement Suggestions */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground/80">
                  Suggestions for Improvement (Optional)
                </label>
                <Textarea
                  value={improvementSuggestions}
                  onChange={(e) => setImprovementSuggestions(e.target.value)}
                  placeholder="What features or improvements would you like to see?"
                  className="bg-background/60 border-border text-foreground placeholder:text-muted-foreground/70 min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {improvementSuggestions.length} / 500
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-border bg-transparent hover:bg-accent"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || rating === 0}
                  className="bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

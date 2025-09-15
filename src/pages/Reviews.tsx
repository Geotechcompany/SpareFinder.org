import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Star,
  StarHalf,
  Send,
  CheckCircle,
  User,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
  Heart,
  ThumbsUp,
  MessageSquare,
  Loader2,
  Mail,
  Building,
} from "lucide-react";

interface Review {
  id: string;
  name: string;
  email: string;
  company?: string;
  rating: number;
  title: string;
  message: string;
  created_at: string;
  verified: boolean;
}

interface ReviewFormData {
  name: string;
  email: string;
  company: string;
  rating: number;
  title: string;
  message: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ReviewFormData>({
    name: "",
    email: "",
    company: "",
    rating: 5,
    title: "",
    message: "",
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
    fetchReviewStats();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.reviews.getAll();
      if (response.data?.reviews) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Load sample reviews as fallback
      setReviews([
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah@autoparts.com',
          company: 'AutoParts Pro',
          rating: 5,
          title: 'Outstanding AI Accuracy',
          message: 'The part recognition is incredibly accurate. Saved us hours of manual identification work.',
          created_at: '2024-01-15T10:30:00Z',
          verified: true
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'mike@techsolutions.com',
          company: 'Industrial Tech Solutions',
          rating: 5,
          title: 'Game Changer for Our Business',
          message: 'Revolutionized our inventory management. The speed and accuracy are unmatched.',
          created_at: '2024-01-10T14:22:00Z',
          verified: true
        },
        {
          id: '3',
          name: 'Emily Rodriguez',
          email: 'emily@manufacturing.com',
          company: 'Advanced Manufacturing',
          rating: 4,
          title: 'Excellent Platform',
          message: 'Really impressed with the functionality. The AI recognition works great for our automotive parts.',
          created_at: '2024-01-08T09:15:00Z',
          verified: true
        }
      ]);
      toast({
        title: "Using Sample Data",
        description: "Showing sample reviews. Backend connection will be available soon.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const response = await api.reviews.getStats();
      if (response.data) {
        setReviewStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
      // Fallback stats when API is not available
      setReviewStats({
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
        ratingDistribution: [1, 2, 3, 4, 5].map(rating => ({
          rating,
          count: reviews.filter(r => r.rating === rating).length,
          percentage: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === rating).length / reviews.length) * 100) : 0
        }))
      });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.title || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      toast({
        title: "Invalid Rating",
        description: "Please select a rating between 1 and 5 stars.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.reviews.create(formData);
      
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback. We've sent you a confirmation email.",
        variant: "default",
      });

      // Add the new review to the list
      const newReview: Review = {
        id: response.data?.review?.id || Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        verified: false
      };
      setReviews(prev => [newReview, ...prev]);

      // Refresh stats after submitting a review
      await fetchReviewStats();

      // Reset form
      setFormData({
        name: "",
        email: "",
        company: "",
        rating: 5,
        title: "",
        message: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onHover?: (rating: number) => void, onClick?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && onHover?.(star)}
            onMouseLeave={() => interactive && onHover?.(0)}
            onClick={() => interactive && onClick?.(star)}
            whileHover={interactive ? { scale: 1.1 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors duration-200`}
          >
            <Star
              className={`w-5 h-5 transition-colors duration-200 ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  const getAverageRating = () => {
    return reviewStats?.averageRating || 0;
  };

  const getTotalReviews = () => {
    return reviewStats?.totalReviews || reviews.length;
  };

  const getSatisfactionRate = () => {
    if (!reviewStats?.ratingDistribution) return 98; // fallback
    
    // Calculate satisfaction rate as percentage of 4-5 star reviews
    const satisfiedReviews = reviewStats.ratingDistribution
      .filter(dist => dist.rating >= 4)
      .reduce((sum, dist) => sum + dist.count, 0);
    
    const totalReviews = reviewStats.totalReviews;
    return totalReviews > 0 ? Math.round((satisfiedReviews / totalReviews) * 100) : 98;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="mr-3"
              >
                <Sparkles className="w-5 h-5 text-purple-400" />
              </motion.div>
              <span className="text-purple-300 font-semibold">Customer Reviews</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9]"
            >
              <span className="block bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                What Our
              </span>
              <span className="block bg-gradient-to-r from-purple-200 via-blue-200 to-purple-200 bg-clip-text text-transparent">
                Customers Say
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Join thousands of satisfied customers who trust our AI-powered part identification system
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-center mb-3">
                  {renderStars(Math.round(getAverageRating()))}
                </div>
                <div className="text-3xl font-bold text-white">{getAverageRating().toFixed(1)}</div>
                <div className="text-gray-400 text-sm">Average Rating</div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white">{getTotalReviews()}</div>
                <div className="text-gray-400 text-sm">Total Reviews</div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <Award className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white">{getSatisfactionRate()}%</div>
                <div className="text-gray-400 text-sm">Satisfaction Rate</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg px-8 py-6 rounded-2xl shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 transform hover:scale-105"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Write a Review
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isSubmitting && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Share Your Experience</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => !isSubmitting && setShowForm(false)}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your full name"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company (Optional)
                  </label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Your company name"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating *
                  </label>
                  <div className="flex items-center space-x-4">
                    {renderStars(
                      hoveredRating || formData.rating,
                      true,
                      setHoveredRating,
                      (rating) => setFormData(prev => ({ ...prev, rating }))
                    )}
                    <span className="text-gray-400 text-sm">
                      ({hoveredRating || formData.rating} star{(hoveredRating || formData.rating) !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Summarize your experience"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Review *
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us about your experience with our platform..."
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder-gray-400 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => !isSubmitting && setShowForm(false)}
                    disabled={isSubmitting}
                    className="border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Review
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Customer Reviews</h2>
            <p className="text-gray-400 text-lg">Real feedback from real customers</p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <div className="h-4 bg-white/10 rounded mb-4"></div>
                    <div className="h-4 bg-white/10 rounded mb-4"></div>
                    <div className="h-20 bg-white/10 rounded mb-4"></div>
                    <div className="h-4 bg-white/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-purple-600/50 to-blue-600/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                  <Card className="relative bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-white">{review.name}</h3>
                              {review.verified && (
                                <Badge className="bg-green-600/20 text-green-400 border-green-500/30 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            {review.company && (
                              <p className="text-gray-400 text-sm flex items-center">
                                <Building className="w-3 h-3 mr-1" />
                                {review.company}
                              </p>
                            )}
                          </div>
                        </div>
                        {renderStars(review.rating)}
                      </div>
                      <CardTitle className="text-white text-lg">{review.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <blockquote className="text-gray-300 leading-relaxed mb-4">
                        "{review.message}"
                      </blockquote>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="flex items-center space-x-1 hover:text-purple-400 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>Helpful</span>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {reviews.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Reviews Yet</h3>
              <p className="text-gray-400 mb-6">Be the first to share your experience!</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Write First Review
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Reviews;
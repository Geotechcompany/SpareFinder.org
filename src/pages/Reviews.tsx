import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Menu,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Filter,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { tokenStorage } from "@/lib/api";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalysisReview {
  id: string;
  job_id: string;
  job_type: string;
  rating: number;
  comment: string | null;
  feedback_type: string | null;
  helpful_features: string[] | null;
  improvement_suggestions: string | null;
  created_at: string;
  updated_at: string;
}

const Reviews = () => {
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<AnalysisReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    fiveStarCount: 0,
    recentCount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const token = tokenStorage.getToken();
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

      const response = await fetch(`${API_BASE}/api/reviews/analysis`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const result = await response.json();
      const data = result.data || [];

      setReviews(data);

      // Calculate stats
      if (data && data.length > 0) {
        const avgRating =
          data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        const fiveStars = data.filter((r) => r.rating === 5).length;
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentReviews = data.filter(
          (r) => new Date(r.created_at) >= lastWeek
        ).length;

        setStats({
          totalReviews: data.length,
          averageRating: Math.round(avgRating * 10) / 10,
          fiveStarCount: fiveStars,
          recentCount: recentReviews,
        });
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      const token = tokenStorage.getToken();
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

      const response = await fetch(
        `${API_BASE}/api/reviews/analysis/${reviewId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete review");
      }

      toast({
        title: "Review Deleted",
        description: "Your review has been deleted successfully.",
      });

      fetchReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredReviews = reviews.filter((review) => {
    if (filterRating !== "all" && review.rating !== parseInt(filterRating)) {
      return false;
    }
    if (filterType !== "all" && review.job_type !== filterType) {
      return false;
    }
    return true;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const getFeedbackIcon = (type: string | null) => {
    switch (type) {
      case "accuracy":
        return "🎯";
      case "speed":
        return "⚡";
      case "usability":
        return "👍";
      default:
        return "💬";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Sidebar */}
      {!inLayout && (
        <DashboardSidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      )}

      {/* Mobile Sidebar */}
      {!inLayout && (
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          inLayout ? "" : isCollapsed ? "md:ml-20" : "md:ml-80"
        }`}
      >
        <div className="p-4 md:p-8">
          {/* Mobile Menu Button */}
          {!inLayout && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden mb-4 text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              My Reviews
            </h1>
            <p className="text-gray-400">
              View and manage your analysis feedback
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Reviews</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.totalReviews}
                      </p>
                    </div>
                    <MessageSquare className="w-10 h-10 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Average Rating</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.averageRating.toFixed(1)}
                        <span className="text-yellow-400 text-xl ml-1">★</span>
                      </p>
                    </div>
                    <Star className="w-10 h-10 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">5-Star Reviews</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.fiveStarCount}
                      </p>
                    </div>
                    <ThumbsUp className="w-10 h-10 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">This Week</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.recentCount}
                      </p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-2 block">
                      Filter by Rating
                    </label>
                    <Select
                      value={filterRating}
                      onValueChange={setFilterRating}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/10">
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-2 block">
                      Filter by Type
                    </label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/10">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="image">Image Analysis</SelectItem>
                        <SelectItem value="keyword">Keyword Search</SelectItem>
                        <SelectItem value="both">Combined Search</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reviews List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Your Reviews</CardTitle>
                <CardDescription className="text-gray-400">
                  {filteredReviews.length} review(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 bg-white/5" />
                    ))}
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No reviews yet</p>
                    <p className="text-gray-500 text-sm">
                      Complete an analysis and share your feedback!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  {renderStars(review.rating)}
                                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30">
                                    {review.job_type}
                                  </Badge>
                                  {review.feedback_type && (
                                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                                      {getFeedbackIcon(review.feedback_type)}{" "}
                                      {review.feedback_type}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-400 text-sm flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {format(new Date(review.created_at), "PPP")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(review.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {review.comment && (
                              <div className="mb-4">
                                <p className="text-white">{review.comment}</p>
                              </div>
                            )}

                            {review.helpful_features &&
                              review.helpful_features.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-400 mb-2">
                                    Helpful Features:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {review.helpful_features.map((feature) => (
                                      <Badge
                                        key={feature}
                                        className="bg-green-600/20 text-green-400 border-green-500/30"
                                      >
                                        {feature}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {review.improvement_suggestions && (
                              <div className="border-t border-white/10 pt-4">
                                <p className="text-sm text-gray-400 mb-2">
                                  Suggestions:
                                </p>
                                <p className="text-gray-300 text-sm">
                                  {review.improvement_suggestions}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;

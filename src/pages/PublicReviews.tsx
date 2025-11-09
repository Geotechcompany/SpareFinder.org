import { useEffect, useState } from "react";
import { Star, Quote, Users, Loader2 } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PublicReview = {
  id: string;
  name: string;
  company?: string;
  rating: number;
  title: string;
  message: string;
  created_at: string;
  verified: boolean;
};

const renderStars = (rating: number) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn(
          "h-4 w-4 transition-colors",
          star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-500"
        )}
      />
    ))}
  </div>
);

const PublicReviews = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await reviewsApi.getAll({ limit: 24 });

        if (response.success && response.data) {
          setReviews(response.data.reviews || []);
          setStats({
            averageRating: response.data.stats?.averageRating || 0,
            totalReviews: response.data.stats?.totalReviews || 0,
          });
        } else {
          setError(response.message || "Unable to load reviews right now.");
        }
      } catch (err) {
        console.error("Failed to load public reviews:", err);
        setError(
          "Something went wrong while loading reviews. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="relative overflow-hidden py-24 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.15),_transparent_45%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6">
          <header className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-blue-200">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              Loved by automotive professionals worldwide
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
              Customer Reviews &amp; Success Stories
            </h1>
            <p className="mt-4 text-lg text-slate-300 md:text-xl">
              Discover how repair shops, dealerships, and parts specialists use
              SpareFinder to identify and source critical components faster.
            </p>
          </header>

          <div className="grid gap-6 rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20">
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Average Rating</p>
                    <p className="text-2xl font-semibold">
                      {stats.averageRating.toFixed(1)} / 5
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                    <Users className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Published Reviews</p>
                    <p className="text-2xl font-semibold">
                      {stats.totalReviews.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/30 p-6">
                <div>
                  <p className="text-sm text-slate-300">
                    Share your experience
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Using SpareFinder in your workflow?
                  </p>
                </div>
                <Button
                  asChild
                  className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <a href="#submit-review">Leave a review</a>
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading real customer reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-slate-300">
                No reviews published yet. Check back soon!
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 transition hover:border-white/20 hover:bg-black/40"
                  >
                    <Quote className="absolute -top-3 -left-3 h-12 w-12 text-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          {review.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {review.name}
                          {review.company ? ` • ${review.company}` : ""}
                        </p>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-300">
                      {review.message}
                    </p>
                    <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {new Date(review.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                      {review.verified && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                          Verified customer
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div
            id="submit-review"
            className="grid gap-8 rounded-2xl border border-white/10 bg-black/20 p-8 text-left md:grid-cols-2"
          >
            <div>
              <h2 className="text-3xl font-semibold text-white">
                Have feedback to share?
              </h2>
              <p className="mt-3 text-slate-300">
                We&apos;re always listening. Submit a review from your customer
                dashboard or reach our team directly and we&apos;ll help you
                showcase your results with SpareFinder.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="default"
                className="bg-white text-slate-900"
              >
                <a href="/dashboard/reviews">Submit via dashboard</a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <a href="/contact">Talk to sales</a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicReviews;

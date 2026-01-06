import React, { useEffect, useState, useMemo } from 'react';
import SphereImageGrid, { ImageData } from '@/components/ui/img-sphere';
import { reviewsApi } from '@/lib/api';

interface Review {
  id: string;
  name: string;
  company?: string;
  rating: number;
  title: string;
  message: string;
  created_at: string;
  verified: boolean;
}

function fillToTarget(reviews: Review[], target: number): Review[] {
  if (reviews.length >= target) return reviews;
  if (reviews.length === 0) return reviews;

  const filled: Review[] = [...reviews];
  let i = 0;
  while (filled.length < target) {
    const base = reviews[i % reviews.length];
    filled.push({
      ...base,
      // Make IDs unique to avoid React key collisions + diversify image selection
      id: `${base.id}-dup-${filled.length - reviews.length + 1}`,
    });
    i += 1;
  }
  return filled;
}

// Generate a hash from string to ensure consistent image selection
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Curated list of Unsplash portrait photo IDs
// These are real, verified Unsplash photo identifiers for diverse portraits
const UNSPLASH_PORTRAIT_PHOTOS = [
  '1507003211169-0a1dd7228f2d', // Diverse professional portraits
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1517841905240-472988babdf9',
  '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d',
  '1508214755186-22182b35d682',
  '1492562080023-ab3db95bfbce',
  '1519085360753-af0119f7cbe7',
  '1539571696357-5a69c17a67c6',
  '1504593852-bdcaea1a05f3',
  '1504275496402-c4bdb70b90e0',
  '1517841905240-472988babdf9',
  '1492562080023-ab3db95bfbce',
  '1519085360753-af0119f7cbe7',
  '1539571696357-5a69c17a67c6',
  '1507003211169-0a1dd7228f2d',
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1517841905240-472988babdf9',
  '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d',
  '1508214755186-22182b35d682',
  '1492562080023-ab3db95bfbce',
  '1519085360753-af0119f7cbe7',
  '1539571696357-5a69c17a67c6',
  '1504593852-bdcaea1a05f3',
  '1504275496402-c4bdb70b90e0',
  '1507003211169-0a1dd7228f2d',
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1517841905240-472988babdf9',
  '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d',
  '1508214755186-22182b35d682',
  '1492562080023-ab3db95bfbce',
  '1519085360753-af0119f7cbe7',
  '1539571696357-5a69c17a67c6',
  '1504593852-bdcaea1a05f3',
  '1504275496402-c4bdb70b90e0',
  '1507003211169-0a1dd7228f2d',
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1517841905240-472988babdf9',
  '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d',
  '1508214755186-22182b35d682',
  '1492562080023-ab3db95bfbce',
  '1519085360753-af0119f7cbe7',
  '1539571696357-5a69c17a67c6'
];

const ReviewsSphere: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoading(true);
        const response = await reviewsApi.getAll({ limit: 50 });
        
        if (response.success && response.data) {
          const fetched = response.data.reviews || [];
          // Only real reviews from the database; if we need more density, duplicate real ones.
          setReviews(fillToTarget(fetched, 80));
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
  }, []);

  // Get Unsplash portrait image URL
  // Uses a deterministic approach based on review ID to ensure consistency
  const getPortraitUrl = (reviewId: string, index: number): string => {
    // Create a seed from review ID for consistent image selection
    const seed = hashString(reviewId);
    const photoIndex = seed % UNSPLASH_PORTRAIT_PHOTOS.length;
    const photoId = UNSPLASH_PORTRAIT_PHOTOS[photoIndex];
    
    // Use Unsplash Images API with specific photo ID
    // Format: https://images.unsplash.com/photo-{PHOTO_ID}?w=400&h=400&fit=crop&crop=faces
    // This ensures the same review always gets the same image
    return `https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop&crop=faces&auto=format&q=80`;
  };

  // Memoize images to avoid recalculation on every render
  const images: ImageData[] = useMemo(() => {
    return reviews.map((review, index) => ({
      id: review.id,
      src: getPortraitUrl(review.id, index),
      alt: `${review.name}'s review`,
      title: review.title,
      description: `${review.message}\n\n— ${review.name}${review.company ? `, ${review.company}` : ''}\n${'⭐'.repeat(review.rating)}`
    }));
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-gray-400">Loading reviews...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center text-gray-400">
          <p>No reviews available yet</p>
          <p className="text-sm mt-2">Check back soon for customer reviews!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center py-12">
      <SphereImageGrid
        images={images}
        containerSize={720}
        sphereRadius={260}
        dragSensitivity={0.8}
        momentumDecay={0.96}
        maxRotationSpeed={6}
        baseImageScale={0.18}
        hoverScale={1.3}
        perspective={1000}
        autoRotate={true}
        autoRotateSpeed={0.2}
        className="mx-auto"
      />
    </div>
  );
};

export default ReviewsSphere;


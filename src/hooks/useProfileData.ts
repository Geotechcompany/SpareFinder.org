import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt?: string;
}

interface Activity {
  id: string;
  action: string;
  resource_type: string;
  details: {
    description: string;
    confidence?: number;
    predictions_count?: number;
  };
  created_at: string;
}

interface ProfileData {
  achievements: Achievement[];
  totalEarned: number;
  totalAvailable: number;
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

// Build achievements from real user statistics
const buildAchievementsFromStats = (statistics: any | null) => {
  const totalUploads = statistics?.total_uploads ?? 0;
  const successful = statistics?.total_successful_identifications ?? 0;
  const avgConfidence = Number(statistics?.average_confidence_score ?? 0);
  const webScraping = statistics?.total_web_scraping_searches ?? 0;

  const achievements: Achievement[] = [
    {
      id: "first-upload",
      title: "First Upload",
      description: "Upload your first part image",
      icon: "Trophy",
      color: "from-green-600 to-emerald-600",
      earned: totalUploads >= 1,
      earnedAt: statistics?.last_upload_at || undefined,
    },
    {
      id: "power-user",
      title: "Power User",
      description: "Complete 50 uploads",
      icon: "TrendingUp",
      color: "from-blue-600 to-cyan-600",
      earned: totalUploads >= 50,
      earnedAt: statistics?.last_upload_at || undefined,
    },
    {
      id: "accuracy-master",
      title: "Accuracy Master",
      description: "Reach 90% average confidence",
      icon: "Target",
      color: "from-purple-600 to-indigo-600",
      earned: avgConfidence >= 90,
    },
    {
      id: "web-explorer",
      title: "Web Scraping Explorer",
      description: "Run 5 web-enhanced searches",
      icon: "Zap",
      color: "from-yellow-500 to-orange-500",
      earned: webScraping >= 5,
    },
    {
      id: "consistent-identifier",
      title: "Consistent Identifier",
      description: "Achieve 20 successful identifications",
      icon: "Award",
      color: "from-emerald-500 to-lime-500",
      earned: successful >= 20,
    },
  ];

  const totalEarned = achievements.filter((a) => a.earned).length;
  const totalAvailable = achievements.length;

  return { achievements, totalEarned, totalAvailable };
};

export const useProfileData = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<ProfileData>({
    achievements: [],
    totalEarned: 0,
    totalAvailable: 0,
    activities: [],
    loading: true,
    error: null
  });

  // Use refs to prevent multiple simultaneous requests
  const isFetchingRef = useRef(false);

  const fetchProfileData = useCallback(async () => {
    // Don't fetch if not authenticated or already fetching
    if (!user || !isAuthenticated || isFetchingRef.current) {
      if (!user || !isAuthenticated) {
      setData(prev => ({ ...prev, loading: false }));
      }
      return;
    }

    try {
      isFetchingRef.current = true;
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch real user statistics and derive achievements from them
      let achievements: Achievement[] = [];
      let totalEarned = 0;
      let totalAvailable = 0;

      try {
        const statsResponse = await api.statistics.getStats();
        if (statsResponse.success && (statsResponse as any).statistics) {
          const { achievements: builtAchievements, totalEarned: earned, totalAvailable: available } =
            buildAchievementsFromStats((statsResponse as any).statistics);
          achievements = builtAchievements;
          totalEarned = earned;
          totalAvailable = available;
        } else {
          const built = buildAchievementsFromStats(null);
          achievements = built.achievements;
          totalEarned = built.totalEarned;
          totalAvailable = built.totalAvailable;
        }
      } catch (statsError: any) {
        console.warn(
          "Statistics fetch failed for achievements; using defaults:",
          statsError?.message || statsError
        );
        const built = buildAchievementsFromStats(null);
        achievements = built.achievements;
        totalEarned = built.totalEarned;
        totalAvailable = built.totalAvailable;
      }

      // Try to fetch activities with a short timeout
      let activities = [];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const activitiesResponse = await api.profile.getRecentActivities(4);
        clearTimeout(timeoutId);
        
        if (activitiesResponse.success) {
          activities = activitiesResponse.data?.activities || [];
        }
      } catch (activitiesError: any) {
        console.warn('Activities fetch failed, using empty array:', activitiesError.message);
        // Don't fail the entire request if activities fail
        activities = [];
      }

      const newData: ProfileData = {
        achievements,
        totalEarned,
        totalAvailable,
        activities,
        loading: false,
        error: null
      };

      setData(newData);

    } catch (error: any) {
      console.error('Error fetching profile data:', error);

      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to load profile data. Please check your connection.'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [user, isAuthenticated]);

  // Fetch on mount + keep fresh while the page is open.
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfileData();

      // Refresh periodically so achievements auto-update after uploads/searches.
      const intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        fetchProfileData();
      }, 15_000);

      const onFocus = () => fetchProfileData();
      window.addEventListener("focus", onFocus);

      return () => {
        window.clearInterval(intervalId);
        window.removeEventListener("focus", onFocus);
      };
    }

    // Reset when user logs out
    if (!isAuthenticated || !user) {
      setData({
        achievements: [],
        totalEarned: 0,
        totalAvailable: 0,
        activities: [],
        loading: false,
        error: null
      });
    }
  }, [isAuthenticated, user?.id, fetchProfileData]);

  const refetch = useCallback(() => {
    return fetchProfileData();
  }, [fetchProfileData]);

  return { ...data, refetch };
};
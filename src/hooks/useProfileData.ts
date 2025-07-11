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

// Mock achievements data (offline)
const getMockAchievements = () => {
  const mockAchievements = [
    {
      id: 'first-upload',
      title: 'First Upload',
      description: 'Upload your first part image',
      icon: '🎯',
      color: 'from-green-600 to-emerald-600',
      earned: true,
      earnedAt: new Date().toISOString()
    },
    {
      id: 'accuracy-master',
      title: 'Accuracy Master',
      description: 'Achieve 95% accuracy rate',
      icon: '🎯',
      color: 'from-blue-600 to-cyan-600',
      earned: false
    },
    {
      id: 'speed-demon',
      title: 'Speed Demon',
      description: 'Complete 50 identifications',
      icon: '⚡',
      color: 'from-yellow-600 to-orange-600',
      earned: false
    },
    {
      id: 'streak-master',
      title: 'Streak Master',
      description: 'Use the app for 7 consecutive days',
      icon: '🔥',
      color: 'from-red-600 to-pink-600',
      earned: false
    }
  ];

  const earned = mockAchievements.filter(a => a.earned).length;
  
  return {
    achievements: mockAchievements,
    totalEarned: earned,
    totalAvailable: mockAchievements.length
  };
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
  const hasInitializedRef = useRef(false);

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

      // Get achievements immediately (offline mock data)
      const achievementsData = getMockAchievements();
      
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

      const newData = {
        achievements: achievementsData.achievements,
        totalEarned: achievementsData.totalEarned,
        totalAvailable: achievementsData.totalAvailable,
        activities,
        loading: false,
        error: null
      };

      setData(newData);

    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      
      // Still show achievements even if there's an error
      const achievementsData = getMockAchievements();
      
      setData(prev => ({
        ...prev,
        achievements: achievementsData.achievements,
        totalEarned: achievementsData.totalEarned,
        totalAvailable: achievementsData.totalAvailable,
        loading: false,
        error: 'Unable to load recent activities. Please check your connection.'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [user, isAuthenticated]);

  // Only fetch once when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchProfileData();
    }

    // Reset when user changes or logs out
    if (!isAuthenticated || !user) {
      hasInitializedRef.current = false;
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
    hasInitializedRef.current = false; // Reset initialization flag
    return fetchProfileData();
  }, [fetchProfileData]);

  return { ...data, refetch };
}; 
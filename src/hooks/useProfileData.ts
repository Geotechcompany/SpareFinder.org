import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
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

export const useProfileData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData>({
    achievements: [],
    totalEarned: 0,
    totalAvailable: 0,
    activities: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch achievements and activities in parallel
        const [achievementsResponse, activitiesResponse] = await Promise.all([
          apiClient.getAchievements(),
          apiClient.getRecentActivities(4)
        ]);

        if (achievementsResponse.success && activitiesResponse.success) {
          setData({
            achievements: achievementsResponse.data?.achievements || [],
            totalEarned: achievementsResponse.data?.totalEarned || 0,
            totalAvailable: achievementsResponse.data?.totalAvailable || 0,
            activities: activitiesResponse.data?.activities || [],
            loading: false,
            error: null
          });
        } else {
          setData(prev => ({
            ...prev,
            loading: false,
            error: achievementsResponse.error || activitiesResponse.error || 'Failed to fetch profile data'
          }));
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'An unexpected error occurred'
        }));
      }
    };

    fetchProfileData();
  }, [user]);

  const refetch = () => {
    if (user) {
      setData(prev => ({ ...prev, loading: true }));
      // Re-trigger the effect by updating a dependency or call fetchProfileData directly
    }
  };

  return { ...data, refetch };
}; 
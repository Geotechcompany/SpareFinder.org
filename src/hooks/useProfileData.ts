import { useState, useEffect, useCallback } from 'react';
import { api, type ApiType } from '../lib/api';
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

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setData(prev => ({ ...prev, loading: false }));
      return {
        achievements: [],
        totalEarned: 0,
        totalAvailable: 0,
        activities: [],
        loading: false,
        error: null
      };
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch achievements and activities in parallel
      const [achievementsResponse, activitiesResponse] = await Promise.all([
        api.profile.getAchievements(),
        api.profile.getRecentActivities(4)
      ]);

      if (achievementsResponse.success && activitiesResponse.success) {
        const newData = {
          achievements: achievementsResponse.data?.achievements || [],
          totalEarned: achievementsResponse.data?.totalEarned || 0,
          totalAvailable: achievementsResponse.data?.totalAvailable || 0,
          activities: activitiesResponse.data?.activities || [],
          loading: false,
          error: null
        };
        setData(newData);
        return newData;
      } else {
        const errorData = {
          ...data,
          loading: false,
          error: achievementsResponse.error || activitiesResponse.error || 'Failed to fetch profile data'
        };
        setData(errorData);
        return errorData;
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      const errorData = {
        ...data,
        loading: false,
        error: 'An unexpected error occurred'
      };
      setData(errorData);
      return errorData;
    }
  }, [user, data]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const refetch = useCallback(() => {
    return fetchProfileData();
  }, [fetchProfileData]);

  return { ...data, refetch };
}; 
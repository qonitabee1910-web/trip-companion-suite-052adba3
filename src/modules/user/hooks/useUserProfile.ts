/**
 * Hook for managing user profile state
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/shared/auth";
import {
  updateUserProfile,
  uploadUserAvatar,
  getUserProfile,
  type UserProfile,
} from "../data/userApi";

export function useUserProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error("Not authenticated");
      setLoading(true);
      try {
        await updateUserProfile(user.id, updates);
        await refreshProfile();
      } finally {
        setLoading(false);
      }
    },
    [user, refreshProfile],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      setUploading(true);
      try {
        const url = await uploadUserAvatar(user.id, file);
        await refreshProfile();
        return url;
      } finally {
        setUploading(false);
      }
    },
    [user, refreshProfile],
  );

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      return await getUserProfile(userId);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    profile,
    loading,
    uploading,
    updateProfile,
    uploadAvatar,
    fetchProfile,
    refreshProfile,
  };
}

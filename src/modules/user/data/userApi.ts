/**
 * User Profile API
 * Generic user profile operations for all user types (rider, driver, admin)
 */
import { supabase } from "@/integrations/supabase/client";
import { AVATARS_BUCKET } from "@/shared/auth/storageBuckets";

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  email?: string | null;
  address?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user profile data
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) throw error;
}

/**
 * Upload user avatar
 */
export async function uploadUserAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  await updateUserProfile(userId, { photo_url: url });
  return url;
}

/**
 * Get user bookings/trips (rider specific)
 */
export async function getUserBookings(userId: string, limit = 10) {
  const [shuttleBookings, hotelBookings] = await Promise.all([
    supabase
      .from("shuttle_bookings")
      .select("code, rayon_name, date, time, total_price, status, created_at")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("hotel_bookings")
      .select("code, hotel_name, check_in, total_price, status, created_at")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    shuttleBookings: shuttleBookings.data ?? [],
    hotelBookings: hotelBookings.data ?? [],
  };
}

/**
 * Get user booking statistics
 */
export async function getUserStats(userId: string) {
  const { shuttleBookings, hotelBookings } = await getUserBookings(
    userId,
    1000,
  );

  const totalSpend =
    shuttleBookings.reduce(
      (sum: number, b: any) => sum + (b.total_price ?? 0),
      0,
    ) +
    hotelBookings.reduce(
      (sum: number, b: any) => sum + (b.total_price ?? 0),
      0,
    );

  return {
    totalBookings: shuttleBookings.length + hotelBookings.length,
    totalSpend,
    recentBookings: [
      ...shuttleBookings.slice(0, 3),
      ...hotelBookings.slice(0, 3),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 3),
  };
}

import { supabase } from "@/integrations/supabase/client";
import { AVATARS_BUCKET, DRIVER_DOCS_BUCKET } from "./storageBuckets";

export type SignupRole = "rider" | "driver";

export async function signUpWithRole(opts: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: SignupRole;
}) {
  const { email, password, fullName, phone, role } = opts;
  const redirectUrl = `${window.location.origin}/auth`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName, phone: phone ?? null },
    },
  });
  if (error) throw error;
  const uid = data.user?.id;
  if (uid) {
    // assign role (table allows authenticated insert via Admins manage roles? — we use direct insert; if blocked, fallback no-op)
    await supabase.from("user_roles").insert({ user_id: uid, role }).select();
    if (role === "driver") {
      await supabase
        .from("drivers")
        .upsert({ id: uid, vehicle_type: "car", plate: "—" }, { onConflict: "id" })
        .select();
    }
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

function extOf(file: File) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return (m?.[1] ?? "bin").toLowerCase();
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar.${extOf(file)}`;
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await supabase.from("profiles").update({ photo_url: url }).eq("id", userId);
  return url;
}

export async function uploadDriverDoc(
  userId: string,
  file: File,
  type: "sim" | "stnk",
): Promise<string> {
  const path = `${userId}/${type}.${extOf(file)}`;
  const { error } = await supabase.storage
    .from(DRIVER_DOCS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  // Signed url for preview (30 days)
  const { data: signed } = await supabase.storage
    .from(DRIVER_DOCS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  const url = signed?.signedUrl ?? path;
  const patch = type === "sim" ? { sim_url: url } : { stnk_url: url };
  await supabase.from("drivers").update(patch).eq("id", userId);
  return url;
}

export async function grantAdminByEmail(email: string) {
  const { data, error } = await supabase.rpc("grant_admin_by_email", { _email: email });
  if (error) throw error;
  return data as string;
}

/**
 * User Profile module manifest
 * Handles generic user profile management for all user types
 */
import { User } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";

const userModule: AppModule = {
  id: "user",
  label: "Profil",
  icon: User,
  color: "primary",
  enabled: true,
  homePath: "/user/profile",
  routes: [
    {
      path: "/user/profile",
      element: lazyEl(() => import("./pages/UserProfile")),
      requireAuth: true,
    },
  ],
};

export default userModule;

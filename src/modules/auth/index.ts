/** Unified Auth module manifest. */
import { LogIn } from "lucide-react";
import type { AppModule } from "@/shared/moduleSystem";
import { lazyEl } from "@/shared/lazyEl";

const authModule: AppModule = {
  id: "auth",
  label: "Auth",
  icon: LogIn,
  color: "primary",
  enabled: true,
  homePath: "/auth",
  routes: [
    { path: "/auth", element: lazyEl(() => import("./pages/AuthPage")) },
    { path: "/reset-password", element: lazyEl(() => import("./pages/ResetPasswordPage")) },
  ],
};

export default authModule;

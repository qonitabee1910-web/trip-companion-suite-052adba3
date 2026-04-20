import { Plane, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeadBannerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "hero" | "compact";
  rightSlot?: ReactNode;
  showWordmark?: boolean;
  className?: string;
}

export const HeadBanner = ({
  title,
  subtitle,
  icon: Icon = Plane,
  variant = "hero",
  rightSlot,
  showWordmark = true,
  className,
}: HeadBannerProps) => {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-hero text-primary-foreground",
        isCompact ? "px-4 py-4 md:px-6 md:py-5" : "px-4 pt-4 pb-6 md:px-8 md:pt-8 md:pb-10",
        className,
      )}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative">
        {showWordmark && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-card">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-extrabold tracking-tight">PYU-GO</span>
            </div>
            {rightSlot}
          </div>
        )}

        <h1
          className={cn(
            "font-extrabold leading-tight",
            isCompact ? "text-lg md:text-xl" : "text-xl md:text-3xl",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "text-primary-foreground/85 mt-1",
              isCompact ? "text-xs md:text-sm" : "text-sm md:text-base max-w-xl",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

import { Plane, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { HeroBanner } from "@/shared/data/heroBanners";

interface HeadBannerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "hero" | "compact";
  rightSlot?: ReactNode;
  showWordmark?: boolean;
  className?: string;
  banners?: HeroBanner[];
  autoplayMs?: number;
}

export const HeadBanner = ({
  title,
  subtitle,
  icon: Icon = Plane,
  variant = "hero",
  rightSlot,
  showWordmark = true,
  className,
  banners,
  autoplayMs = 4500,
}: HeadBannerProps) => {
  const isCompact = variant === "compact";
  const hasCarousel = !isCompact && banners && banners.length > 0;

  // Carousel state
  const navigate = useNavigate();
  const autoplayRef = useRef(
    Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (hasCarousel) {
    return (
      <div className={cn("relative overflow-hidden bg-gradient-hero text-primary-foreground", className)}>
        {/* Top overlay header (wordmark + rightSlot) */}
        {showWordmark && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 md:px-8 md:pt-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-card">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-extrabold tracking-tight drop-shadow">PYU-GO</span>
            </div>
            {rightSlot}
          </div>
        )}

        <Carousel
          opts={{ loop: true, align: "start" }}
          plugins={[autoplayRef.current]}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {banners!.map((b) => (
              <CarouselItem key={b.id} className="pl-0 basis-full">
                <button
                  type="button"
                  onClick={() => b.href && navigate(b.href)}
                  className="relative block h-48 w-full overflow-hidden text-left md:h-72 lg:h-80"
                >
                  <img
                    src={b.image}
                    alt={b.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Dark gradient for legibility */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40"
                  />
                  {/* Text content bottom-left */}
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-8 md:px-8 md:pb-10">
                    {b.badge && (
                      <span className="inline-block rounded bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground md:text-xs">
                        {b.badge}
                      </span>
                    )}
                    <h2 className="mt-2 text-xl font-extrabold leading-tight text-white drop-shadow md:text-3xl">
                      {b.title}
                    </h2>
                    {b.subtitle && (
                      <p className="mt-1 max-w-md text-sm text-white/90 md:text-base">
                        {b.subtitle}
                      </p>
                    )}
                    {b.cta && (
                      <span className="mt-3 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-card md:text-sm">
                        {b.cta}
                      </span>
                    )}
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dots */}
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selected ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: original gradient layout (compact or hero without banners)
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-hero text-primary-foreground",
        isCompact ? "px-4 py-4 md:px-6 md:py-5" : "px-4 pt-4 pb-6 md:px-8 md:pt-8 md:pb-10",
        className,
      )}
    >
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

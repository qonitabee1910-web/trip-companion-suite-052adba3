import { useIsMobile } from "@/hooks/use-mobile";
import { WebHeader } from "./WebHeader";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileTitle?: string;
  mobileSubtitle?: string;
  mobileBack?: string;
  mobileHeaderVariant?: "primary" | "plain";
  mobileHeaderRight?: React.ReactNode;
  hideMobileHeader?: boolean;
  hideBottomNav?: boolean;
  hideWebHeader?: boolean;
}

export const ResponsiveLayout = ({
  children,
  mobileTitle = "PYU-GO",
  mobileSubtitle,
  mobileBack,
  mobileHeaderVariant,
  mobileHeaderRight,
  hideMobileHeader,
  hideBottomNav,
  hideWebHeader,
}: ResponsiveLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isMobile && !hideWebHeader && <WebHeader />}
      {isMobile && !hideMobileHeader && (
        <MobileHeader
          title={mobileTitle}
          subtitle={mobileSubtitle}
          back={mobileBack}
          variant={mobileHeaderVariant}
          right={mobileHeaderRight}
        />
      )}
      <main className={`flex-1 ${isMobile && !hideBottomNav ? "pb-16" : ""}`}>{children}</main>
      {isMobile && !hideBottomNav && <BottomNav />}
    </div>
  );
};

import React, { useMemo } from "react";
import { Users, Heart, Zap, Badge, ChevronRight, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import {
  getAllServiceTypes,
  userMeetsServiceRequirements,
  getPriceMultiplier,
  type ServiceTypeId,
} from "../types/serviceType";

interface ServiceTypeSelectorProps {
  selectedServiceType?: ServiceTypeId;
  onSelect: (serviceTypeId: ServiceTypeId) => void;
  userGender?: "male" | "female" | "other";
  className?: string;
}

/**
 * Component for selecting service type (Standard, Women, Premium)
 */
export const ServiceTypeSelector = React.forwardRef<
  HTMLDivElement,
  ServiceTypeSelectorProps
>(({ selectedServiceType = "standard", onSelect, userGender = "other", className = "" }, ref) => {
  const serviceTypes = getAllServiceTypes();

  // Check which service types the user can access
  const accessibleServices = useMemo(() => {
    return serviceTypes.map((service) => ({
      service,
      accessible: userMeetsServiceRequirements(service.id, userGender).meets,
      reason: userMeetsServiceRequirements(service.id, userGender).reason,
    }));
  }, [userGender]);

  const getServiceIcon = (icon: string) => {
    switch (icon) {
      case "women":
        return <Users className="h-6 w-6" />;
      case "car":
        return <Zap className="h-6 w-6" />;
      default:
        return <Heart className="h-6 w-6" />;
    }
  };

  return (
    <div ref={ref} className={`space-y-2 ${className}`}>
      {accessibleServices.map(({ service, accessible, reason }) => {
        const active = selectedServiceType === service.id;
        const multiplier = getPriceMultiplier(service.id);
        const priceIndicator =
          multiplier > 1.0
            ? `+${Math.round((multiplier - 1) * 100)}%`
            : "Standard";

        return (
          <div key={service.id}>
            <button
              onClick={() => {
                if (accessible) {
                  onSelect(service.id);
                }
              }}
              disabled={!accessible}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              } ${!accessible ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}`}
            >
              {/* Icon */}
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: service.bgColor, color: service.color }}
              >
                {getServiceIcon(service.icon)}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm">{service.name}</h3>
                  {service.badge && (
                    <BadgeUI
                      variant="secondary"
                      className="text-xs px-1.5 py-0"
                    >
                      {service.badge}
                    </BadgeUI>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-1">
                  {service.description}
                </p>

                {/* Features preview */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {service.features.slice(0, 2).map((feature, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                  {service.features.length > 2 && (
                    <span className="text-xs px-2 py-0.5 text-muted-foreground">
                      +{service.features.length - 2} lagi
                    </span>
                  )}
                </div>

                {/* Price indicator */}
                <div className="flex items-center gap-2">
                  <BadgeUI
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: service.color,
                      color: service.color,
                    }}
                  >
                    {priceIndicator}
                  </BadgeUI>

                  {service.id === "women" && (
                    <span className="text-xs text-purple-600 font-medium">
                      Keamanan Wanita
                    </span>
                  )}
                  {service.id === "car" && (
                    <span className="text-xs text-amber-600 font-medium">
                      Kemewahan
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              {accessible && (
                <ChevronRight
                  className={`h-5 w-5 flex-shrink-0 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              )}
            </button>

            {/* Access restriction message */}
            {!accessible && reason && (
              <div className="mt-1 p-2 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">{reason}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

ServiceTypeSelector.displayName = "ServiceTypeSelector";

/**
 * Service type information card
 */
export const ServiceTypeInfo = React.forwardRef<
  HTMLDivElement,
  { serviceTypeId: ServiceTypeId; className?: string }
>(({ serviceTypeId, className = "" }, ref) => {
  const serviceTypes = getAllServiceTypes();
  const service = serviceTypes.find((s) => s.id === serviceTypeId);

  if (!service) return null;

  return (
    <Card ref={ref} className={`p-3 space-y-2 ${className}`}>
      <div className="flex items-start gap-2">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: service.bgColor }}
        >
          {service.badge ? (
            <Badge className="text-xs">{service.badge.charAt(0)}</Badge>
          ) : null}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{service.name}</h4>
          <p className="text-xs text-muted-foreground">
            {service.longDescription}
          </p>
        </div>
      </div>

      {/* Features list */}
      <div className="pt-2 border-t">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">
          Fitur:
        </p>
        <ul className="space-y-1">
          {service.features.map((feature, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-1">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
});

ServiceTypeInfo.displayName = "ServiceTypeInfo";

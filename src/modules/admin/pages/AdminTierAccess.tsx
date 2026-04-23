import { useState, useEffect } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw, Grid3x3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getVehicleTierAccessMappings,
    saveVehicleTierMappings,
    getVehicleTypesAll,
    getServicesAll,
} from "@/modules/shuttle/data/repository";
import type { VehicleTierMapping, ServiceTier, VehicleTypeId } from "@/modules/shuttle/data/services";

/**
 * Admin Tier-Vehicle Access Control Page
 * Shows a matrix: vehicles × tiers with toggle controls.
 * Admin dapat centang vehicle mana boleh di tier mana.
 * Changes apply realtime di customer UI.
 */
const AdminTierAccess = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const vehicles = getVehicleTypesAll().filter((v) => v.active !== false);
    const services = getServicesAll().filter((s) => s.active !== false);
    const [mappings, setMappings] = useState<VehicleTierMapping[]>([]);

    useEffect(() => {
        const maps = getVehicleTierAccessMappings();
        setMappings(maps);
        setLoading(false);
    }, []);

    const toggleVehicleTier = (vehicleId: VehicleTypeId, tier: ServiceTier) => {
        setMappings((prev) => {
            const existing = prev.find((m) => m.vehicle_id === vehicleId && m.tier === tier);
            if (!existing) {
                // Create new mapping with allowed=true
                return [
                    ...prev,
                    {
                        id: `${vehicleId}_${tier}_${Date.now()}`,
                        vehicle_id: vehicleId,
                        tier,
                        allowed: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ];
            }
            // Toggle allowed status
            return prev.map((m) =>
                m.vehicle_id === vehicleId && m.tier === tier
                    ? { ...m, allowed: !m.allowed, updated_at: new Date().toISOString() }
                    : m,
            );
        });
    };

    const isAllowedForTier = (vehicleId: VehicleTypeId, tier: ServiceTier): boolean => {
        const mapping = mappings.find((m) => m.vehicle_id === vehicleId && m.tier === tier);
        return mapping?.allowed ?? true; // Default to allowed
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        const res = await saveVehicleTierMappings(mappings);
        setSaving(false);

        if (!res.ok) {
            if (res.error?.code === "42501") {
                toast({
                    title: "Akses ditolak",
                    description: "Login admin diperlukan untuk menyimpan tier access.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Gagal menyimpan",
                    description: res.error?.message ?? "Terjadi kesalahan.",
                    variant: "destructive",
                });
            }
            return;
        }

        toast({
            title: "Tier access disimpan",
            description: "Perubahan tersimpan ke cloud. UI customer update realtime.",
        });
    };

    const handleReset = () => {
        const original = getVehicleTierAccessMappings();
        setMappings(original);
        toast({ title: "Direset", description: "Kembali ke nilai terakhir yang disimpan." });
    };

    if (loading) {
        return (
            <AdminLayout title="Tier-Vehicle Access Control">
                <div className="space-y-4 max-w-6xl">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Tier-Vehicle Access Control">
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Info Card */}
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex gap-3">
                        <Grid3x3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-900">Tier-Vehicle Access Matrix</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Centang vehicle mana yang boleh digunakan untuk tier mana. Perubahan akan
                                terlihat real-time di customer UI. Gunakan untuk membatasi vehicle tertentu
                                ke tier spesifik saja.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Matrix Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                                    {services.map((svc) => (
                                        <th
                                            key={svc.tier}
                                            className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                                        >
                                            {svc.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="border-b hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium sticky left-0 bg-background z-10">
                                            <div>
                                                <p className="font-semibold">{vehicle.label}</p>
                                                <p className="text-xs text-muted-foreground">{vehicle.vehicleName}</p>
                                            </div>
                                        </td>
                                        {services.map((svc) => {
                                            const allowed = isAllowedForTier(vehicle.id, svc.tier);
                                            return (
                                                <td
                                                    key={`${vehicle.id}-${svc.tier}`}
                                                    className="px-4 py-3 text-center"
                                                >
                                                    <div className="flex justify-center">
                                                        <div className="flex items-center gap-3">
                                                            <Switch
                                                                checked={allowed}
                                                                onCheckedChange={() =>
                                                                    toggleVehicleTier(vehicle.id, svc.tier)
                                                                }
                                                                className="cursor-pointer"
                                                            />
                                                            <span className="text-xs font-medium w-12">
                                                                {allowed ? "✓ Allowed" : "✗ Blocked"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Stats Footer */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Total Vehicles</p>
                        <p className="text-2xl font-bold">{vehicles.length}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Service Tiers</p>
                        <p className="text-2xl font-bold">{services.length}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Combinations</p>
                        <p className="text-2xl font-bold">{vehicles.length * services.length}</p>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </Button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminTierAccess;

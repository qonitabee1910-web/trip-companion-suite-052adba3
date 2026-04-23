import { useState, useEffect } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    getAccessLogs,
    purgeAccessLogs,
    getVehicleTypesAll,
    getServicesAll,
} from "@/modules/shuttle/data/repository";
import type { VehicleAccessLog, VehicleTypeId, ServiceTier } from "@/modules/shuttle/data/services";

const AdminAccessLogs = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<VehicleAccessLog[]>([]);
    const [purging, setPurging] = useState(false);

    // Filters
    const [vehicleFilter, setVehicleFilter] = useState<VehicleTypeId | "all">("all");
    const [tierFilter, setTierFilter] = useState<ServiceTier | "all">("all");
    const [resultFilter, setResultFilter] = useState<"all" | "allowed" | "blocked" | "not_configured">("all");

    const vehicles = getVehicleTypesAll();
    const tiers = getServicesAll();

    useEffect(() => {
        const loadLogs = async () => {
            setLoading(true);
            const data = await getAccessLogs({
                vehicleId: vehicleFilter === "all" ? undefined : vehicleFilter,
                tier: tierFilter === "all" ? undefined : tierFilter,
                result: resultFilter === "all" ? undefined : resultFilter,
                limit: 100,
            });
            setLogs(data);
            setLoading(false);
        };

        loadLogs();
    }, [vehicleFilter, tierFilter, resultFilter]);

    const handlePurge = async (daysOld: number) => {
        setPurging(true);
        const res = await purgeAccessLogs(daysOld);
        setPurging(false);

        if (!res.ok) {
            toast({
                title: "Gagal purge logs",
                description: res.error?.message ?? "Terjadi kesalahan.",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Logs dipurge",
            description: `Log lebih dari ${daysOld} hari telah dihapus.`,
        });

        // Refresh logs
        const data = await getAccessLogs({
            vehicleId: vehicleFilter === "all" ? undefined : vehicleFilter,
            tier: tierFilter === "all" ? undefined : tierFilter,
            result: resultFilter === "all" ? undefined : resultFilter,
        });
        setLogs(data);
    };

    const getResultBadgeVariant = (result: string) => {
        switch (result) {
            case "allowed":
                return "outline";
            case "blocked":
                return "destructive";
            case "not_configured":
                return "secondary";
            default:
                return "outline";
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case "view":
                return "bg-blue-100 text-blue-800";
            case "book":
                return "bg-green-100 text-green-800";
            case "bypass_attempt":
                return "bg-orange-100 text-orange-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <AdminLayout title="Vehicle Access Logs">
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Info Card */}
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex gap-3">
                        <Eye className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-900">Access Monitoring</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Log setiap akses vehicle oleh customer. Gunakan untuk monitoring & debugging.
                                Logs otomatis di-purge setelah 90 hari.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Filters */}
                <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Vehicle</label>
                            <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vehicles</SelectItem>
                                    {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Service Tier</label>
                            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tiers</SelectItem>
                                    {tiers.map((t) => (
                                        <SelectItem key={t.tier} value={t.tier}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Result</label>
                            <Select
                                value={resultFilter}
                                onValueChange={(v) => setResultFilter(v as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Results</SelectItem>
                                    <SelectItem value="allowed">✓ Allowed</SelectItem>
                                    <SelectItem value="blocked">✗ Blocked</SelectItem>
                                    <SelectItem value="not_configured">? Not Configured</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="w-full flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Purge Old Logs
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Purge Logs</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Pilih berapa hari logs yang ingin dihapus.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Purge logs older than:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <AlertDialogAction
                                                onClick={() => handlePurge(30)}
                                                disabled={purging}
                                                className="bg-orange-600 hover:bg-orange-700"
                                            >
                                                {purging ? "Purging..." : "30 hari"}
                                            </AlertDialogAction>
                                            <AlertDialogAction
                                                onClick={() => handlePurge(60)}
                                                disabled={purging}
                                                className="bg-orange-600 hover:bg-orange-700"
                                            >
                                                {purging ? "Purging..." : "60 hari"}
                                            </AlertDialogAction>
                                            <AlertDialogAction
                                                onClick={() => handlePurge(90)}
                                                disabled={purging}
                                                className="bg-orange-600 hover:bg-orange-700"
                                            >
                                                {purging ? "Purging..." : "90 hari"}
                                            </AlertDialogAction>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        </div>
                                    </div>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </Card>

                {/* Logs Table */}
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Card className="overflow-hidden">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>Tidak ada logs dengan filter yang dipilih.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                                            <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                                            <th className="px-4 py-3 text-left font-semibold">Tier</th>
                                            <th className="px-4 py-3 text-left font-semibold">Action</th>
                                            <th className="px-4 py-3 text-left font-semibold">Result</th>
                                            <th className="px-4 py-3 text-left font-semibold">Reason</th>
                                            <th className="px-4 py-3 text-left font-semibold">User</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => {
                                            const vehicle = vehicles.find((v) => v.id === log.vehicle_id);
                                            const tier = tiers.find((t) => t.tier === log.tier);
                                            return (
                                                <tr key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(log.timestamp), "dd MMM HH:mm", {
                                                            locale: localeId,
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{vehicle?.label || log.vehicle_id}</td>
                                                    <td className="px-4 py-3">{tier?.label || log.tier}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={getActionBadge(log.action)}>
                                                            {log.action === "bypass_attempt"
                                                                ? "Bypass Attempt"
                                                                : log.action === "view"
                                                                    ? "View"
                                                                    : "Book"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={getResultBadgeVariant(log.result)}>
                                                            {log.result === "allowed"
                                                                ? "✓ Allowed"
                                                                : log.result === "blocked"
                                                                    ? "✗ Blocked"
                                                                    : "? Not Configured"}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{log.reason || "-"}</td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                                        {log.user_id ? log.user_id.slice(0, 8) + "..." : "Anonymous"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Total Logs</p>
                        <p className="text-2xl font-bold">{logs.length}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Allowed</p>
                        <p className="text-2xl font-bold text-green-600">
                            {logs.filter((l) => l.result === "allowed").length}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Blocked</p>
                        <p className="text-2xl font-bold text-red-600">
                            {logs.filter((l) => l.result === "blocked").length}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Not Configured</p>
                        <p className="text-2xl font-bold text-yellow-600">
                            {logs.filter((l) => l.result === "not_configured").length}
                        </p>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminAccessLogs;

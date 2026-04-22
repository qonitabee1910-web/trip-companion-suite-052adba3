import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, BarChart3, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    auditFareDifferences,
    getCalculationStats,
    debugRayonRouting,
    logFareCalculation,
} from "../../shuttle/lib/migrationHelper";
import { SEED_RAYONS_PYUGO } from "../../shuttle/data/rayons";
import { VEHICLE_TYPES, SERVICES } from "../../shuttle/data/services";

interface AuditResult {
    rayonId: string;
    rayonName: string;
    pickup: string;
    pickupName: string;
    legacyPrice: number;
    osrmPrice: number;
    difference: number;
    percentDiff: number;
    status: "ok" | "warning" | "error";
}

interface RayonDebugInfo {
    rayonId: string;
    totalPoints: number;
    pointsWithCoordinates: number;
    pointsWithRouting: number;
    lastSyncAge: string;
}

export function AdminFareAudit() {
    const [audits, setAudits] = useState<Record<string, AuditResult[]>>({});
    const [stats, setStats] = useState<any>(null);
    const [debugInfo, setDebugInfo] = useState<RayonDebugInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRayon, setSelectedRayon] = useState<string | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState("hiace");
    const [selectedService, setSelectedService] = useState("reguler");

    // Run audit for all rayons
    const runAudit = useCallback(async () => {
        setLoading(true);
        const newAudits: Record<string, AuditResult[]> = {};
        const debugResults: RayonDebugInfo[] = [];

        for (const rayon of SEED_RAYONS_PYUGO) {
            try {
                const vehicle = VEHICLE_TYPES.find((v) => v.id === selectedVehicle);
                const service = SERVICES.find((s) => s.tier === selectedService);

                if (!vehicle || !service) {
                    toast.error("Invalid vehicle or service selected");
                    continue;
                }

                const results = await auditFareDifferences(rayon.id, vehicle.id, service.tier);

                // Mark status based on difference
                const resultsWithStatus = results.map((row) => ({
                    ...row,
                    status: Math.abs(row.percentDiff) > 5 ? "warning" : Math.abs(row.percentDiff) > 10 ? "error" : "ok",
                }));

                newAudits[rayon.id] = resultsWithStatus;

                // Get debug info
                const debug = debugRayonRouting(rayon);
                debugResults.push({
                    rayonId: debug.rayonId,
                    totalPoints: debug.totalPoints,
                    pointsWithCoordinates: debug.pointsWithCoordinates,
                    pointsWithRouting: debug.pointsWithRouting,
                    lastSyncAge: debug.lastSyncAge,
                });
            } catch (error) {
                console.error(`Audit failed for ${rayon.id}:`, error);
                newAudits[rayon.id] = [];
            }
        }

        setAudits(newAudits);
        setDebugInfo(debugResults);
        setStats(getCalculationStats());
        setLoading(false);
        toast.success("Audit complete!");
    }, [selectedVehicle, selectedService]);

    // Export audit results to CSV
    const exportToCSV = useCallback(() => {
        const rows: string[] = [
            "Rayon,Pickup,Pickup Name,Legacy Price,OSRM Price,Difference,Percent Diff,Status",
        ];

        Object.entries(audits).forEach(([rayonId, results]) => {
            results.forEach((row) => {
                rows.push(
                    `"${rayonId}","${row.pickupCode}","${row.pickupName}",${row.legacyPrice},${row.osrmPrice},${row.difference.toFixed(0)},${row.percentDiff.toFixed(2)}%,"${row.status}"`
                );
            });
        });

        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fare-audit-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("CSV exported!");
    }, [audits]);

    // Calculate overall statistics
    const allResults = Object.values(audits).flat();
    const totalAudited = allResults.length;
    const okCount = allResults.filter((r) => r.status === "ok").length;
    const warningCount = allResults.filter((r) => r.status === "warning").length;
    const errorCount = allResults.filter((r) => r.status === "error").length;
    const avgDiff =
        totalAudited > 0
            ? (allResults.reduce((sum, r) => sum + Math.abs(r.percentDiff), 0) / totalAudited).toFixed(2)
            : "0.00";

    return (
        <div className="p-6 space-y-6 bg-white">
            <div>
                <h1 className="text-3xl font-bold mb-2">Fare Calculation Audit</h1>
                <p className="text-muted-foreground">
                    Compare legacy hardcoded fares with OSRM-based fares. Verify accuracy and identify discrepancies.
                </p>
            </div>

            {/* Configuration Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Audit Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Vehicle Type</label>
                            <select
                                value={selectedVehicle}
                                onChange={(e) => setSelectedVehicle(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                            >
                                {VEHICLE_TYPES.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.label} - {v.vehicleName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Service Tier</label>
                            <select
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                            >
                                {SERVICES.map((s) => (
                                    <option key={s.tier} value={s.tier}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button
                                onClick={runAudit}
                                disabled={loading}
                                className="flex-1"
                                size="sm"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Run Audit
                                    </>
                                )}
                            </Button>
                            {totalAudited > 0 && (
                                <Button
                                    onClick={exportToCSV}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            {stats && (
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            OSRM Integration Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <div className="text-3xl font-bold text-blue-600">{stats.osrmPercentage.toFixed(1)}%</div>
                                <div className="text-xs text-muted-foreground">OSRM + Cached</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total Calculations</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-green-600">{stats.osrmCount}</div>
                                <div className="text-xs text-muted-foreground">Fresh OSRM</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-blue-600">{stats.cachedCount}</div>
                                <div className="text-xs text-muted-foreground">From Cache</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-yellow-600">{stats.fallbackCount}</div>
                                <div className="text-xs text-muted-foreground">Fallback</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Audit Results */}
            {totalAudited > 0 && (
                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="debug">Debug Info</TabsTrigger>
                    </TabsList>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Audit Results Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Status Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="bg-green-50 border-green-200">
                                            <CardContent className="pt-6">
                                                <div className="text-3xl font-bold text-green-600">{okCount}</div>
                                                <div className="text-xs text-muted-foreground">Good (<5%)</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-yellow-50 border-yellow-200">
                                            <CardContent className="pt-6">
                                                <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                                                <div className="text-xs text-muted-foreground">Warning (5-10%)</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-red-50 border-red-200">
                                            <CardContent className="pt-6">
                                                <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                                                <div className="text-xs text-muted-foreground">Error (>10%)</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-3xl font-bold">{avgDiff}%</div>
                                                <div className="text-xs text-muted-foreground">Avg Difference</div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Pass/Fail Status */}
                                    {errorCount === 0 ? (
                                        <Alert className="bg-green-50 border-green-200">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-700">
                                                ✓ Audit passed! All fares within acceptable range (<5% error).
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Alert className="bg-red-50 border-red-200">
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-700">
                                                ✗ Audit found {errorCount} discrepancies. Check details below.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Summary by Rayon */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Results by Rayon</h3>
                                        <div className="space-y-2">
                                            {Object.entries(audits).map(([rayonId, results]) => {
                                                const rayonOk = results.filter((r) => r.status === "ok").length;
                                                const rayonWarning = results.filter((r) => r.status === "warning").length;
                                                const rayonError = results.filter((r) => r.status === "error").length;

                                                return (
                                                    <div
                                                        key={rayonId}
                                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedRayon(rayonId);
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="font-medium">{rayonId}</div>
                                                            <div className="text-xs text-muted-foreground">{results.length} stops</div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {rayonOk > 0 && <Badge variant="outline" className="bg-green-50">✓ {rayonOk}</Badge>}
                                                            {rayonWarning > 0 && <Badge variant="outline" className="bg-yellow-50">⚠ {rayonWarning}</Badge>}
                                                            {rayonError > 0 && <Badge variant="outline" className="bg-red-50">✗ {rayonError}</Badge>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-4">
                        {Object.entries(audits).map(([rayonId, results]) => (
                            <Card key={rayonId} className={selectedRayon === rayonId ? "ring-2 ring-blue-500" : ""}>
                                <CardHeader className="cursor-pointer" onClick={() => setSelectedRayon(rayonId)}>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        {rayonId}
                                        <Badge variant="outline">{results.length} stops</Badge>
                                    </CardTitle>
                                </CardHeader>
                                {(!selectedRayon || selectedRayon === rayonId) && (
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="border-b bg-muted/50">
                                                    <tr>
                                                        <th className="text-left py-2 px-2">Pickup</th>
                                                        <th className="text-right py-2 px-2">Legacy</th>
                                                        <th className="text-right py-2 px-2">OSRM</th>
                                                        <th className="text-right py-2 px-2">Diff Rp</th>
                                                        <th className="text-right py-2 px-2">Diff %</th>
                                                        <th className="text-center py-2 px-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {results.map((row) => (
                                                        <tr
                                                            key={row.pickupCode}
                                                            className={`border-b hover:bg-muted/50 ${row.status === "error"
                                                                    ? "bg-red-50"
                                                                    : row.status === "warning"
                                                                        ? "bg-yellow-50"
                                                                        : ""
                                                                }`}
                                                        >
                                                            <td className="py-2 px-2">
                                                                <div className="font-medium">{row.pickupCode}</div>
                                                                <div className="text-xs text-muted-foreground">{row.pickupName}</div>
                                                            </td>
                                                            <td className="text-right py-2 px-2 font-mono">
                                                                Rp{row.legacyPrice.toLocaleString("id-ID")}
                                                            </td>
                                                            <td className="text-right py-2 px-2 font-mono">
                                                                Rp{row.osrmPrice.toLocaleString("id-ID")}
                                                            </td>
                                                            <td className="text-right py-2 px-2 font-mono">
                                                                {row.difference > 0 ? "+" : ""}
                                                                Rp{row.difference.toLocaleString("id-ID")}
                                                            </td>
                                                            <td
                                                                className={`text-right py-2 px-2 font-semibold ${row.status === "error"
                                                                        ? "text-red-600"
                                                                        : row.status === "warning"
                                                                            ? "text-yellow-600"
                                                                            : "text-green-600"
                                                                    }`}
                                                            >
                                                                {row.percentDiff > 0 ? "+" : ""}
                                                                {row.percentDiff.toFixed(2)}%
                                                            </td>
                                                            <td className="text-center py-2 px-2">
                                                                <Badge
                                                                    variant={
                                                                        row.status === "error" ? "destructive" : row.status === "warning" ? "secondary" : "outline"
                                                                    }
                                                                >
                                                                    {row.status === "ok" && "✓"}
                                                                    {row.status === "warning" && "⚠"}
                                                                    {row.status === "error" && "✗"}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </TabsContent>

                    {/* Debug Info Tab */}
                    <TabsContent value="debug" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Rayon Routing Data Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {debugInfo.map((info) => {
                                        const coordPercent = ((info.pointsWithCoordinates / info.totalPoints) * 100).toFixed(0);
                                        const routingPercent = ((info.pointsWithRouting / info.totalPoints) * 100).toFixed(0);

                                        return (
                                            <Card key={info.rayonId} className="bg-gray-50">
                                                <CardContent className="pt-6">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">{info.rayonId}</span>
                                                            <span className="text-sm text-muted-foreground">{info.lastSyncAge}</span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <div className="text-xs text-muted-foreground mb-1">
                                                                    Coordinates: {info.pointsWithCoordinates}/{info.totalPoints} ({coordPercent}%)
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="bg-blue-600 h-2 rounded-full"
                                                                        style={{ width: `${coordPercent}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="text-xs text-muted-foreground mb-1">
                                                                    Routing Data: {info.pointsWithRouting}/{info.totalPoints} ({routingPercent}%)
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className={`h-2 rounded-full ${routingPercent === "100" ? "bg-green-600" : routingPercent === "0" ? "bg-red-600" : "bg-yellow-600"
                                                                            }`}
                                                                        style={{ width: `${routingPercent}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {/* No Results Message */}
            {totalAudited === 0 && !loading && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                            <AlertCircle className="h-8 w-8 text-blue-600 mx-auto" />
                            <p className="text-sm text-muted-foreground">Click "Run Audit" above to start testing.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default AdminFareAudit;

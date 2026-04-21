import { useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid, isToday, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AdminLayout } from "../components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import {
    DollarSign,
    MapPin,
    Users,
    TrendingUp,
    Eye,
    Trash2,
    CheckCircle2,
    Clock,
    AlertTriangle,
    MapPinOff,
    Navigation,
} from "lucide-react";
import { getRideById, getAllRides, updateRideStatus, cancelRide } from "@/modules/ride/services/rideService";
import type { RideRequest, RideStatus } from "@/modules/ride/services/rideService";
import { useToast } from "@/hooks/use-toast";
import { RideDetailModal } from "../components/RideDetailModal";
import { getRideIcon } from "@/modules/ride/data/ride";

const statusColor: Record<RideStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    accepted: "bg-blue-100 text-blue-800 border-blue-300",
    arriving: "bg-cyan-100 text-cyan-800 border-cyan-300",
    in_progress: "bg-purple-100 text-purple-800 border-purple-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    rejected: "bg-orange-100 text-orange-800 border-orange-300",
};

const statusLabel: Record<RideStatus, string> = {
    pending: "Menunggu",
    accepted: "Diterima",
    arriving: "Dalam Perjalanan",
    in_progress: "Sedang Berjalan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    rejected: "Ditolak",
};

const serviceTypeColor: Record<string, string> = {
    standard: "bg-blue-100 text-blue-800",
    women: "bg-purple-100 text-purple-800",
    car: "bg-amber-100 text-amber-800",
};

const serviceTypeLabel: Record<string, string> = {
    standard: "Standard",
    women: "Wanita",
    car: "Premium",
};

export const AdminRides = () => {
    const { toast } = useToast();
    const [rides, setRides] = useState<RideRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [serviceFilter, setServiceFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [newStatus, setNewStatus] = useState<RideStatus>("accepted");
    const [rideToUpdate, setRideToUpdate] = useState<RideRequest | null>(null);

    // Fetch all rides on mount
    useEffect(() => {
        const fetchRides = async () => {
            setLoading(true);
            try {
                const allRides = await getAllRides();
                setRides(allRides || []);
            } catch (error) {
                console.error("Error fetching rides:", error);
                toast({
                    title: "Error",
                    description: "Gagal memuat data rides",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchRides();
    }, []);

    // Filter rides based on criteria
    const filteredRides = useMemo(() => {
        return rides.filter((ride) => {
            // Status filter
            if (statusFilter !== "all" && ride.status !== statusFilter) {
                return false;
            }

            // Service type filter
            if (serviceFilter !== "all" && ride.service_type !== serviceFilter) {
                return false;
            }

            // Date filter
            if (dateFilter) {
                const rideDate = parseISO(ride.requested_at);
                const filterDate = parseISO(dateFilter);
                if (!isValid(rideDate) || !isValid(filterDate)) return true;

                const rideDateStart = startOfDay(rideDate);
                const rideDateEnd = endOfDay(rideDate);
                const filterDateStart = startOfDay(filterDate);
                const filterDateEnd = endOfDay(filterDate);

                if (
                    !isAfter(filterDateStart, rideDateStart) ||
                    !isBefore(filterDateEnd, rideDateEnd)
                ) {
                    return false;
                }
            }

            // Search query (pickup, destination, rider ID)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return (
                    ride.pickup_name.toLowerCase().includes(query) ||
                    ride.dest_name.toLowerCase().includes(query) ||
                    ride.rider_id.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [rides, statusFilter, serviceFilter, dateFilter, searchQuery]);

    // Calculate statistics
    const stats = useMemo(() => {
        const todaysRides = rides.filter((r) => {
            const d = parseISO(r.requested_at);
            return isValid(d) && isToday(d);
        });

        const completedToday = todaysRides.filter((r) => r.status === "completed");
        const revenue = completedToday.reduce((sum, r) => sum + r.fare, 0);
        const avgFare = completedToday.length > 0 ? revenue / completedToday.length : 0;
        const activeRides = rides.filter((r) => ["pending", "accepted", "arriving", "in_progress"].includes(r.status));

        return {
            todayCount: todaysRides.length,
            completedToday: completedToday.length,
            revenue,
            avgFare,
            activeRides: activeRides.length,
            totalRides: rides.length,
        };
    }, [rides]);

    const handleStatusUpdate = async () => {
        if (!rideToUpdate) return;

        try {
            const success = await updateRideStatus(rideToUpdate.id, newStatus);
            if (success) {
                setRides((prev) =>
                    prev.map((r) =>
                        r.id === rideToUpdate.id ? { ...r, status: newStatus } : r
                    )
                );
                setShowStatusDialog(false);
                setRideToUpdate(null);
                toast({
                    title: "Sukses",
                    description: `Status ride diperbarui menjadi ${statusLabel[newStatus]}`,
                });
            } else {
                toast({
                    title: "Error",
                    description: "Gagal memperbarui status ride",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating ride status:", error);
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat memperbarui status",
                variant: "destructive",
            });
        }
    };

    const handleCancelRide = async (rideId: string) => {
        try {
            const success = await cancelRide(rideId);
            if (success) {
                setRides((prev) =>
                    prev.map((r) =>
                        r.id === rideId ? { ...r, status: "cancelled" } : r
                    )
                );
                toast({
                    title: "Sukses",
                    description: "Ride dibatalkan",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Gagal membatalkan ride",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error cancelling ride:", error);
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat membatalkan ride",
                variant: "destructive",
            });
        }
    };

    const cards = [
        {
            label: "Ride Hari Ini",
            value: stats.todayCount,
            icon: Navigation,
            color: "text-blue-600",
        },
        {
            label: "Selesai Hari Ini",
            value: stats.completedToday,
            icon: CheckCircle2,
            color: "text-green-600",
        },
        {
            label: "Revenue Hari Ini",
            value: `Rp${stats.revenue.toLocaleString("id-ID")}`,
            icon: DollarSign,
            color: "text-success",
        },
        {
            label: "Avg Fare",
            value: `Rp${Math.round(stats.avgFare).toLocaleString("id-ID")}`,
            icon: TrendingUp,
            color: "text-amber-600",
        },
        {
            label: "Ride Aktif",
            value: stats.activeRides,
            icon: Clock,
            color: "text-orange-600",
        },
    ];

    return (
        <AdminLayout title="Manajemen Ride" description="Kelola semua ride on-demand">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <Card key={idx} className="p-4 flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                                <p className="text-lg font-bold mt-1">{card.value}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6 space-y-4">
                <div className="flex flex-wrap gap-3">
                    <Input
                        placeholder="Cari pickup, destination, atau rider ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 min-w-[200px]"
                    />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="pending">Menunggu</SelectItem>
                            <SelectItem value="accepted">Diterima</SelectItem>
                            <SelectItem value="arriving">Dalam Perjalanan</SelectItem>
                            <SelectItem value="in_progress">Sedang Berjalan</SelectItem>
                            <SelectItem value="completed">Selesai</SelectItem>
                            <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={serviceFilter} onValueChange={setServiceFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Service</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="women">Wanita</SelectItem>
                            <SelectItem value="car">Premium</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-[150px]"
                    />
                </div>
            </Card>

            {/* Rides Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>ID Ride</TableHead>
                                <TableHead>Pickup</TableHead>
                                <TableHead>Destination</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Tipe Ride</TableHead>
                                <TableHead>Fare</TableHead>
                                <TableHead>Jarak</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Request</TableHead>
                                <TableHead>Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : filteredRides.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        Tidak ada data ride
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRides.map((ride) => (
                                    <TableRow key={ride.id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            {ride.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell className="max-w-[120px] truncate">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                                <span>{ride.pickup_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[120px] truncate">
                                            <div className="flex items-center gap-2">
                                                <MapPinOff className="h-3 w-3 text-orange-600 flex-shrink-0" />
                                                <span>{ride.dest_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={serviceTypeColor[ride.service_type]}>
                                                {serviceTypeLabel[ride.service_type] || ride.service_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{ride.ride_type}</Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            Rp{ride.fare.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell>{ride.distance_km.toFixed(1)} km</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={statusColor[ride.status]}
                                                variant="outline"
                                            >
                                                {statusLabel[ride.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {isValid(parseISO(ride.requested_at))
                                                ? format(parseISO(ride.requested_at), "dd MMM HH:mm", {
                                                    locale: localeId,
                                                })
                                                : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedRide(ride);
                                                        setShowDetailModal(true);
                                                    }}
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>

                                                {ride.status !== "completed" && ride.status !== "cancelled" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setRideToUpdate(ride);
                                                            setNewStatus("accepted");
                                                            setShowStatusDialog(true);
                                                        }}
                                                    >
                                                        Update
                                                    </Button>
                                                )}

                                                {ride.status !== "completed" && ride.status !== "cancelled" && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                title="Batalkan Ride"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Batalkan Ride?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tindakan ini tidak bisa dibatalkan. Pengemudi dan pengguna akan
                                                                    diberitahu tentang pembatalan.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleCancelRide(ride.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Batalkan Ride
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {filteredRides.length > 0 && (
                    <div className="px-6 py-4 border-t bg-muted/50 text-sm text-muted-foreground">
                        Menampilkan {filteredRides.length} dari {rides.length} rides
                    </div>
                )}
            </Card>

            {/* Status Update Dialog */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Status Ride</DialogTitle>
                        <DialogDescription>
                            Ubah status ride untuk {rideToUpdate?.id.slice(0, 8)}...
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status Baru</label>
                            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as RideStatus)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Menunggu</SelectItem>
                                    <SelectItem value="accepted">Diterima</SelectItem>
                                    <SelectItem value="arriving">Dalam Perjalanan</SelectItem>
                                    <SelectItem value="in_progress">Sedang Berjalan</SelectItem>
                                    <SelectItem value="completed">Selesai</SelectItem>
                                    <SelectItem value="rejected">Ditolak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatusDialog(false)}
                        >
                            Batal
                        </Button>
                        <Button onClick={handleStatusUpdate}>
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ride Detail Modal */}
            {selectedRide && (
                <RideDetailModal
                    open={showDetailModal}
                    onOpenChange={setShowDetailModal}
                    ride={selectedRide}
                />
            )}
        </AdminLayout>
    );
};

export default AdminRides;

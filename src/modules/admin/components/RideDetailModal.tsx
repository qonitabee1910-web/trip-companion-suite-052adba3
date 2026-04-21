import React from "react";
import { format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Users, Navigation, MapPinOff, Gauge } from "lucide-react";
import type { RideRequest } from "@/modules/ride/services/rideService";
import { getRideIcon } from "@/modules/ride/data/ride";

const statusLabel: Record<string, string> = {
    pending: "Menunggu",
    accepted: "Diterima",
    arriving: "Dalam Perjalanan",
    in_progress: "Sedang Berjalan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    rejected: "Ditolak",
};

const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    arriving: "bg-cyan-100 text-cyan-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-orange-100 text-orange-800",
};

const serviceTypeLabel: Record<string, string> = {
    standard: "Ride Standard",
    women: "Ride Women",
    car: "Ride Car Premium",
};

const serviceTypeColor: Record<string, string> = {
    standard: "bg-blue-100 text-blue-800",
    women: "bg-purple-100 text-purple-800",
    car: "bg-amber-100 text-amber-800",
};

interface RideDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ride: RideRequest;
}

export const RideDetailModal = React.forwardRef<
    HTMLDivElement,
    RideDetailModalProps
>(({ open, onOpenChange, ride }, ref) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent ref={ref} className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detail Ride</DialogTitle>
                    <DialogDescription>
                        Informasi lengkap untuk ride #{ride.id.slice(0, 8)}...
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {/* Status & Service Type */}
                    <Card className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={statusColor[ride.status]}>
                                {statusLabel[ride.status]}
                            </Badge>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Jenis Layanan</p>
                            <Badge className={serviceTypeColor[ride.service_type]}>
                                {serviceTypeLabel[ride.service_type] || ride.service_type}
                            </Badge>
                        </div>
                    </Card>

                    {/* Route Information */}
                    <Card className="p-4 space-y-3">
                        <p className="font-semibold text-sm mb-3">Informasi Rute</p>

                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Jemput Di</p>
                                <p className="font-medium">{ride.pickup_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    Lat: {ride.pickup_lat.toFixed(4)}, Lng: {ride.pickup_lng.toFixed(4)}
                                </p>
                            </div>
                        </div>

                        <div className="h-8 ml-2.5 border-l-2 border-dashed border-muted-foreground" />

                        <div className="flex items-start gap-3">
                            <MapPinOff className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Tujuan</p>
                                <p className="font-medium">{ride.dest_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    Lat: {ride.dest_lat.toFixed(4)}, Lng: {ride.dest_lng.toFixed(4)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Ride Details */}
                    <Card className="p-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Tipe Ride</p>
                            <p className="font-medium text-lg">
                                {getRideIcon(ride.ride_type)} {ride.ride_type.toUpperCase()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jarak</p>
                            <p className="font-medium text-lg">{ride.distance_km.toFixed(2)} km</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tarif</p>
                            <p className="font-bold text-lg text-success">
                                Rp{ride.fare.toLocaleString("id-ID")}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">ID Penumpang</p>
                            <p className="font-mono text-xs">{ride.rider_id.slice(0, 12)}...</p>
                        </div>
                    </Card>

                    {/* Driver Information */}
                    {ride.driver_id && (
                        <Card className="p-4">
                            <p className="font-semibold text-sm mb-2">Driver</p>
                            <p className="text-sm text-muted-foreground">
                                ID Driver: <span className="font-mono">{ride.driver_id.slice(0, 12)}...</span>
                            </p>
                        </Card>
                    )}

                    {/* Timeline */}
                    <Card className="p-4 space-y-3">
                        <p className="font-semibold text-sm">Timeline</p>

                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Waktu Request</p>
                                    <p className="text-sm">
                                        {isValid(parseISO(ride.requested_at))
                                            ? format(parseISO(ride.requested_at), "dd MMMM yyyy HH:mm:ss", {
                                                locale: localeId,
                                            })
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>

                            {ride.accepted_at && isValid(parseISO(ride.accepted_at)) && (
                                <div className="flex items-start gap-3">
                                    <Clock className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Waktu Diterima</p>
                                        <p className="text-sm">
                                            {format(parseISO(ride.accepted_at), "dd MMMM yyyy HH:mm:ss", {
                                                locale: localeId,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {ride.started_at && isValid(parseISO(ride.started_at)) && (
                                <div className="flex items-start gap-3">
                                    <Clock className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Waktu Mulai</p>
                                        <p className="text-sm">
                                            {format(parseISO(ride.started_at), "dd MMMM yyyy HH:mm:ss", {
                                                locale: localeId,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {ride.completed_at && isValid(parseISO(ride.completed_at)) && (
                                <div className="flex items-start gap-3">
                                    <Clock className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Waktu Selesai</p>
                                        <p className="text-sm">
                                            {format(parseISO(ride.completed_at), "dd MMMM yyyy HH:mm:ss", {
                                                locale: localeId,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Additional Info */}
                    <Card className="p-4 space-y-2">
                        <p className="font-semibold text-sm">Informasi Tambahan</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Ride ID</p>
                                <p className="font-mono text-xs">{ride.id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="capitalize">{ride.status}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
});

RideDetailModal.displayName = "RideDetailModal";

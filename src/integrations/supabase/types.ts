export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      depart_times: {
        Row: {
          id: string
          sort_order: number
          time: string
        }
        Insert: {
          id?: string
          sort_order?: number
          time: string
        }
        Update: {
          id?: string
          sort_order?: number
          time?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: number
          lat: number
          lng: number
          recorded_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: number
          lat: number
          lng: number
          recorded_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          current_lat: number | null
          current_lng: number | null
          id: string
          is_online: boolean
          plate: string | null
          rating: number
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          current_lat?: number | null
          current_lng?: number | null
          id: string
          is_online?: boolean
          plate?: string | null
          rating?: number
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_online?: boolean
          plate?: string | null
          rating?: number
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          check_in: string
          check_out: string
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          guests: number
          hotel_id: string
          hotel_name: string
          id: string
          room_name: string
          room_type_id: string | null
          rooms: number
          status: string
          total_price: number
        }
        Insert: {
          check_in: string
          check_out: string
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          guests?: number
          hotel_id: string
          hotel_name: string
          id?: string
          room_name: string
          room_type_id?: string | null
          rooms?: number
          status?: string
          total_price?: number
        }
        Update: {
          check_in?: string
          check_out?: string
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          guests?: number
          hotel_id?: string
          hotel_name?: string
          id?: string
          room_name?: string
          room_type_id?: string | null
          rooms?: number
          status?: string
          total_price?: number
        }
        Relationships: []
      }
      hotels: {
        Row: {
          active: boolean
          address: string
          amenities: string[]
          city: string
          created_at: string
          description: string
          id: string
          images: string[]
          lat: number
          lng: number
          name: string
          original_price: number | null
          price_per_night: number
          rating: number
          review_count: number
          sort_order: number
          stars: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          amenities?: string[]
          city: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          lat?: number
          lng?: number
          name: string
          original_price?: number | null
          price_per_night?: number
          rating?: number
          review_count?: number
          sort_order?: number
          stars?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          amenities?: string[]
          city?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          lat?: number
          lng?: number
          name?: string
          original_price?: number | null
          price_per_night?: number
          rating?: number
          review_count?: number
          sort_order?: number
          stars?: number
          updated_at?: string
        }
        Relationships: []
      }
      pickup_points: {
        Row: {
          code: string
          created_at: string
          distance_to_next: number
          id: string
          lat: number | null
          lng: number | null
          name: string
          rayon_id: string
          sort_order: number
          time: string
        }
        Insert: {
          code: string
          created_at?: string
          distance_to_next?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          rayon_id: string
          sort_order?: number
          time?: string
        }
        Update: {
          code?: string
          created_at?: string
          distance_to_next?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          rayon_id?: string
          sort_order?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_points_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "rayons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rayons: {
        Row: {
          active: boolean
          area: string
          color: string
          created_at: string
          estimate_min: number
          fare_per_km: number
          id: string
          name: string
          per_pickup_fare: boolean
          sort_order: number
          surcharge: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          color?: string
          created_at?: string
          estimate_min?: number
          fare_per_km?: number
          id: string
          name: string
          per_pickup_fare?: boolean
          sort_order?: number
          surcharge?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          color?: string
          created_at?: string
          estimate_min?: number
          fare_per_km?: number
          id?: string
          name?: string
          per_pickup_fare?: boolean
          sort_order?: number
          surcharge?: number
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          dest_lat: number
          dest_lng: number
          dest_name: string
          distance_km: number
          driver_id: string | null
          fare: number
          id: string
          pickup_lat: number
          pickup_lng: number
          pickup_name: string
          requested_at: string
          ride_type: string
          rider_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          dest_lat: number
          dest_lng: number
          dest_name: string
          distance_km?: number
          driver_id?: string | null
          fare?: number
          id?: string
          pickup_lat: number
          pickup_lng: number
          pickup_name: string
          requested_at?: string
          ride_type?: string
          rider_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          dest_lat?: number
          dest_lng?: number
          dest_name?: string
          distance_km?: number
          driver_id?: string | null
          fare?: number
          id?: string
          pickup_lat?: number
          pickup_lng?: number
          pickup_name?: string
          requested_at?: string
          ride_type?: string
          rider_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          bed: string
          breakfast: boolean
          capacity: number
          hotel_id: string
          id: string
          name: string
          price: number
          refundable: boolean
          sort_order: number
        }
        Insert: {
          bed?: string
          breakfast?: boolean
          capacity?: number
          hotel_id: string
          id?: string
          name: string
          price?: number
          refundable?: boolean
          sort_order?: number
        }
        Update: {
          bed?: string
          breakfast?: boolean
          capacity?: number
          hotel_id?: string
          id?: string
          name?: string
          price?: number
          refundable?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_blocks: {
        Row: {
          created_at: string
          date: string
          id: string
          rayon_id: string
          reason: string | null
          seat_number: number
          tier: string
          time: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          rayon_id: string
          reason?: string | null
          seat_number: number
          tier: string
          time: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          rayon_id?: string
          reason?: string | null
          seat_number?: number
          tier?: string
          time?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      seat_layouts: {
        Row: {
          capacity: number
          id: string
          layout: Json
          tier: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          capacity?: number
          id?: string
          layout: Json
          tier: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          capacity?: number
          id?: string
          layout?: Json
          tier?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          description: string
          features: string[]
          label: string
          price_multiplier: number
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          description?: string
          features?: string[]
          label: string
          price_multiplier?: number
          sort_order?: number
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          description?: string
          features?: string[]
          label?: string
          price_multiplier?: number
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      shuttle_bookings: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          date: string
          id: string
          pax: number
          pickup: string
          rayon_id: string
          rayon_name: string
          seats: number[]
          service_label: string
          service_tier: string
          status: string
          time: string
          total_price: number
          unit_price: number
          vehicle_id: string
          vehicle_label: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          date: string
          id?: string
          pax?: number
          pickup: string
          rayon_id: string
          rayon_name: string
          seats?: number[]
          service_label: string
          service_tier: string
          status?: string
          time: string
          total_price?: number
          unit_price?: number
          vehicle_id: string
          vehicle_label: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          date?: string
          id?: string
          pax?: number
          pickup?: string
          rayon_id?: string
          rayon_name?: string
          seats?: number[]
          service_label?: string
          service_tier?: string
          status?: string
          time?: string
          total_price?: number
          unit_price?: number
          vehicle_id?: string
          vehicle_label?: string
        }
        Relationships: []
      }
      shuttle_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      shuttle_trips: {
        Row: {
          created_at: string
          current_pickup_index: number
          depart_at: string
          driver_id: string | null
          id: string
          rayon_id: string
          service_tier: string
          status: Database["public"]["Enums"]["shuttle_trip_status"]
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          current_pickup_index?: number
          depart_at: string
          driver_id?: string | null
          id?: string
          rayon_id: string
          service_tier?: string
          status?: Database["public"]["Enums"]["shuttle_trip_status"]
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          current_pickup_index?: number
          depart_at?: string
          driver_id?: string | null
          id?: string
          rayon_id?: string
          service_tier?: string
          status?: Database["public"]["Enums"]["shuttle_trip_status"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_types: {
        Row: {
          active: boolean
          description: string
          id: string
          label: string
          sort_order: number
          tier_prices: Json
          updated_at: string
          vehicle_name: string
        }
        Insert: {
          active?: boolean
          description?: string
          id: string
          label: string
          sort_order?: number
          tier_prices?: Json
          updated_at?: string
          vehicle_name: string
        }
        Update: {
          active?: boolean
          description?: string
          id?: string
          label?: string
          sort_order?: number
          tier_prices?: Json
          updated_at?: string
          vehicle_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_admin_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "rider"
      ride_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "arriving"
        | "in_progress"
        | "completed"
        | "cancelled"
      shuttle_trip_status:
        | "scheduled"
        | "boarding"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver", "rider"],
      ride_status: [
        "pending",
        "accepted",
        "rejected",
        "arriving",
        "in_progress",
        "completed",
        "cancelled",
      ],
      shuttle_trip_status: [
        "scheduled",
        "boarding",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

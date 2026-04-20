import { QrCode, CreditCard, Wallet, Building2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethodMeta, PaymentMethodId } from "../data/payment";

const groupIcon = {
  qris: QrCode,
  va: Building2,
  ewallet: Wallet,
  card: CreditCard,
  bank: Landmark,
} as const;

const groupLabel = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
  card: "Kartu",
  bank: "Bank",
} as const;

interface Props {
  methods: PaymentMethodMeta[];
  selected: PaymentMethodId | null;
  onSelect: (id: PaymentMethodId) => void;
}

export function PaymentMethodPicker({ methods, selected, onSelect }: Props) {
  // Group by category
  const grouped = methods.reduce<Record<string, PaymentMethodMeta[]>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  if (methods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Belum ada metode pembayaran aktif. Hubungi admin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {(Object.keys(grouped) as Array<keyof typeof groupIcon>).map((g) => {
        const Icon = groupIcon[g];
        return (
          <div key={g}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {groupLabel[g]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {grouped[g].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    "hover:border-primary hover:bg-primary/5",
                    selected === m.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-card",
                  )}
                >
                  <div className="font-medium">{m.label}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  online: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export const OnlineToggle = ({ online, onChange, disabled }: Props) => (
  <div
    className={cn(
      "flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm",
      online ? "border-primary/50" : "border-border",
    )}
  >
    <div>
      <div className="text-base font-semibold">{online ? "Anda Online" : "Anda Offline"}</div>
      <div className="text-sm text-muted-foreground">
        {online ? "Menunggu request masuk…" : "Aktifkan untuk mulai terima order"}
      </div>
    </div>
    <Switch checked={online} onCheckedChange={onChange} disabled={disabled} className="scale-125" />
  </div>
);

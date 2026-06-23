import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CHECKOUT_SERVICE_CONSENT_LABEL } from "@/lib/terms-constants";

type CheckoutServiceConsentProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
};

export function CheckoutServiceConsent({
  checked,
  onCheckedChange,
  id = "checkout-service-consent",
}: CheckoutServiceConsentProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
        {CHECKOUT_SERVICE_CONSENT_LABEL}{" "}
        <Link to="/terms-of-service" className="text-primary underline-offset-2 hover:underline">
          Terms of Use
        </Link>
        .
      </Label>
    </div>
  );
}

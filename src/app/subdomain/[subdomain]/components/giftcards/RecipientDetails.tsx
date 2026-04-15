import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, Mail, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GiftCardDeliverySettings,
  GiftCardPurchaseData,
} from "../../data/gift-card-types";

interface Props {
  data: GiftCardPurchaseData;
  onChange: (data: Partial<GiftCardPurchaseData>) => void;
  deliverySettings: GiftCardDeliverySettings;
  shopName: string;
}

const RecipientDetails = ({
  data,
  onChange,
  deliverySettings,
  shopName,
}: Props) => (
  <div className="space-y-6">
    <div>
      <h3
        className="text-lg font-semibold tracking-tight mb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Delivery Details
      </h3>
      <p className="text-sm text-muted-foreground">
        Who should receive this gift card?
      </p>
    </div>

    {/* Send to self toggle */}
    <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
      <div>
        <Label className="text-sm font-medium">Send to myself</Label>
        <p className="text-xs text-muted-foreground">
          Receive the gift card on your own account
        </p>
      </div>
      <Switch
        checked={data.sendToSelf}
        onCheckedChange={(v) => onChange({ sendToSelf: v })}
      />
    </div>

    {/* Buyer Info */}
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Your Information
      </Label>
      <SlimInput
        name="buyerName"
        label=""
        className="text-sm font-normal"
        placeholder="Your full name"
        value={data.buyerName}
        onChange={(e) => onChange({ buyerName: e.target.value })}
      />
      <SlimInput
        name="buyerEmail"
        label=""
        className="text-sm font-normal"
        placeholder="Your email"
        type="email"
        value={data.buyerEmail}
        onChange={(e) => onChange({ buyerEmail: e.target.value })}
      />
      <SlimInput
        name="buyerPhone"
        label=""
        className="text-sm"
        placeholder="Your phone"
        type="tel"
        value={data.buyerPhone}
        onChange={(e) => onChange({ buyerPhone: e.target.value })}
      />
    </div>

    {/* Recipient Info (if not self) */}
    {!data.sendToSelf && (
      <>
        {/* Delivery Method */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Delivery Method
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {deliverySettings.emailEnabled && (
              <button
                onClick={() => onChange({ deliveryMethod: "email" })}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  data.deliveryMethod === "email"
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <Mail className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-[10px] text-muted-foreground">
                    Deliver via email
                  </p>
                </div>
              </button>
            )}
            {deliverySettings.textEnabled && (
              <button
                onClick={() => onChange({ deliveryMethod: "text" })}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  data.deliveryMethod === "text"
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <MessageSquare className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-medium">Text</p>
                  <p className="text-[10px] text-muted-foreground">
                    Deliver via SMS
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Recipient fields */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recipient Details
          </Label>
          <SlimInput
            name="recipientName"
            className="text-sm"
            label=""
            placeholder="Recipient name"
            value={data.recipientName}
            onChange={(e) => onChange({ recipientName: e.target.value })}
          />
          {data.deliveryMethod === "email" ? (
            <SlimInput
              name="recipientContact"
              className="text-sm"
              label=""
              placeholder="Recipient email"
              type="email"
              value={data.recipientContact}
              onChange={(e) => onChange({ recipientContact: e.target.value })}
            />
          ) : (
            <SlimInput
              name="recipientContact"
              className="text-sm"
              label=""
              placeholder="Recipient phone"
              type="tel"
              value={data.recipientContact}
              onChange={(e) => onChange({ recipientContact: e.target.value })}
            />
          )}
        </div>

        {/* Send Timing */}
        {/* {deliverySettings.scheduledSendEnabled && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">When to Send</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onChange({ sendTiming: 'instant' })}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  data.sendTiming === 'instant' ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <Send className="w-4 h-4" /> Send Instantly
              </button>
              <button
                onClick={() => onChange({ sendTiming: 'scheduled' })}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  data.sendTiming === 'scheduled' ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <CalendarIcon className="w-4 h-4" /> Schedule
              </button>
            </div>
            {data.sendTiming === 'scheduled' && (
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {data.scheduledDate ? format(data.scheduledDate, 'MMM d, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.scheduledDate || undefined}
                      onSelect={d => onChange({ scheduledDate: d || null })}
                      disabled={d => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={data.scheduledTime} onChange={e => onChange({ scheduledTime: e.target.value })} className="w-28 text-xs" />
              </div>
            )}
          </div>
        )} */}

        {/* Personal Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Personal Message
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {data.personalMessage.length}/250
            </span>
          </div>
          <SlimTextarea
            name="personalMessage"
            className="text-sm"
            label=""
            placeholder="Add a personal note..."
            value={data.personalMessage}
            onChange={(e) =>
              onChange({ personalMessage: e.target.value.slice(0, 250) })
            }
            rows={3}
          />
        </div>

        {/* A2P Compliance */}
        {data.deliveryMethod === "text" && (
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
            <Checkbox
              id="a2p"
              checked={data.a2pConsent}
              onCheckedChange={(v) => onChange({ a2pConsent: !!v })}
              className="mt-0.5"
            />
            <label
              htmlFor="a2p"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
            >
              By checking this box, you confirm you are authorized to receive
              messages at the phone number provided and consent to receive a
              one-time gift card delivery message from{" "}
              <span className="font-medium text-foreground">{shopName}</span>.
              Message & data rates may apply. Reply STOP to opt out, HELP for
              help.
            </label>
          </div>
        )}
      </>
    )}
  </div>
);

export default RecipientDetails;

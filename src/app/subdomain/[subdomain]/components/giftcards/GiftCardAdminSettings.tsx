import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  Image,
  DollarSign,
  Send,
  Tag,
  FileText,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import {
  GiftCardDesign,
  GiftCardDiscount,
  GiftCardSettings,
} from "../../data/gift-card-types";
import { defaultGiftCardSettings } from "../../data/mock-gift-cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";

const GiftCardAdminSettings = () => {
  const [settings, setSettings] = useState<GiftCardSettings>(
    defaultGiftCardSettings,
  );
  const [discountDialog, setDiscountDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] =
    useState<GiftCardDiscount | null>(null);
  const [dForm, setDForm] = useState<Partial<GiftCardDiscount>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDesign: GiftCardDesign = {
        id: `d${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        imageUrl: reader.result as string,
        enabled: true,
        isDefault: false,
      };
      setSettings((s) => ({ ...s, designs: [...s.designs, newDesign] }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const deleteDesign = (id: string) =>
    setSettings((s) => ({
      ...s,
      designs: s.designs
        .filter((d) => d.id !== id)
        .map((d, i, arr) =>
          arr.length > 0 && !arr.some((x) => x.isDefault) && i === 0
            ? { ...d, isDefault: true }
            : d,
        ),
    }));

  const updatePresets = (p: Partial<typeof settings.amountPresets>) =>
    setSettings((s) => ({ ...s, amountPresets: { ...s.amountPresets, ...p } }));

  const updateDelivery = (d: Partial<typeof settings.delivery>) =>
    setSettings((s) => ({ ...s, delivery: { ...s.delivery, ...d } }));

  const updatePolicies = (p: Partial<typeof settings.policies>) =>
    setSettings((s) => ({ ...s, policies: { ...s.policies, ...p } }));

  const toggleDesign = (id: string, enabled: boolean) =>
    setSettings((s) => ({
      ...s,
      designs: s.designs.map((d) => (d.id === id ? { ...d, enabled } : d)),
    }));

  const setDefaultDesign = (id: string) =>
    setSettings((s) => ({
      ...s,
      designs: s.designs.map((d) => ({ ...d, isDefault: d.id === id })),
    }));

  const openNewDiscount = () => {
    setDForm({
      id: `dc${Date.now()}`,
      code: "",
      type: "percent",
      value: 10,
      expiryDate: "2026-12-31",
      usageLimit: 100,
      usedCount: 0,
    });
    setEditingDiscount(null);
    setDiscountDialog(true);
  };

  const openEditDiscount = (d: GiftCardDiscount) => {
    setDForm({ ...d });
    setEditingDiscount(d);
    setDiscountDialog(true);
  };

  const saveDiscount = () => {
    const disc = dForm as GiftCardDiscount;
    if (editingDiscount) {
      setSettings((s) => ({
        ...s,
        discounts: s.discounts.map((d) =>
          d.id === editingDiscount.id ? disc : d,
        ),
      }));
    } else {
      setSettings((s) => ({ ...s, discounts: [...s.discounts, disc] }));
    }
    setDiscountDialog(false);
  };

  const deleteDiscount = (id: string) =>
    setSettings((s) => ({
      ...s,
      discounts: s.discounts.filter((d) => d.id !== id),
    }));

  return (
    <div className="space-y-6">
      {/* A) Designs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" /> Gift Card Designs
          </CardTitle>
          <CardDescription>
            Manage gift card templates visible to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleDesignUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Custom Design
          </Button>
          {settings.designs.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              <img
                src={d.imageUrl}
                alt={d.name}
                className="w-16 h-10 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{d.name}</p>
                  {d.isDefault && (
                    <Badge variant="secondary" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
              <Switch
                checked={d.enabled}
                onCheckedChange={(v) => toggleDesign(d.id, v)}
              />
              {!d.isDefault && d.enabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setDefaultDesign(d.id)}
                >
                  Set Default
                </Button>
              )}
              {!d.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDesign(d.id)}
                  className="text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* B) Amount Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Amount Presets
          </CardTitle>
          <CardDescription>
            Configure preset amounts and custom range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Show Presets</Label>
            <Switch
              checked={settings.amountPresets.showPresets}
              onCheckedChange={(v) => updatePresets({ showPresets: v })}
            />
          </div>
          {settings.amountPresets.showPresets && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Preset 1 ($)</Label>
                <Input
                  type="number"
                  value={settings.amountPresets.preset1}
                  onChange={(e) =>
                    updatePresets({ preset1: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preset 2 ($)</Label>
                <Input
                  type="number"
                  value={settings.amountPresets.preset2}
                  onChange={(e) =>
                    updatePresets({ preset2: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preset 3 ($)</Label>
                <Input
                  type="number"
                  value={settings.amountPresets.preset3}
                  onChange={(e) =>
                    updatePresets({ preset3: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Allow Custom Amount</Label>
            <Switch
              checked={settings.amountPresets.customEnabled}
              onCheckedChange={(v) => updatePresets({ customEnabled: v })}
            />
          </div>
          {settings.amountPresets.customEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min ($)</Label>
                <Input
                  type="number"
                  value={settings.amountPresets.customMin}
                  onChange={(e) =>
                    updatePresets({ customMin: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max ($)</Label>
                <Input
                  type="number"
                  value={settings.amountPresets.customMax}
                  onChange={(e) =>
                    updatePresets({ customMax: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* C) Delivery Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Delivery Options
          </CardTitle>
          <CardDescription>
            Configure how gift cards can be delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Text Delivery</Label>
            <Switch
              checked={settings.delivery.textEnabled}
              onCheckedChange={(v) => updateDelivery({ textEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enable Email Delivery</Label>
            <Switch
              checked={settings.delivery.emailEnabled}
              onCheckedChange={(v) => updateDelivery({ emailEnabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Default Method</Label>
            <Select
              value={settings.delivery.defaultMethod}
              onValueChange={(v: "text" | "email") =>
                updateDelivery({ defaultMethod: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Scheduled Send</Label>
            <Switch
              checked={settings.delivery.scheduledSendEnabled}
              onCheckedChange={(v) =>
                updateDelivery({ scheduledSendEnabled: v })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* D) Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" /> Discount Codes
          </CardTitle>
          <CardDescription>Promo codes for gift card purchases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Coupon codes will pull directly from the AWX platform.
            </p>
          </div>
          <Separator />
          <Label className="text-xs text-muted-foreground">
            Example codes (toggle to enable/disable)
          </Label>
          {settings.discounts.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium">{d.code}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {d.type === "percent" ? `${d.value}%` : `$${d.value}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires {d.expiryDate} · {d.usedCount}/{d.usageLimit} used
                </p>
              </div>
              <Switch
                checked={d.usageLimit > d.usedCount}
                onCheckedChange={(v) => {
                  setSettings((s) => ({
                    ...s,
                    discounts: s.discounts.map((dc) =>
                      dc.id === d.id
                        ? { ...dc, usageLimit: v ? 100 : dc.usedCount }
                        : dc,
                    ),
                  }));
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* E) Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Policies & Links
          </CardTitle>
          <CardDescription>URLs shown at checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Terms URL</Label>
            <Input
              value={settings.policies.termsUrl}
              onChange={(e) => updatePolicies({ termsUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Privacy Policy URL</Label>
            <Input
              value={settings.policies.privacyUrl}
              onChange={(e) => updatePolicies({ privacyUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* F) Expiration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" /> Expiration Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm text-primary font-medium">
              Gift cards never expire (non-editable policy)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Discount Dialog */}
      <Dialog open={discountDialog} onOpenChange={setDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? "Edit Discount" : "New Discount Code"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <Input
                value={dForm.code || ""}
                onChange={(e) =>
                  setDForm({ ...dForm, code: e.target.value.toUpperCase() })
                }
                className="uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={dForm.type}
                  onValueChange={(v: "percent" | "fixed") =>
                    setDForm({ ...dForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  value={dForm.value || 0}
                  onChange={(e) =>
                    setDForm({ ...dForm, value: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date</Label>
                <Input
                  type="date"
                  value={dForm.expiryDate || ""}
                  onChange={(e) =>
                    setDForm({ ...dForm, expiryDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usage Limit</Label>
                <Input
                  type="number"
                  value={dForm.usageLimit || 0}
                  onChange={(e) =>
                    setDForm({ ...dForm, usageLimit: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <Button onClick={saveDiscount} className="w-full">
              {editingDiscount ? "Save Changes" : "Create Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftCardAdminSettings;

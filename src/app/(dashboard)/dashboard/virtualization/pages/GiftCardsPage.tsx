"use client"

import { useState } from 'react';

import awxLogo from '@/assets/awx-logo.png';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { defaultGiftCardSettings } from '../data/mock-gift-cards';
import { GiftCardPurchaseData, initialPurchaseData } from '../data/gift-card-types';
import Link from 'next/link';
import DesignPicker from '../components/giftcards/DesignPicker';
import PurchaseTypeSelector from '../components/giftcards/PurchaseTypeSelector';
import AmountSelector from '../components/giftcards/AmountSelector';
import DiscountCode from '../components/giftcards/DiscountCode';
import RecipientDetails from '../components/giftcards/RecipientDetails';
import GiftCardCheckout from '../components/giftcards/GiftCardCheckout';
import GiftCardConfirmation from '../components/giftcards/GiftCardConfirmation';
import ReloadGiftCard from '../components/giftcards/ReloadGiftCard';
import CheckBalance from '../components/giftcards/CheckBalance';



type BuyStep = 'design' | 'type' | 'amount' | 'discount' | 'recipient' | 'checkout' | 'confirmation';

const shopName = 'ABC Business';

const GiftCardsPage = () => {
  const { shopId } = useParams();
  const settings = defaultGiftCardSettings;
  const [buyStep, setBuyStep] = useState<BuyStep>('design');
  const [data, setData] = useState<GiftCardPurchaseData>({
    ...initialPurchaseData,
    designId: settings.designs.find(d => d.isDefault)?.id || settings.designs[0]?.id || '',
    deliveryMethod: settings.delivery.defaultMethod,
  });

  const update = (partial: Partial<GiftCardPurchaseData>) => setData(prev => ({ ...prev, ...partial }));

  const [confirmationData, setConfirmationData] = useState<{ number: string; code: string } | null>(null);

  const handleConfirmPurchase = () => {
    const confNum = `AWX-${Date.now().toString(36).toUpperCase()}`;
    const code = `AWX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setConfirmationData({ number: confNum, code: `AWX-****-${code.split('-').pop()}` });
    setBuyStep('confirmation');
  };

  const resetBuy = () => {
    setBuyStep('design');
    setData({
      ...initialPurchaseData,
      designId: settings.designs.find(d => d.isDefault)?.id || settings.designs[0]?.id || '',
      deliveryMethod: settings.delivery.defaultMethod,
    });
    setConfirmationData(null);
  };

  const stepOrder: BuyStep[] = ['design', 'type', 'amount', 'discount', 'recipient', 'checkout'];
  const currentIdx = stepOrder.indexOf(buyStep);

  const canNext = () => {
    switch (buyStep) {
      case 'design': return !!data.designId;
      case 'type': return data.purchaseType === 'individual';
      case 'amount': return data.amount > 0;
      case 'discount': return true;
      case 'recipient':
        if (data.sendToSelf) return !!(data.buyerName && data.buyerEmail);
        const hasContact = data.deliveryMethod === 'email' ? !!data.recipientContact : (!!data.recipientContact && data.a2pConsent);
        return !!(data.buyerName && data.buyerEmail && hasContact);
      case 'checkout': return data.purchaseConsent;
      default: return false;
    }
  };

  const stepLabels: Record<BuyStep, string> = {
    design: 'Design', type: 'Type', amount: 'Amount', discount: 'Discount', recipient: 'Details', checkout: 'Pay', confirmation: 'Done',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={"/icons/Logo.png"} alt="AutoWorx" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <span className="font-bold text-lg tracking-tight leading-tight block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{shopName}</span>
              <p className="text-[11px] text-muted-foreground leading-tight">(555) 123-4567 · 123 Main St, Springfield</p>
            </div>
          </div>
          <Link href={`/book/${shopId || 'demo'}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Booking
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="buy" onValueChange={() => resetBuy()}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="buy" className="gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Buy</TabsTrigger>
            <TabsTrigger value="reload" className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Reload</TabsTrigger>
            <TabsTrigger value="balance" className="gap-1.5"><Search className="w-3.5 h-3.5" /> Check Balance</TabsTrigger>
          </TabsList>

          {/* BUY TAB */}
          <TabsContent value="buy">
            {buyStep !== 'confirmation' && (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                  {stepOrder.map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <button
                        onClick={() => i < currentIdx && setBuyStep(s)}
                        disabled={i > currentIdx}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                          s === buyStep
                            ? 'bg-primary text-primary-foreground font-medium'
                            : i < currentIdx
                            ? 'bg-muted text-foreground cursor-pointer hover:bg-muted-foreground/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {stepLabels[s]}
                      </button>
                      {i < stepOrder.length - 1 && <div className="w-4 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                {/* Step content */}
                {buyStep === 'design' && (
                  <DesignPicker designs={settings.designs} selected={data.designId} onSelect={id => update({ designId: id })} shopName={shopName} />
                )}
                {buyStep === 'type' && (
                  <PurchaseTypeSelector selected={data.purchaseType} onSelect={t => update({ purchaseType: t })} />
                )}
                {buyStep === 'amount' && (
                  <AmountSelector presets={settings.amountPresets} amount={data.amount} onAmountChange={a => update({ amount: a })} />
                )}
                {buyStep === 'discount' && (
                  <DiscountCode discounts={settings.discounts} applied={data.discountApplied} onApply={d => update({ discountApplied: d })} onCodeChange={c => update({ discountCode: c })} code={data.discountCode} />
                )}
                {buyStep === 'recipient' && (
                  <RecipientDetails data={data} onChange={update} deliverySettings={settings.delivery} shopName={shopName} />
                )}
                {buyStep === 'checkout' && (
                  <GiftCardCheckout
                    data={data}
                    design={settings.designs.find(d => d.id === data.designId)}
                    policies={settings.policies}
                    shopName={shopName}
                    onConsentChange={v => update({ purchaseConsent: v })}
                    onConfirm={handleConfirmPurchase}
                  />
                )}

                {/* Nav buttons */}
                {buyStep !== 'checkout' && (
                  <div className="flex items-center justify-between mt-8 pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => currentIdx > 0 && setBuyStep(stepOrder[currentIdx - 1])}
                      disabled={currentIdx === 0}
                    >
                      Back
                    </Button>
                    <Button onClick={() => setBuyStep(stepOrder[currentIdx + 1])} disabled={!canNext()}>
                      Continue
                    </Button>
                  </div>
                )}
              </>
            )}

            {buyStep === 'confirmation' && confirmationData && (
              <GiftCardConfirmation
                confirmationNumber={confirmationData.number}
                maskedCode={confirmationData.code}
                amount={data.amount}
                recipientName={data.sendToSelf ? '' : data.recipientName}
                deliveryMethod={data.sendToSelf ? 'self' : data.deliveryMethod}
                sendTiming={data.sendTiming}
                shopName={shopName}
              />
            )}
          </TabsContent>

          {/* RELOAD TAB */}
          <TabsContent value="reload">
            <ReloadGiftCard presets={settings.amountPresets} />
          </TabsContent>

          {/* BALANCE TAB */}
          <TabsContent value="balance">
            <CheckBalance />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GiftCardsPage;

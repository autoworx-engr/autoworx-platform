import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { ArrowRight, CreditCard, RefreshCw, Shield } from 'lucide-react';
import AmountSelector from './AmountSelector';
import { GiftCardAmountPresets } from '../../data/gift-card-types';
import { mockGiftCardRecords } from '../../data/mock-gift-cards';

interface Props {
  presets: GiftCardAmountPresets;
}

const ReloadGiftCard = ({ presets }: Props) => {
  const [code, setCode] = useState('');
  const [looked, setLooked] = useState(false);
  const [amount, setAmount] = useState(0);
  const [success, setSuccess] = useState(false);

  const found = mockGiftCardRecords.find(r => r.code.toUpperCase() === code.toUpperCase());

  const handleLookup = () => setLooked(true);

  const handleReload = () => setSuccess(true);

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-12">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Reload Successful!</h3>
        <p className="text-muted-foreground text-sm">Added ${amount.toFixed(2)} to gift card {found?.maskedCode}</p>
        <p className="text-sm font-medium">New balance: ${((found?.balance || 0) + amount).toFixed(2)}</p>
        <Button variant="outline" onClick={() => { setCode(''); setLooked(false); setAmount(0); setSuccess(false); }}>Reload Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h3 className="text-lg font-semibold tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Reload a Gift Card</h3>
        <p className="text-sm text-muted-foreground">Add funds to an existing gift card</p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter gift card code (e.g. AWX-7F3K-9M2P)"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setLooked(false); }}
          className="uppercase font-mono"
        />
        <Button onClick={handleLookup} disabled={!code} size="sm">Lookup</Button>
      </div>

      {looked && !found && <p className="text-sm text-destructive">Gift card not found. Please check the code.</p>}

      {looked && found && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Card</span><span className="font-mono">{found.maskedCode}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Current Balance</span><span className="font-semibold text-primary">${found.balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="secondary" className="text-[10px]">{found.status}</Badge></div>
          </div>

          <AmountSelector presets={presets} amount={amount} onAmountChange={setAmount} />

          <Button className="w-full h-12 gap-2" disabled={amount <= 0} onClick={handleReload}>
            <CreditCard className="w-4 h-4" /> Reload ${amount > 0 ? amount.toFixed(2) : '0.00'}
          </Button>

          <div className="flex items-center gap-2 text-sm text-primary justify-center">
            <Shield className="w-4 h-4" /><span className="font-medium">Gift cards never expire</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReloadGiftCard;

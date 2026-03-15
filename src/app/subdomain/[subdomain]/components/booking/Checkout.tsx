import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import { ArrowLeft, Clock, Shield, AlertTriangle, Timer, CheckCircle2 } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';
import { useBooking } from '../../context/BookingContext';
import { CustomerInfo } from '../../data/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/Dialog';


const TIMER_SECONDS = 600; // 10 min

export const Checkout = () => {
  const { setStep, cart, cartTotal, cartDurationMinutes, selectedDate, selectedSlot, setCustomerInfo, isReturningClient, setIsReturningClient, settings } = useBooking();

  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerExpired, setTimerExpired] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);
  const [form, setForm] = useState<CustomerInfo>({
    fullName: '', email: '', phone: '', vehicleYear: '', vehicleMake: '', vehicleModel: '', notes: '',
  });

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) { setTimerExpired(true); return; }
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleAddTime = () => {
    setTimeLeft(TIMER_SECONDS);
    setTimerExpired(false);
  };

  const handlePhoneLookup = useCallback(() => {
    // TODO: Call API to check if phone exists — mock: treat as returning if isReturningClient flag is set
    setPhoneLookedUp(true);
    if (isReturningClient) {
      setShowOtp(true);
    }
  }, [isReturningClient]);

  const handleOtpCheck = useCallback((val: string) => {
    setOtpValue(val);
    if (val === '1234') {
      setOtpVerified(true);
      // Auto-fill name & email but NOT vehicle info
      setForm(prev => ({
        ...prev,
        fullName: 'John Doe',
        email: 'john@example.com',
      }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerInfo(form);
    setIsReturningClient(true);
    setStep('confirmation');
  };

  const update = (field: keyof CustomerInfo, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const depositAmount = settings.depositRequired
    ? settings.depositType === 'fixed'
      ? settings.depositAmount
      : Math.round(cartTotal * settings.depositAmount / 100)
    : 0;

  const shopFee = settings.shopFeeEnabled ? Math.round(cartTotal * settings.shopFeePercent / 100) : 0;
  const tax = settings.taxEnabled ? Math.round((cartTotal + shopFee) * settings.taxPercent / 100) : 0;
  const grandTotal = cartTotal + shopFee + tax;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('datetime')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${timeLeft < 120 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <Timer className="w-3.5 h-3.5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Booking Summary */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Summary</p>
        {cart.map(item => {
          const vehicleExtra = item.service.vehicleTypePricing[item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing];
          const itemPrice = item.service.price + vehicleExtra;
          return (
            <div key={item.service.id} className="flex justify-between text-sm">
              <span>{item.service.title} <span className="text-xs text-muted-foreground">({item.vehicleType})</span></span>
              <span className="font-medium">${itemPrice}</span>
            </div>
          );
        })}
        <div className="border-t pt-2 space-y-1">
          {shopFee > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Shop Fee ({settings.shopFeePercent}%)</span><span>${shopFee}</span></div>}
          {tax > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Tax ({settings.taxPercent}%)</span><span>${tax}</span></div>}
          <div className="flex justify-between font-bold"><span>Total</span><span>${grandTotal}</span></div>
          {depositAmount > 0 && <div className="flex justify-between text-xs text-primary"><span>Deposit Due Now</span><span>${depositAmount}</span></div>}
        </div>
        <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}</span>
          {selectedSlot && (
            <span className="flex items-center gap-1">
              {selectedSlot.label} – {(() => {
                const start = parse(selectedSlot.time, 'HH:mm', new Date());
                return format(addMinutes(start, cartDurationMinutes), 'h:mm a');
              })()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {cartDurationMinutes >= 60
              ? `${Math.floor(cartDurationMinutes / 60)}h ${cartDurationMinutes % 60 > 0 ? `${cartDurationMinutes % 60}m` : ''}`
              : `${cartDurationMinutes}m`
            }
          </span>
        </div>
      </div>




      {/* Customer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone first — used to check returning client */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              required
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="555-123-4567"
              className="flex-1"
            />
            {!phoneLookedUp && form.phone.length >= 7 && (
              <Button type="button" variant="secondary" size="sm" onClick={handlePhoneLookup}>
                Continue
              </Button>
            )}
            {phoneLookedUp && !isReturningClient && (
              <span className="flex items-center text-xs text-muted-foreground">New client</span>
            )}
          </div>
        </div>

        {/* OTP for returning clients — shown right after phone lookup */}
        {isReturningClient && showOtp && !otpVerified && (
          <div className="rounded-xl border bg-card p-4 space-y-3 text-center">
            <Shield className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium">Welcome back! Verify your identity</p>
            <p className="text-xs text-muted-foreground">Enter the 4-digit code sent to your phone. (Use: <strong>1234</strong>)</p>
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={otpValue} onChange={handleOtpCheck}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpVerified && <p className="text-xs text-primary flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified! Fields auto-populated.</p>}
          </div>
        )}

        {/* Remaining fields — shown after phone lookup (or OTP verified for returning) */}
        {phoneLookedUp && (!isReturningClient || otpVerified) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Full Name *</Label>
            <Input id="name" required value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input id="email" type="email" required value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@email.com" />
          </div>
        </div>
        )}

        {phoneLookedUp && (!isReturningClient || otpVerified) && (
        <>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Vehicle Information</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="year" className="text-xs">Year</Label>
            <Input id="year" value={form.vehicleYear} onChange={e => update('vehicleYear', e.target.value)} placeholder="2024" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="make" className="text-xs">Make</Label>
            <Input id="make" value={form.vehicleMake} onChange={e => update('vehicleMake', e.target.value)} placeholder="BMW" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-xs">Model</Label>
            <Input id="model" value={form.vehicleModel} onChange={e => update('vehicleModel', e.target.value)} placeholder="M3" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any special requests..." rows={3} />
        </div>

        {/* Policies */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Your info is secure and encrypted.</p>
          <p>By confirming, an <strong>Autoworx client account</strong> will be created automatically. Future bookings will use OTP verification for faster checkout.</p>
          <p>Free cancellation up to 24 hours before your appointment. <a href="#" className="text-primary underline">Cancellation Policy</a></p>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Confirm Booking
        </Button>
        </>
        )}
      </form>

      {/* Timer Expired Dialog */}
      <Dialog open={timerExpired} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent" /> Time's Up!</DialogTitle>
            <DialogDescription>Your reservation has expired. Would you like to extend or start over?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleAddTime} className="gap-2"><Timer className="w-4 h-4" /> Add 10 More Minutes</Button>
            <Button variant="outline" onClick={() => setStep('services')}>Return to Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

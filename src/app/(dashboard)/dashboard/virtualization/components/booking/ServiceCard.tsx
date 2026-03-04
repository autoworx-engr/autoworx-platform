import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Check, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Service, VehicleType } from '../../data/types';
import { useBooking } from '../../context/BookingContext';

const vehicleTypes: VehicleType[] = ['Coupe', 'Sedan', 'SUV', 'Truck'];

export const ServiceCard = ({ service }: { service: Service }) => {
  const { cart, addToCart, removeFromCart } = useBooking();
  const inCart = cart.some(i => i.service.id === service.id);
  const cartItem = cart.find(i => i.service.id === service.id);
  const [selectedType, setSelectedType] = useState<VehicleType>('Coupe');

  const activeType = inCart && cartItem ? cartItem.vehicleType : selectedType;

  const getExtra = (type: VehicleType) => service.vehicleTypePricing[type.toLowerCase() as keyof typeof service.vehicleTypePricing];
  const totalPrice = service.price + getExtra(activeType);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const handleTypeSelect = (type: VehicleType) => {
    if (inCart) return; // can't change once added
    setSelectedType(type);
  };

  return (
    <div className={cn(
      "group rounded-xl overflow-hidden border bg-card transition-all duration-200 hover:shadow-lg",
      inCart && "ring-2 ring-primary"
    )}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={service.images[0]}
          alt={service.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm text-[10px] font-medium">
          {service.category}
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm leading-tight">{service.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{service.description}</p>

        {/* Vehicle Type Selector */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Car className="w-3 h-3" /> Vehicle Type
          </p>
          <div className="flex gap-1.5">
            {vehicleTypes.map(type => {
              const extra = getExtra(type);
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={inCart}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors text-center",
                    activeType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
                    inCart && "cursor-default"
                  )}
                >
                  <span className="block">{type}</span>
                  {extra > 0 && <span className="block text-[9px] opacity-80">+${extra}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-lg font-bold">${totalPrice}</p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-[11px]">{formatDuration(service.estimatedMinutes)}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={inCart ? "secondary" : "default"}
            onClick={() => inCart ? removeFromCart(service.id) : addToCart(service, selectedType)}
            className="h-9 gap-1.5"
          >
            {inCart ? <><Check className="w-3.5 h-3.5" /> Added</> : <><Plus className="w-3.5 h-3.5" /> Add</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ShoppingCart, X, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBooking } from "../../context/BookingContext";

export const CartDrawer = () => {
  const { cart, removeFromCart, cartTotal, cartDurationMinutes, setStep } =
    useBooking();

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  if (cart.length === 0) return null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95">
          <ShoppingCart className="w-6 h-6" />
          <Badge className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] min-w-[20px] h-5 flex items-center justify-center">
            {cart.length}
          </Badge>
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Your Cart ({cart.length})
          </DrawerTitle>
        </DrawerHeader>

        <div
          className="px-4 space-y-3 overflow-y-auto flex-1"
          data-vaul-no-drag
        >
          {cart.map((item) => {
            const vehicleExtra =
              item.service.vehicleTypePricing[
                item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing
              ];
            const itemPrice = item.service.price + vehicleExtra;
            return (
              <div
                key={item.service.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <img
                  src={
                    item.service.images[0] ||
                    "https://img.freepik.com/free-vector/businessman-with-smartphone-rents-car-street-via-carsharing-service-carsharing-service-short-periods-rent-best-taxi-alternative-concept_335657-2201.jpg?t=st=1774777481~exp=1774781081~hmac=392773361784ea1099eb657d3d5371390f1e88bb056a7d5b0aa0c5585b60204d&w=1480"
                  }
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.service.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground">
                      ${itemPrice}
                    </span>
                    <span>•</span>
                    <span>{item.vehicleType}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(item.service.estimatedMinutes)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-vaul-no-drag
                  onClick={() => removeFromCart(item.service.id)}
                  className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors relative z-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Total Duration</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(cartDurationMinutes)}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-muted-foreground">Total</p>
              <p className="text-xl font-bold">${cartTotal}</p>
            </div>
          </div>
          <DrawerClose asChild>
            <Button
              type="button"
              data-vaul-no-drag
              size="lg"
              className="w-full gap-2 relative z-50 touch-manipulation"
              onClick={() => setStep("datetime")}
            >
              Choose Date & Time <ArrowRight className="w-4 h-4" />
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

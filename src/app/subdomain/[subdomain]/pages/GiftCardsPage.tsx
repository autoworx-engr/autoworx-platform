"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, ShoppingBag } from "lucide-react";
import ReloadGiftCard from "../components/giftcards/ReloadGiftCard";
import CheckBalance from "../components/giftcards/CheckBalance";
import { BookingHeader } from "../components/booking/BookingHeader";
import { useGiftCardPageData } from "../hooks/useGiftCardPageData";
import BuyGiftCardFlow from "../components/giftcards/BuyGiftCardFlow";

const GiftCardsPage = () => {
  const {
    amountPresets,
    isLoading,
  } = useGiftCardPageData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BookingHeader rightElement="booking" />

      <main className="container max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="buy">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="buy" className="gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Buy
            </TabsTrigger>
            <TabsTrigger value="reload" className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-1.5">
              <Search className="w-3.5 h-3.5" /> Check Balance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <BuyGiftCardFlow />
          </TabsContent>

          <TabsContent value="reload">
            <ReloadGiftCard presets={amountPresets} />
          </TabsContent>

          <TabsContent value="balance">
            <CheckBalance />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GiftCardsPage;

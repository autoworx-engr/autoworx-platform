"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/cn";
import styles from "@/components/Tabs.module.css";

const FleetTab = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn("drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]", className)}
    {...props}
  />
));
FleetTab.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "items-ends inline-flex h-10 shrink-0 flex-row-reverse justify-end rounded-md px-4 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative flex w-40 items-center justify-center whitespace-nowrap rounded-t-lg bg-background px-6 py-1.5 text-sm font-medium text-foreground ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-white lg:px-12 [@media(max-width:320px)]:w-32",
      styles.tab,
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "flex-auto overflow-y-auto overflow-x-clip rounded-lg bg-background p-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    style={style}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { FleetTab, TabsContent, TabsList, TabsTrigger };

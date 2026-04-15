import { Service, ShopSettings, DayAvailability } from "./types";

const defaultPricing = { coupe: 0, sedan: 0, suv: 0, truck: 0 };

export const mockServices: Service[] = [
  {
    id: "s1",
    title: "Express Wash & Wax",
    description:
      "Quick exterior wash with spray wax protection for a showroom shine.",
    price: 49,
    estimatedMinutes: 45,
    category: "Maintenance",
    images: [
      "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 10, suv: 15, truck: 25 },
  },
  {
    id: "s2",
    title: "Interior Deep Clean",
    description:
      "Full vacuum, steam cleaning, leather conditioning, and dashboard treatment.",
    price: 129,
    estimatedMinutes: 120,
    category: "Detailing",
    images: [
      "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 20, suv: 30, truck: 40 },
  },
  {
    id: "s3",
    title: "Full Detail Package",
    description:
      "Complete interior and exterior detailing. Paint decontamination, clay bar, polish, and interior deep clean.",
    price: 299,
    estimatedMinutes: 300,
    category: "Detailing",
    images: [
      "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 50, suv: 75, truck: 100 },
  },
  {
    id: "s4",
    title: "Single-Stage Paint Correction",
    description:
      "Remove light swirls and scratches with a single-stage machine polish.",
    price: 399,
    estimatedMinutes: 360,
    category: "Paint Correction",
    images: [
      "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 50, suv: 75, truck: 100 },
  },
  {
    id: "s5",
    title: "Multi-Stage Paint Correction",
    description:
      "Advanced multi-step correction for heavy swirls, oxidation, and deep scratches.",
    price: 799,
    estimatedMinutes: 480,
    category: "Paint Correction",
    images: [
      "https://images.unsplash.com/photo-1600706432502-77a0e2e32431?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 100, suv: 150, truck: 200 },
  },
  {
    id: "s6",
    title: "Ceramic Coating - 1 Year",
    description:
      "Professional-grade 1-year ceramic coating for durable paint protection and hydrophobic finish.",
    price: 599,
    estimatedMinutes: 240,
    category: "Ceramic Coating",
    images: [
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 75, suv: 100, truck: 150 },
  },
  {
    id: "s7",
    title: "Ceramic Coating - 5 Year",
    description:
      "Premium 5-year ceramic coating with multi-layer application for maximum durability.",
    price: 1299,
    estimatedMinutes: 480,
    category: "Ceramic Coating",
    images: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 150, suv: 225, truck: 300 },
  },
  {
    id: "s8",
    title: "Engine Bay Detail",
    description:
      "Thorough engine bay cleaning, degreasing, and dressing for a clean engine compartment.",
    price: 89,
    estimatedMinutes: 60,
    category: "Detailing",
    images: [
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 10, suv: 15, truck: 20 },
  },
  {
    id: "s9",
    title: "Headlight Restoration",
    description:
      "Restore cloudy, yellowed headlights to crystal clear with UV protective sealant.",
    price: 79,
    estimatedMinutes: 45,
    category: "Maintenance",
    images: [
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 0, suv: 0, truck: 0 },
  },
  {
    id: "s10",
    title: "Wheel & Tire Package",
    description:
      "Deep clean wheels, dress tires, and apply ceramic wheel coating for lasting protection.",
    price: 149,
    estimatedMinutes: 90,
    category: "Maintenance",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    ],
    vehicleTypePricing: { coupe: 0, sedan: 20, suv: 30, truck: 40 },
  },
];

export const defaultDayAvailability: DayAvailability[] = [
  { day: "Monday", enabled: true, startTime: "08:00", endTime: "18:00" },
  { day: "Tuesday", enabled: true, startTime: "08:00", endTime: "18:00" },
  { day: "Wednesday", enabled: true, startTime: "08:00", endTime: "18:00" },
  { day: "Thursday", enabled: true, startTime: "08:00", endTime: "18:00" },
  { day: "Friday", enabled: true, startTime: "08:00", endTime: "18:00" },
  { day: "Saturday", enabled: true, startTime: "09:00", endTime: "16:00" },
  { day: "Sunday", enabled: false, startTime: "09:00", endTime: "14:00" },
];

export const defaultSettings: ShopSettings = {
  depositRequired: false,
  depositType: "percentage",
  depositAmount: 25,
  stackingEnabled: false,
  stackingLimit: 2,
  slotIntervalMinutes: 30,
  shopFeeEnabled: false,
  shopFeePercent: 3,
  taxEnabled: true,
  taxPercent: 8.25,
  dayAvailability: defaultDayAvailability,
};

// Simulate some existing bookings for calendar logic
export const mockExistingBookings = [
  { date: "2026-02-25", slots: ["09:00", "09:30", "10:00", "10:30", "11:00"] },
  {
    date: "2026-02-26",
    slots: [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ],
  },
  { date: "2026-03-02", slots: ["13:00", "13:30", "14:00", "14:30"] },
];

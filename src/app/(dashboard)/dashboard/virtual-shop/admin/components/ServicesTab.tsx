"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import ServiceCard, { type Service } from "./ServiceCard";
import { redirect } from "next/dist/server/api-utils";
import { useRouter } from "next/navigation";

const MOCK_SERVICES: Service[] = [
  { id: 1, name: "Express Wash & Wax", category: "Maintenance", price: 49, duration: 45, imageUrl: "" },
  { id: 2, name: "Interior Deep Clean", category: "Detailing", price: 129, duration: 120, imageUrl: "" },
  { id: 3, name: "Full Detail Package", category: "Detailing", price: 299, duration: 300, imageUrl: "" },
  { id: 4, name: "Single-Stage Paint Correction", category: "Paint Correction", price: 399, duration: 360, imageUrl: "" },
  { id: 5, name: "Multi-Stage Paint Correction", category: "Paint Correction", price: 799, duration: 480, imageUrl: "" },
  { id: 6, name: "Ceramic Coating - 1 Year", category: "Ceramic Coating", price: 599, duration: 240, imageUrl: "" },
  { id: 7, name: "Ceramic Coating - 5 Year", category: "Ceramic Coating", price: 1299, duration: 480, imageUrl: "" },
  { id: 8, name: "Engine Bay Detail", category: "Detailing", price: 89, duration: 60, imageUrl: "" },
  { id: 9, name: "Headlight Restoration", category: "Maintenance", price: 79, duration: 45, imageUrl: "" },
];

export default function ServicesTab() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (service: Service) => {
    // TODO: open edit dialog
    void service;
  };

  const handleDelete = (service: Service) => {
    setServices((prev) => prev.filter((s) => s.id !== service.id));
  };

  const handleAddService = () => {
    router.push("/dashboard/virtual-shop/admin/service/create");
  };

  return (
    <div className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto thin-scrollbar">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
          />
        </div>

        <button
          onClick={handleAddService}
          className="flex items-center gap-1.5 rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Service list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No services found.
          </p>
        ) : (
          filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

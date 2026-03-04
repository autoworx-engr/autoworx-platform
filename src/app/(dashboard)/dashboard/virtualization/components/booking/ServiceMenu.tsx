import { useState } from 'react';

import { ServiceCard } from './ServiceCard';

import { cn } from '@/lib/utils';
import { ServiceCategory } from '../../data/types';
import { useBooking } from '../../context/BookingContext';

const categories: ('All' | ServiceCategory)[] = ['All', 'Detailing', 'Paint Correction', 'Ceramic Coating', 'Maintenance'];

export const ServiceMenu = () => {
  const { services } = useBooking();
  const [activeCategory, setActiveCategory] = useState<'All' | ServiceCategory>('All');

  const filtered = activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Our Services</h2>
        <p className="text-sm text-muted-foreground mt-1">Select services to build your appointment</p>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
};

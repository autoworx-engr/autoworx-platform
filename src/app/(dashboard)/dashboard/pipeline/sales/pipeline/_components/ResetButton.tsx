"use client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function ResetButton({ searchParams }: { searchParams: { searchTerm?: string; orderBy?: string } }) {
    const router = useRouter();
    const pathname = usePathname();
    const handleResetFilters = () => {
        router.replace(`${pathname}`);
        // router.refresh();
    };

    return (
        <Button variant="destructive" className="h-11 rounded-xl" onClick={handleResetFilters}>
            <X size={18} />
            Reset Filters
        </Button>
    );
}
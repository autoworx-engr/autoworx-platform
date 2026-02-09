"use client";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";

export default function ResetButton() {
    const router = useRouter();
    const pathname = usePathname();
    const handleResetFilters = () => {
        router.replace(`${pathname}`);
    };

    return (
        <Button className="h-10 rounded-xl hover:bg-red-700 bg-red-600" onClick={handleResetFilters}>
            Clear
        </Button>
    );
}   
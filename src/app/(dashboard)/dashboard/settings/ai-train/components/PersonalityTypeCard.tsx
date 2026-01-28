import { RadioGroupItem } from "@/components/ui/radio-group";
import { PersonalityType } from "../types/types";
import { Label } from "@/components/ui/label";

interface PersonalityTypeCardProps {
  value: PersonalityType;
  emoji: string;
  title: string;
  description: string;
  selectedType:boolean
}
export default function PersonalityTypeCard({ 
  value, 
  emoji, 
  title, 
  description,
  selectedType
}: PersonalityTypeCardProps){
    return (
        <Label htmlFor={value}
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          selectedType
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}>
         <RadioGroupItem
                                  value={value}
                                  id={value}
                                  className="sr-only"
                                />
                                 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                          {emoji}
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                         {description}
                        </p>
        </Label>
    )
}
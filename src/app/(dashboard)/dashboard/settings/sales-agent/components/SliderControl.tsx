import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";


interface SliderControlProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onChange: (value: number[]) => void;
  descriptions: {
    high: string;
    medium: string;
    low: string;
  };
  iconClassName:string
}
export default function SliderControl({ 
  icon: Icon, 
  label, 
  value, 
  onChange, 
  descriptions,
  iconClassName
}: SliderControlProps){
    const getDescription = ():string =>{
        if(value >= 7) return descriptions.high;
        if(value >= 4) return descriptions.medium;
        return descriptions.low
    }
    return (
         <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4  ${iconClassName}`} />
                                    {label}
                                  </Label>
                                  <span className="text-sm text-muted-foreground">
                                    {value}/10
                                  </span>
                                </div>
                                <Slider
                                  value={[value]}
                                  onValueChange={onChange}
                                  max={10}
                                  min={1}
                                  step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                  {/* {(personality?.humor ?? 6) >= 7
                                    ? "Will crack jokes and be playful"
                                    : (personality?.humor ?? 6) >= 4
                                      ? "Light humor when appropriate"
                                      : "Keeps it strictly business"} */}
                                      {getDescription()}
                                </p>
                              </div>
    )
}
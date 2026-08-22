import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SwitchControlProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
export default function SwitchControl({ 
  label, 
  description, 
  checked, 
  onChange 
}: SwitchControlProps){
    return (
         <div className="flex items-center justify-between rounded-lg border border-border p-4">
                              <div>
                                <Label className="text-base">{label}</Label>
                                <p className="text-sm text-muted-foreground">
                                  {description}
                                </p>
                              </div>
                              <Switch
                                checked={
                                 checked
                                }
                               onCheckedChange={onChange}
                              />
                            </div>
    )
}
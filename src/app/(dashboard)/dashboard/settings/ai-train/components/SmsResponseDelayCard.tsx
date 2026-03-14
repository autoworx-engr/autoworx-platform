import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Timer } from "lucide-react";
import { useSmsDelay, useSaveSmsDelay } from "@/hooks/sales-agent/useSmsDelay";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SmsResponseDelayCard = () => {
  const { data, isLoading } = useSmsDelay();
  const saveSmsDelay = useSaveSmsDelay();
  const [minDelay, setMinDelay] = useState(30);
  const [maxDelay, setMaxDelay] = useState(120);

  useEffect(() => {
    if (data) {
      setMinDelay(data.smsResponseDelayMin ?? 30);
      setMaxDelay(data.smsResponseDelayMax ?? 120);
    }
  }, [data]);

  const handleSave = () => {
    saveSmsDelay.mutate({
      smsResponseDelayMin: minDelay,
      smsResponseDelayMax: maxDelay,
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            SMS Response Delay
          </div>
          <div>
            <Button
              onClick={handleSave}
              disabled={saveSmsDelay.isPending}
              size="lg"
            >
              {saveSmsDelay.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save</>
              )}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Add a random delay before responding to SMS messages to make it feel
          more human-like
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Minimum Delay (seconds)</Label>
            <Input
              type="number"
              name="minDelay"
              min={0}
              max={300}
              value={minDelay}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                e.target.value = String(v);
                setMinDelay(v);
              }}
              //   disabled={isLoading || saveSmsDelay.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Shortest wait time before AI responds
            </p>
          </div>
          <div className="space-y-2">
            <Label>Maximum Delay (seconds)</Label>
            <Input
              type="number"
              name="maxDelay"
              min={0}
              max={600}
              value={maxDelay}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                e.target.value = String(v);
                setMaxDelay(v);
              }}
              //   disabled={isLoading || saveSmsDelay.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Longest wait time (a random value in range is used)
            </p>
          </div>
        </div>
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm">
            <strong>Current setting:</strong> The AI will wait between{" "}
            <Badge variant="outline">{minDelay ?? 30}s</Badge> and{" "}
            <Badge variant="outline">{maxDelay ?? 120}s</Badge> before sending a
            response, simulating natural typing and thinking time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmsResponseDelayCard;

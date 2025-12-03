import { Button } from "@/components/ui/button";
import { CameraIcon, ScanLine } from "lucide-react";

type TBarcodeScanTabProps = {
  isCameraActive: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCaptureFrame: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
};

export default function BarcodeScanTab({
  isCameraActive,
  onStartCamera,
  onStopCamera,
  onCaptureFrame,
  videoRef,
  canvasRef,
}: TBarcodeScanTabProps) {
  console.log("isCameraActive:", isCameraActive);
  return (
    <div className="space-y-4">
      {!isCameraActive ? (
        <>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-inner text-center space-y-6">
            <button
              onClick={onStartCamera}
              className="relative mx-auto w-32 h-32 group"
            >
              <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-xl group-active:scale-95 transition-transform">
                <ScanLine size={48} />
              </div>
              {/* Decorative corner brackets */}
              <div className="absolute top-0 left-0 w-full h-full border-2 border-dashed border-blue-300 rounded-full animate-[spin_10s_linear_infinite]"></div>
            </button>

            <div>
              <h2 className="text-xl font-bold text-slate-800">Tap to Scan</h2>
              <p className="text-slate-500 text-sm mt-2">
                Point your device at the VIN barcode to decode vehicle details
                instantly.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-64 w-full object-cover"
            />
            {/* Barcode scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-48 border-2 border-white opacity-75" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" width="640" height="480" />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onCaptureFrame}
              className="flex-1 bg-black text-white hover:bg-gray-900"
            >
              Capture
            </Button>
            <Button
              type="button"
              onClick={onStopCamera}
              variant="outline"
              className="flex-10 bg-white text-black border-black hover:bg-gray-100"
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { CameraIcon, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { createWorker } from "tesseract.js";

type TTextScanTabProps = {
  onDetectedValue?: (vin: string) => void;
};

const vinRegex = /[A-HJ-NPR-Z0-9]{17}/g; // basic VIN pattern

export default function TextScanTab({ onDetectedValue }: TTextScanTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const onStartCamera = async () => {
    setIsCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  const onCaptureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // capture frame
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const worker = await createWorker("eng");
    const { data } = await worker.recognize(canvas);
    await worker.terminate();

    const text = data.text.toUpperCase();
    console.log("OCR text:", text);

    const matches = text.match(vinRegex);
    console.log(matches);

    if (matches && matches.length) {
      const vin = matches[0];
      onDetectedValue && onDetectedValue(vin);
    }
    setLoading(false);
  };
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
              // playsInline
              className="h-64 w-full object-cover"
            />
            {/* Barcode scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-48 border-2 border-blue-500 opacity-75" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" width="640" height="480" />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onCaptureFrame}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Loading..." : "Capture"}
            </Button>
            <Button
              type="button"
              onClick={stopCamera}
              variant="outline"
              className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-700 bg-transparent"
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { errorToast } from "@/lib/toast";
import { extractVin } from "@/utils/findVin";
import { ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TTextScanTabProps = {
  onDetectedValue?: (vin: string) => void;
};

export default function TextScanTab({ onDetectedValue }: TTextScanTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // NEW: State to control the camera flash effect
  const [isFlashing, setIsFlashing] = useState(false);

  const onStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", stopCamera);
      });
      setIsCameraActive(true);
    } catch (err) {
      errorToast("Unable to access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Assign the stream once the <video> element has actually mounted
  // (it only renders after isCameraActive flips to true).
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const onCaptureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      errorToast("Camera preview isn't ready yet. Please try again.");
      return;
    }

    // NEW: Trigger the visual flash effect instantly
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150); // Flash duration of 150ms

    setLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // capture frame
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const file = new File([blob], "captured-vin.jpg", {
            type: "image/jpeg",
          });
          await onCaptureImage(file);
        }
        setLoading(false);
      },
      "image/jpeg",
      0.9,
    );
  };

  const onCaptureImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        errorToast("Failed to upload photos");
      }

      const json = await uploadRes.json();
      const imageUrl = json?.data?.[0];

      const url = "https://agent.autoworx.tech/webhook/image-extract";

      const data = {
        s3_url: imageUrl,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      const getVinCode = extractVin(result);
      if (!getVinCode) {
        errorToast("Failed to extract VIN");
        return;
      }
      onDetectedValue && onDetectedValue(getVinCode);
    } catch (err) {
      errorToast("Failed to capture image");
    }
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
              playsInline
              muted
              className="h-64 w-full object-cover"
            />

            {/* NEW: White flash overlay that appears briefly on capture */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-20 transition-opacity duration-75" />
            )}

            {/* Barcode scanning frame overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="h-32 w-48 border-2 border-blue-500 opacity-75 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" width="640" height="480" />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onCaptureFrame}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 relative overflow-hidden"
              disabled={loading}
            >
              {loading ? "Scanning..." : "Capture"}
            </Button>
            <Button
              type="button"
              onClick={stopCamera}
              variant="outline"
              className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-700 bg-transparent"
              disabled={loading}
            >
              Close Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

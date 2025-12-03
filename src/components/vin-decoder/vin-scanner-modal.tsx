"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextScanTab from "./text-scan-tab";
import BarcodeScanTab from "./barcode-scan-tab";

interface VINScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (vin: string) => void;
}

export default function VINScannerModal({
  isOpen,
  onClose,
  onScanComplete,
}: VINScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"barcode" | "text">("barcode");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      console.log("Camera stream started");
      console.log("videoRef.current:", videoRef.current);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        console.log("Setting isCameraActive to true");
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        // In a real app, you would send this to a barcode/OCR service
        // For now, simulate detection
        const mockVin =
          "JTHBP5C22A5" + Math.random().toString(36).substring(7).toUpperCase();
        onScanComplete(mockVin.substring(0, 17));
      }
    }
  };

  const handleTextSubmit = () => {
    if (manualInput.length >= 5) {
      onScanComplete(manualInput.toUpperCase());
      setManualInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-black hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <h2 className="mb-6 text-2xl font-bold text-black">Scan VIN</h2>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b ">
          <button
            type="button"
            onClick={() => {
              setActiveTab("barcode");
              stopCamera();
              setIsCameraActive(false);
            }}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "barcode"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Barcode Scan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              stopCamera();
              setIsCameraActive(false);
            }}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "text"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Text Input
          </button>
        </div>

        {/* Barcode Tab */}
        {activeTab === "barcode" && (
          <BarcodeScanTab
            canvasRef={canvasRef}
            videoRef={videoRef}
            isCameraActive={isCameraActive}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCaptureFrame={captureFrame}
          />
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <TextScanTab
            canvasRef={canvasRef}
            videoRef={videoRef}
            isCameraActive={isCameraActive}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCaptureFrame={captureFrame}
          />
        )}

        {/* Manual Input Fallback */}
        <div className="mt-6 border-t pt-6">
          <p className="mb-3 text-sm font-medium text-black">
            Or enter manually:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value.toUpperCase())}
              placeholder="Enter VIN"
              maxLength={17}
              className="flex-1 rounded border border-black bg-white px-3 py-2 text-white placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <Button
              type="button"
              onClick={handleTextSubmit}
              disabled={manualInput.length < 5}
              className="bg-white text-black hover:bg-gray-400 disabled:bg-gray-500 py-4 disabled:text-gray-400"
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

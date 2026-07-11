"use client";
import { useEffect } from "react";
import { useVoiceDevice } from "@/context/VoiceDeviceContext";
import IncomingCallAlert from "@/app/(dashboard)/dashboard/communication/client/_component/phone/IncomingCallAlert";

interface VoiceAutoSetupProps {
  phoneNumber: string | null;
  provider: "TWILIO" | "INFOBIP";
}

export default function VoiceAutoSetup({
  phoneNumber,
  provider,
}: VoiceAutoSetupProps) {
  const {
    setupDevice,
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    isDeviceReady,
    currentConnection,
    callDuration,
    isMuted,
    toggleMute,
  } = useVoiceDevice();

  useEffect(() => {
    // Automatically setup device when component mounts and we have a phone number
    if (phoneNumber && !isDeviceReady) {
      console.log(`🚀 Auto-setting up ${provider} device for incoming calls`);
      setupDevice(phoneNumber, provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, isDeviceReady, provider]); // Remove setupDevice from dependencies to prevent loops

  // Global incoming call modal
  return (
    <IncomingCallAlert
      incomingCall={incomingCall}
      onAccept={acceptIncomingCall}
      onReject={rejectIncomingCall}
      onEndCall={endCall}
      isConnected={!!currentConnection}
      callDuration={callDuration}
      isMuted={isMuted}
      onToggleMute={toggleMute}
    />
  );
}

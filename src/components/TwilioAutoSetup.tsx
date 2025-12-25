"use client";
import { useEffect } from "react";
import { useTwilioDevice } from "@/context/TwilioDeviceContext";
import IncomingCallAlert from "@/app/(dashboard)/dashboard/communication/client/_component/phone/IncomingCallAlert";

interface TwilioAutoSetupProps {
  twilioPhoneNumber: string | null;
}

export default function TwilioAutoSetup({
  twilioPhoneNumber,
}: TwilioAutoSetupProps) {
  const {
    setupDevice,
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    isDeviceReady,
    currentConnection,
    callDuration,
  } = useTwilioDevice();

  useEffect(() => {
    // Automatically setup device when component mounts and we have a phone number
    if (twilioPhoneNumber && !isDeviceReady) {
      console.log("🚀 Auto-setting up Twilio device for incoming calls");
      setupDevice(twilioPhoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twilioPhoneNumber, isDeviceReady]); // Remove setupDevice from dependencies to prevent loops

  // Global incoming call modal
  return (
    <IncomingCallAlert
      incomingCall={incomingCall}
      onAccept={acceptIncomingCall}
      onReject={rejectIncomingCall}
      isConnected={!!currentConnection}
      callDuration={callDuration}
    />
  );
}

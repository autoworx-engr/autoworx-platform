"use client";
import { useEffect, useState } from "react";

const NotificationHandler = () => {
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }
  };

  return (
    <div className="notification-handler">
      <p>Push notification status: {permission}</p>
      {permission !== "granted" && (
        <button
          onClick={requestPermission}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Enable Push Notifications
        </button>
      )}
      {permission === "denied" && (
        <p className="mt-2 text-red-500">
          You&apos;ve blocked notifications. Please update your browser settings
          to receive notifications.
        </p>
      )}
    </div>
  );
};

export default NotificationHandler;

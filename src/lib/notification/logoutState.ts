// Shared, module-level flag used to coordinate OneSignal across logout.
//
// When a user logs out we fire OneSignal.logout()/login("unsubscribe") in the
// background. That can trigger the PushSubscription "change" listener in
// InitOneSignalProvider, which would otherwise re-login the user (defeating the
// cleanup) while the auth session hasn't fully propagated yet. The listener
// checks isOneSignalLoggingOut() and bails while a logout is in progress.

let loggingOut = false;

export const setOneSignalLoggingOut = (value: boolean): void => {
  loggingOut = value;
};

export const isOneSignalLoggingOut = (): boolean => loggingOut;

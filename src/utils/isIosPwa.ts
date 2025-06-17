export function isIosPwa() {
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && (isStandalone || (window.navigator as any).standalone);
}

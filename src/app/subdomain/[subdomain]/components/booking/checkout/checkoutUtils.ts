export const TIMER_SECONDS = 600;

export const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");

export const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

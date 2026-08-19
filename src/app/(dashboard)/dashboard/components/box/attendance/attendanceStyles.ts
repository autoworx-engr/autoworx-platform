// text colour lives on the state classes below, never here — otherwise it
// overrides the disabled colour and leaves white text on a light background
export const baseButtonClasses =
  "h-full w-full rounded-xl px-4 py-4 font-semibold transition-all duration-300 xl:px-10 group relative overflow-hidden";

export const disabledClasses =
  "cursor-not-allowed bg-slate-200 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600";

export const primaryGradient =
  "text-white bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5";

export const successGradient =
  "text-white bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40";

export const criticalGradient =
  "text-white bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5";

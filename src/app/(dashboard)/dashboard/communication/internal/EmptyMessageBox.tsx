import { ArrowRight, MessageCircleMore } from "lucide-react";

export default function EmptyMessageBox() {
  return (
    // Main Container: Ensures the content is centered and seamlessly blends with the parent.
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      {/* Central Module: ABSOLUTELY NO BACKGROUND OR SHADOW. It floats visually. */}
      <div className="flex flex-col items-center justify-center text-center p-12 max-w-3xl w-full transition-all duration-500 ease-out">
        {/* Header Icon: Dynamic Gradient Focal Point with a soft, page-integrated look */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00b8b0]/15 to-[#0098da]/15 flex items-center justify-center transition-all duration-500 ease-in-out hover:scale-[1.05]">
            <MessageCircleMore
              className="w-10 h-10 text-[#0098da] animate-pulse-slow"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Primary Heading: Clear, Modern, and professional font weight */}
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          Communicate with Your Team
        </h2>

        {/* Subtitle: Direct Instructions with Muted Color */}
        <p className="text-xl font-light text-slate-600 dark:text-slate-300 mb-10">
          Select a contact or a group from the left sidebar to open a dedicated
          chat window.
        </p>

        {/* Feature List: Clean, icon-driven, and centered for integration */}
        <div className="w-full space-y-5 mb-10 text-slate-600 dark:text-slate-400">
          {/* Feature 1: Instant Messaging */}
          <div className="flex items-center justify-center gap-4 text-left text-lg">
            <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-white">
              Real-Time Messaging
            </span>
            <span className="text-base text-slate-600 dark:text-slate-400">
              — Send and receive messages instantly.
            </span>
          </div>

          {/* Feature 2: Files and Attachments */}
          <div className="flex items-center justify-center gap-4 text-left text-lg">
            <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-white">
              Secure Attachments
            </span>
            <span className="text-base text-slate-600 dark:text-slate-400">
              — Share files securely with your team.
            </span>
          </div>

          {/* Feature 3: Group Management */}
          <div className="flex items-center justify-center gap-4 text-left text-lg">
            <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-white">
              Efficient Group Chats
            </span>
            <span className="text-base text-slate-600 dark:text-slate-400">
              — Manage multi-user conversations easily.
            </span>
          </div>
        </div>

        {/* Footer Accent: Subtly anchoring the center of the page */}
        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#0098da]/70 to-transparent rounded-full mt-4" />
      </div>

      {/* Tailwind Keyframes for the custom animation classes used above */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

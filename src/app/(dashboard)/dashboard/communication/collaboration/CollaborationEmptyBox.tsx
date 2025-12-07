"use client";

import React from "react";
import { Users, MessageSquare, Paperclip, UserPlus, Tag, Box } from "lucide-react";

export default function CollaborationEmptyBox() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center justify-center text-center p-10 max-w-3xl w-full transition-all duration-500 ease-out">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f0f9f8] to-[#e6f7ff] flex items-center justify-center transition-all duration-500 ease-in-out">
            <Users className="w-10 h-10 text-[#007a72]" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
          Start Your Collaboration
        </h2>

        <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
          Create a channel, invite teammates, or start a direct message to begin
          team discussions and coordinate work in real-time.
        </p>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-white shadow-sm">
              <MessageSquare className="w-6 h-6 text-slate-700" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Real-time chat</div>
              <div className="text-sm text-slate-500">Send messages and stay in sync instantly.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-white shadow-sm">
              <Paperclip className="w-6 h-6 text-slate-700" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Share files</div>
              <div className="text-sm text-slate-500">Attach documents, images, and assets securely.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-white shadow-sm">
              <UserPlus className="w-6 h-6 text-slate-700" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Invite teammates</div>
              <div className="text-sm text-slate-500">Bring others into channels to collaborate together.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-white shadow-sm">
              <Tag className="w-6 h-6 text-slate-700" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Organize with tags</div>
              <div className="text-sm text-slate-500">Label conversations and tasks for easy discovery.</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700">
            <Box className="w-4 h-4" />
            Create Channel
          </button>

          <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-slate-700 bg-white hover:bg-slate-50">
            Invite Teammates
          </button>
        </div>
      </div>
    </div>
  );
}

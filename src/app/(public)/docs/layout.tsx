"use client";
import React, { useState } from "react";
import DocSidebar from "./_components/DocSidebar";

interface DocLayoutProps {
  children: React.ReactNode;
}

const DocLayout = ({ children }: DocLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header toggleSidebar={toggleSidebar} /> */}

      <div className="flex flex-1">
        <DocSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DocLayout;

import React from "react";
import MainContentArea from "@/layout/MainContentArea";
import SessionProviderWrapper from "@/components/auth/SessionProviderWrapper"
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  // Dynamic class for main content margin based on sidebar state

  return (
    <div className="min-h-screen xl:flex">
      <SessionProviderWrapper>
        <MainContentArea>
          {children}
        </MainContentArea>
      </SessionProviderWrapper>
    </div>
  );
}

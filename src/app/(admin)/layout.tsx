import React from "react";
import MainContentArea from "@/layout/MainContentArea";
import SessionProviderWrapper from "@/components/auth/SessionProviderWrapper"
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {

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

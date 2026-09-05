import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PayrollTabs from "./PayrollTabs";

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageBreadcrumb pageTitle="Nómina" />
      <div className="mt-5 flex flex-col gap-5 sm:mt-6 sm:gap-6">
        <PayrollTabs />
        {children}
      </div>
    </div>
  );
}

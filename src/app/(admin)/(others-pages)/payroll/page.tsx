import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PayrollClient from "./PayrollClient";

export default function PayrollPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Nómina Semanal" />
      <div className="mt-5 sm:mt-6">
        <PayrollClient />
      </div>
    </div>
  );
}

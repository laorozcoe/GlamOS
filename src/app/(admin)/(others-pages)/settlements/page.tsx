import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SettlementsClient from "./SettlementsClient";

export default function SettlementsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Liquidaciones y Depósitos" />
      <div className="mt-5 sm:mt-6">
        <SettlementsClient />
      </div>
    </div>
  );
}

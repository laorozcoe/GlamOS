import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BonusRulesClient from "./BonusRulesClient";

export default function BonusRulesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bonos" />
      <div className="mt-5 sm:mt-6">
        <BonusRulesClient />
      </div>
    </div>
  );
}

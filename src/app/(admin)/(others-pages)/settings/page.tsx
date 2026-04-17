import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SettingsClient from "./SettingsClient";

export default function SettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Configuración del Negocio" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <SettingsClient />
      </div>
    </div>
  );
}

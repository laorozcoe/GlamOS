import React from "react";
import AttendanceClient from "./AttendanceClient";


import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function AttendancePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Control de Asistencia" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <AttendanceClient />
      </div>
    </div>
  );
}

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeClient from "./EmployeeClient";
import { getEmployees } from "./actions";

export default async function EmployeesPage() {
  const users = await getEmployees();

  return (
     <div>
      <PageBreadcrumb pageTitle="Empleados" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
         <EmployeeClient users={users} />
      </div>
    </div>
  );
}

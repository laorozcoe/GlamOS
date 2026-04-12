import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EmployeeClient from "./EmployeeClient";
import { getEmployees } from "./actions";

export default async function EmployeesPage() {
  const users = await getEmployees();

  return (
    <div>
      <PageBreadcrumb pageTitle="Usuarios y Empleados" />
      <div className="mt-5 sm:mt-6">
        <EmployeeClient users={users} />
      </div>
    </div>
  );
}

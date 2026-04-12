import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PermissionsClient from "./PermissionsClient";
import { getEmployeesWithPermissions } from "./actions";

export default async function PermissionsPage() {
  const employees = await getEmployeesWithPermissions();

  return (
    <div>
      <PageBreadcrumb pageTitle="Permisos y Roles" />
      <div className="mt-5 sm:mt-6">
        <PermissionsClient employees={employees} />
      </div>
    </div>
  );
}

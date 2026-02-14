import { getClientsPrisma, getEmployeesPrisma } from "@/lib/prisma"; // Tu función de búsqueda
import CustomerTable from "@/components/customers/index";
import { getBusiness } from "@/lib/getBusiness";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default async function CustomersPage() {
    const business = await getBusiness();
    const customers = await getClientsPrisma(business?.id);
    const employees = await getEmployeesPrisma(business?.id);
    return (
        <div>
            <PageBreadcrumb pageTitle="Clientes" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                <CustomerTable customers={customers} employees={employees} />
            </div>
        </div>
    )
}
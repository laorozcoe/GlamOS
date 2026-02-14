import { getClientsPrisma } from "@/lib/prisma"; // Tu función de búsqueda
import CustomerTable from "@/components/customers/CustomerTable";
import { getBusiness } from "@/lib/getBusiness";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default async function CustomersPage() {
    const business = await getBusiness();
    const customers = await getClientsPrisma(business?.id);
    return (
        <div>
            <PageBreadcrumb pageTitle="Clientes" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                <div className="mb-6 flex justify-center sm:justify-end items-center">
                    <button className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        Nuevo Cliente
                    </button>
                </div>
                <CustomerTable customers={customers} />
            </div>
        </div>
    )
}
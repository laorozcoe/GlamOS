// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// import { Metadata } from "next";
// import React from "react";

// export default function BlankPage() {
//     return (
//         <div>
//             <PageBreadcrumb pageTitle="Clientes" />
//             <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
//                 <div className="mx-auto w-full max-w-[630px] text-center">
//                     <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
//                         Card Title Here
//                     </h3>
//                     <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
//                         Start putting content on grids or panels, you can also use different
//                         combinations of grids.Please check out the dashboard and other pages
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }


import { getClientsPrisma } from "@/lib/prisma"; // Tu función de búsqueda
import CustomerTable from "@/components/customers/CustomerTable";
import { getBusiness } from "@/lib/getBusiness";

export default async function CustomersPage() {
    const business = await getBusiness();
    const customers = await getClientsPrisma(business?.id);

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Base de Clientes</h1>
                <button className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    + Nuevo Cliente
                </button>
            </div>

            <CustomerTable customers={customers} />
        </div>
    );
}
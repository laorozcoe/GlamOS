import { getSalesPrisma } from "@/lib/prisma";
import SalesTable from "@/components/sales/index";
import { getBusiness } from "@/lib/getBusiness";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

// Desactiva la caché estática: los datos se releen en cada visita y en cada
// router.refresh().
export const dynamic = "force-dynamic";

export default async function SalesPage() {
    const business = await getBusiness();
    const sales = await getSalesPrisma(business?.id);

    return (
        <div>
            <PageBreadcrumb pageTitle="Ventas" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                <SalesTable sales={sales} />
            </div>
        </div>
    );
}

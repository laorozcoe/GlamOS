import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PromotionsClient from "./PromotionsClient";
import { getPromotions } from "./actions";

export default async function PromotionsPage() {
  const promotions = await getPromotions();

  return (
    <div>
      <PageBreadcrumb pageTitle="Promociones" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <PromotionsClient initialPromotions={promotions} />
      </div>
    </div>
  );
}

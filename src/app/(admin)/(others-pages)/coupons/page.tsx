import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CouponsClient from "./CouponsClient";
import { getCoupons } from "./actions";

export default async function CouponsPage() {
  const coupons = await getCoupons();

  return (
    <div>
      <PageBreadcrumb pageTitle="Cupones" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <CouponsClient coupons={coupons as any} />
      </div>
    </div>
  );
}

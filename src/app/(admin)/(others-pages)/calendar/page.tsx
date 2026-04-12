import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ApprovalWidget from "@/components/calendar/ApprovalWidget";

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Agenda" />
      <ApprovalWidget />
      <Calendar />
    </div>
  );
}

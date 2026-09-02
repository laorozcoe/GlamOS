import React from "react";
import { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Reportes y Analíticas | GlamOS",
  description: "Dashboard de reportes avanzados",
};

export default function ReportsPage() {
  return <ReportsClient />;
}

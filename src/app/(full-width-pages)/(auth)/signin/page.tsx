
import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
// import { createUserPrisma } from "@/lib/prisma";
// import { getBusiness } from "@/lib/getBusiness";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

export default async function SignIn() {
  // const business = await getBusiness()
  // createUserPrisma("laorozcoe@gmail.com", business?.id, "Luis Alejandro Orozco Estrada", "password", "MANICURIST")
  return <SignInForm />;
}

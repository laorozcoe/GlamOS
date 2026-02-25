
import SignInForm from "@/components/auth/SignInForm";
// import { createUserPrisma } from "@/lib/prisma";
// import { getBusiness } from "@/lib/getBusiness";

export default async function SignIn() {
  // const business = await getBusiness()
  // createUserPrisma("laorozcoe@gmail.com", business?.id, "Luis Alejandro Orozco Estrada", "password", "EMPLOYEE")
  return <SignInForm />;
}

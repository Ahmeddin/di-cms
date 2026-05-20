"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(values: any) {
  try {
    console.log(">>> [ACTION] Login Action Start for:", values.email);
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    console.log(">>> [ACTION] Login Action Success for:", values.email);
    return { success: true };
  } catch (error) {
    console.log(">>> [ACTION] Login Action Caught Error:", (error as any).name, (error as any).message);
    if ((error as any).digest?.includes("NEXT_REDIRECT")) {
        console.log(">>> [ACTION] Re-throwing redirect error");
        throw error;
    }

    if (error instanceof AuthError) {
      console.log(">>> [ACTION] AuthError detected:", error.type);
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." };
        default:
          return { success: false, error: "Something went wrong during sign in." };
      }
    }
    
    console.error(">>> [ACTION] Unexpected Error:", error);
    return { success: false, error: "Internal server error." };
  }
}

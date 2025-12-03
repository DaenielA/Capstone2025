'use server'

import { AuthenticateUser, SetSessionCookie } from '@/lib/auth'
// It's a good practice to handle environment variables centrally.
// Assuming you have a config file or you can do it in your auth library.
// The key MUST be a Uint8Array for 'jose'.
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
import { redirect } from 'next/navigation'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

interface ActionResult {
  success: boolean
  message: string
  redirectUrl?: string
}

export async function LoginUser(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.errors.map(e => e.message).join(' ')
    return { success: false, message: errorMessage }
  }

  const { email, password } = validatedFields.data

  const authResult = await AuthenticateUser(email, password);

  // Handle authentication failure directly.
  if (!authResult.success) {
    // The message from AuthenticateUser (e.g., "Invalid password" or "User has no role") will be shown.
    return { success: false, message: authResult.message };
  }

  // From here, we know authentication was successful and we have a user and token.
  try {
    // ✅ Authentication is successful, proceed with setting cookie and redirect URL
    await SetSessionCookie(authResult.token!); // Assuming token is present on success

    // Determine redirect URL based on user role
    let redirectUrl: string;
    // We can safely access Role.Name because AuthenticateUser guarantees it on success.
    const roleName = authResult.user.RoleName;

    if (roleName === 'Administrator') redirectUrl = '/admin';
    else if (roleName === 'Cashier') redirectUrl = '/pos';
    else if (roleName === 'Member') redirectUrl = '/members';
    else {
      // This case handles an unknown but valid role value.
      console.error(`Login success but role is unknown or missing for user: ${authResult.user.Email}. Role data:`, authResult.user.RoleName);
      return { success: false, message: "Login successful, but user role is not configured correctly. Please contact an administrator." };
    }

    // This call will throw an internal exception that Next.js handles for the redirect.
    redirect(redirectUrl);
    // The redirect function throws an error, so we don't need to return anything here.
    // However, to satisfy TypeScript, we can add a return, though it's unreachable.
    return { success: true, message: "Redirecting...", redirectUrl };
  } catch (error) {
    // The redirect function throws a NEXT_REDIRECT error, which is a normal part of the process.
    // We must re-throw it so Next.js can handle the redirect.
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in login server action (post-authentication):", error);
    return { success: false, message: "An unexpected error occurred after login. Please try again." };
  }
}

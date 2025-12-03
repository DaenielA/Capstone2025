"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { User, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { LoginUser } from './actions'

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" aria-disabled={pending}>
      {pending ? "Logging in..." : "Login"}
    </Button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(LoginUser, undefined);

  useEffect(() => {
    if (state?.success && state.redirectUrl) {
      // Default to /dashboard if redirectUrl is present but empty
      router.push(state.redirectUrl || '/dashboard');
    }
  }, [state, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Image 
              src="/pandol-logo.png" 
              alt="Pandol Cooperative Logo" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
            <span className="text-2xl font-bold text-gray-900">Pandol Cooperative</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Login to access the Pandol Cooperative system</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6 text-center">
                <Image 
                  src="/pandol-logo.png" 
                  alt="Pandol Cooperative Logo" 
                  width={64} 
                  height={64} 
                  className="mx-auto mb-4"
                />
              </div>

              {state && !state.success && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}

              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Remember me checkbox (requires logic) */}
                  </div>
                  {/* Forgot password link (requires logic) */}
                </div>
                <LoginButton />
              </form>

              <div className="mt-6 text-center">
                <div className="text-sm text-gray-600">
                  <span>Don't have an account? </span>
                  <Link href="/#contact" className="text-amber-600 hover:underline">
                    Contact the cooperative
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-amber-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

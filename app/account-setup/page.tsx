"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, AlertCircle, Loader2, Key, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

function AccountSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") // Add optional chaining
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      router.push("/login")
    }
  }, [token, router])

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    // Length check
    if (password.length >= 8) strength += 1
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1
    // Contains number
    if (/[0-9]/.test(password)) strength += 1
    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    setPasswordStrength(strength)
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to complete account setup")
        return
      }

      setSuccess(true)
      
      // Redirect to login after success
      setTimeout(() => {
        router.push(data.redirectUrl || "/login")
      }, 2000)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Account setup error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return ""
    if (passwordStrength <= 2) return "Weak"
    if (passwordStrength <= 4) return "Medium"
    return "Strong"
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200"
    if (passwordStrength <= 2) return "bg-red-500"
    if (passwordStrength <= 4) return "bg-amber-500"
    return "bg-green-500"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Complete Your Account Setup</CardTitle>
            <CardDescription className="text-center">
              Create a password to access your member account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Your account has been set up successfully! Redirecting to login...
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {password && (
                    <span className={`text-xs ${
                      passwordStrength <= 2 ? "text-red-500" : 
                      passwordStrength <= 4 ? "text-amber-500" : "text-green-500"
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    disabled={isLoading || success}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Password should be at least 8 characters and include uppercase, lowercase, numbers, and special characters.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={isLoading || success}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600"
                disabled={isLoading || success}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting Up Account...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" /> Complete Account Setup
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Already have an account? <a href="/login" className="text-amber-600 hover:underline">Sign in</a>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AccountSetup />
    </Suspense>
  )
}
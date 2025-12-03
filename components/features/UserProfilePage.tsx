"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Shield, Calendar, AlertCircle, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserData, UserProfileData } from "@/app/actions/userActions";
import { Separator } from "@/components/ui/separator";

interface UserProfilePageProps {
  userType: "admin" | "cashier";
  dashboardPath: string;
  pageTitle: string;
}

export default function UserProfilePage({ userType, dashboardPath, pageTitle }: UserProfilePageProps) {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        setIsLoading(true);
        const data = await getCurrentUserData();
        if (data) {
          setProfileData(data);
        } else {
          setError("Could not retrieve your profile data. Please try again.");
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile information...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error || "Unable to load profile information. Please try again later."}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType={userType} userName={profileData.name} />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.location.href = dashboardPath}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{pageTitle}</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your personal and role-based information.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center md:flex-row md:items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="h-28 w-28 rounded-full bg-amber-100 flex items-center justify-center">
                      <User className="h-14 w-14 text-amber-500" />
                    </div>
                  </div>
                  <div className="w-full">
                    <h2 className="text-2xl font-bold text-center md:text-left">{profileData.name}</h2>
                    <p className="text-gray-500 text-center md:text-left capitalize">{profileData.role}</p>
                    
                    <Separator className="my-6" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email Address</p>
                          <p className="font-medium break-all">{profileData.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-1">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Role</p>
                          <p className="font-medium capitalize">{profileData.role}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                          <Calendar className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Account Created</p>
                          <p className="font-medium">
                            {new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
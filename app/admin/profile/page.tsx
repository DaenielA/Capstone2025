"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  X,
  Eye,
  EyeOff
} from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { getCurrentUserData, UserProfileData } from "@/app/actions/userActions"
import Image from "next/image"

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [emailData, setEmailData] = useState({
    newEmail: "",
    password: ""
  });
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: "",
    email: "",
    phone: ""
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (user === undefined) {
        return;
      }

      setIsLoading(true);
      if (user) {
        try {
          const data = await getCurrentUserData();
          if (data) {
            setProfileData(data);
            setFormData({
              name: data.name,
              email: data.email,
              phone: "" // Phone not stored for users, only members
            });
          } else {
            setError("Could not retrieve profile data. Please try again.");
          }
        } catch (e) {
          setError("An error occurred while fetching profile data.");
        }
      } else {
        setError("You must be logged in to view this page.");
      }
      setIsLoading(false);
    };

    fetchProfileData();
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle password input changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Handle email input changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileData) return;

    try {
      setIsSaving(true);

      // For now, just update the local state since user profile updates aren't implemented yet
      setProfileData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: formData.name,
          email: formData.email
        };
      });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Password validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });

        // Reset form and close modal
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswordModal(false);
      } else {
        toast({
          title: "Password Change Failed",
          description: data.error || "There was an error changing your password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Password Change Failed",
        description: "There was an error changing your password. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle email change submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/users/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: emailData.newEmail,
          password: emailData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the profile data with the new email
        setProfileData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            email: emailData.newEmail
          };
        });

        toast({
          title: "Email Updated",
          description: "Your email address has been changed successfully.",
        });

        // Reset form and close modal
        setEmailData({
          newEmail: "",
          password: ""
        });
        setShowEmailModal(false);
      } else {
        toast({
          title: "Email Change Failed",
          description: data.error || "There was an error changing your email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error changing email:', error);
      toast({
        title: "Email Change Failed",
        description: "There was an error changing your email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // If loading, show loading spinner
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

  // If error, show error message
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
      <Navbar userType="admin" userName={profileData.name} />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => window.location.href = '/admin'}
              >
                <span>Back to Dashboard</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="md:col-span-1"
            >
              <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <Image
                      src="/pandol-logo.png"
                      alt="Pandol Cooperative Logo"
                      width={100}
                      height={100}
                      className="mb-4 rounded-full"
                    />
                    <h2 className="text-xl font-bold text-center">{profileData.name}</h2>
                    <p className="text-gray-500 text-center capitalize">{profileData.role}</p>
                    <p className="text-sm text-gray-500 text-center mt-1">Joined {new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{profileData.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Profile Edit Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="md:col-span-2"
            >
              <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    {isEditing
                      ? "Update your personal information below"
                      : "View your personal information"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="name"
                              name="name"
                              placeholder="Your full name"
                              className="pl-10"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="Your email address"
                              className="pl-10"
                              value={formData.email}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {isEditing && (
                        <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Contact the system administrator to change your name or other restricted information.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setFormData({
                                name: profileData.name,
                                email: profileData.email,
                                phone: ""
                              });
                            }}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        >
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card className="bg-white shadow-sm hover:shadow-md transition-shadow mt-6">
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>
                    Manage your account security settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Password</h3>
                        <p className="text-sm text-gray-500">Last changed: Never</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Change Password
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Email Address</h3>
                        <p className="text-sm text-gray-500">Current: {profileData.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowEmailModal(true)}
                      >
                        Change Email
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline" disabled>Coming Soon</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Change Password</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPasswordModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      className="pl-10"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="Enter your new password"
                      className="pl-10"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      className="pl-10"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                </div>
                <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password must be at least 8 characters long and include a mix of letters, numbers, and special characters.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Change Email Address</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowEmailModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form onSubmit={handleEmailSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="newEmail"
                      name="newEmail"
                      type="email"
                      placeholder="Enter your new email address"
                      className="pl-10"
                      value={emailData.newEmail}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="emailPassword"
                      name="emailPassword"
                      type="password"
                      placeholder="Enter your current password"
                      className="pl-10"
                      value={emailData.password}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>
                </div>
                <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Changing your email address will require you to verify the new email before it takes effect.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Update Email
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

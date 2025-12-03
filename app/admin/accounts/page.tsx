"use client"

import type React from "react";

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { User, Users, X, CheckCircle2, Search, UserPlus, Mail, Key, BadgeCheck, AlertTriangle, RefreshCw } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

// Interface definitions
interface User {
  UserId: number
  Name: string
  Email: string
  RoleId: number
  RoleName: 'admin' | 'cashier' | 'Member' | 'Administrator' | 'Manager'
  CreatedAt: string
  UpdatedAt: string
}

interface Role {
  RoleId: number
  Name: string
  Description: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AccountsPage() {
  // State for UI
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("The account has been created successfully.")
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ Name: "", Email: "", RoleId: 0, status: "active" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // State for filtering and searching
  const [searchQuery, setSearchQuery] = useState("")
  const [accountType, setAccountType] = useState("all")
  const [isSearching, setIsSearching] = useState(false)

  // State for form 
  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Phone: "",
    Password: "",
    ConfirmPassword: "",
    RoleId: 0,
    Address: "",
    InitialCredit: 0,
    CreditLimit: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // State for data
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  })

  // Fetch users and roles when page loads
  useEffect(() => {
    const initializeData = async () => {
      // First load roles
      try {
        await fetchRoles();
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
      
      // Then fetch users (with a slight delay to ensure auth is ready)
      setTimeout(() => fetchWithRetry(fetchUsers), 500);
    };
    
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch users when search or filter changes
  useEffect(() => {
    // Skip initial render when these values might not be ready
    if (!isLoading) {
      const delayDebounceFn = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, accountType, pagination.page]);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsSearching(true);
      
      // Build the URL with proper query parameters
      let apiUrl = `/api/users?page=${pagination.page}&limit=${pagination.limit}`;
      
      // Add search parameter if provided
      if (searchQuery) {
        apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      // Add role filter if not set to "all"
      if (accountType !== "all") {
        const roleId = getRoleIdByName(accountType);
        if (roleId > 0) {
          apiUrl += `&roleId=${roleId}`;
        }
      }
      
      console.log("Fetching users with URL:", apiUrl);
      const response = await fetch(apiUrl);
      
      // Log response status for debugging
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        // Try to get detailed error message from response
        const errorData = await response.json().catch(() => null);
        console.error("API error details:", errorData);
        
        if (errorData && errorData.errors) {
          console.error("Validation errors:", JSON.stringify(errorData.errors, null, 2));
        }
        
        // Handle specific error cases
        if (response.status === 401) {
          setErrorMessage("You need to be logged in to view users. Please refresh the page or log in again.");
          return;
        } else if (response.status === 403) {
          setErrorMessage("You don't have permission to view users. This feature is only available to administrators and managers.");
          return;
        } else if (response.status === 400 && errorData && errorData.message) {
          setErrorMessage(`Error: ${errorData.message}`);
          return;
        }
        
        throw new Error(`Failed to fetch users (${response.status})`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
        setPagination(data.pagination || {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 1,
        });
      } else {
        console.error("API returned error:", data.message);
        setErrorMessage(data.message || "Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // Fetch with retry
  const fetchWithRetry = async (fn: () => Promise<void>, retries = 2, delay = 1000) => {
    try {
      await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        setTimeout(() => fetchWithRetry(fn, retries - 1, delay), delay);
      } else {
        console.error("Max retries reached");
      }
    }
  };

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/users/roles");
      
      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      
      if (data.success) {
        setRoles(data.roles);
      } else {
        console.error("API returned error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  // Get role ID by name
  const getRoleIdByName = (roleName: string) => {
    if (!roles || roles.length === 0) {
      console.log("No roles available for lookup");
      return 0;
    }
    
    // Try for exact match first
    let role = roles.find(r => r.Name === roleName);
    
    // If no exact match, try case-insensitive matching
    if (!role) {
      console.log(`No exact match for role name "${roleName}", trying case-insensitive match`);
      role = roles.find(r => r.Name.toLowerCase() === roleName.toLowerCase());
    }
    
    if (role) {
      console.log(`Found role: ${role.Name} (ID: ${role.RoleId})`);
      return role.RoleId;
    } else {
      console.log(`No role found with name: ${roleName}`);
      console.log("Available roles:", roles.map(r => `${r.Name} (${r.RoleId})`).join(", "));
      return 0;
    }
  };

  // Get role name by ID
  const getRoleNameById = (roleId: number) => {
    const role = roles.find(r => r.RoleId === roleId);
    return role ? role.Name : "Unknown";
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Handle numeric fields
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : parseFloat(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear errors when user starts typing again
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle role change
  const handleRoleChange = (value: string) => {
    const roleId = parseInt(value);
    setFormData((prev) => ({ ...prev, RoleId: roleId }));
    
    // Clear error
    if (errors.RoleId) {
      setErrors((prev) => ({ ...prev, RoleId: "" }));
  }
  };

  const handleEditRoleChange = (value: string) => {
    const roleId = parseInt(value);
    setEditFormData((prev) => ({ ...prev, RoleId: roleId }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Check that an account type is selected
    if (!formData.RoleId) {
      newErrors.RoleId = "Please select an account type";
    }
    
    // Validate name
    if (!formData.Name.trim()) {
      newErrors.Name = "Name is required";
    }
    
    // Validate email
    if (!formData.Email) {
      newErrors.Email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.Email)) {
      newErrors.Email = "Please enter a valid email address";
    }
    
    // Validate password
    if (!formData.Password) {
      newErrors.Password = "Password is required";
    } else if (formData.Password.length < 6) {
      newErrors.Password = "Password must be at least 6 characters";
    }
    
    // Validate password confirmation
    if (formData.Password !== formData.ConfirmPassword) {
      newErrors.ConfirmPassword = "Passwords do not match";
    }
    
    // If creating a member, validate member-specific fields
    const isMember = roles.find(r => r.RoleId === formData.RoleId)?.Name === "Member";
    
    if (isMember) {
      // InitialCredit should be non-negative
      if (formData.InitialCredit < 0) {
        newErrors.InitialCredit = "Initial credit must be 0 or greater";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Prepare data based on role
        const requestData = {
          Name: formData.Name,
          Email: formData.Email,
          Password: formData.Password,
          RoleId: formData.RoleId,
          Phone: formData.Phone || undefined,
        };
        
        // Add member-specific fields if creating a member
        const isMember = roles.find(r => r.RoleId === formData.RoleId)?.Name === "Member";
        
        if (isMember) {
          Object.assign(requestData, {
            Address: formData.Address || undefined,
            InitialCredit: formData.InitialCredit || 0,
            CreditLimit: formData.CreditLimit || 0,
          });
        }
        
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        const data = await response.json();

        if (data.success) {
          // Show success modal with appropriate message
          const roleName = getRoleNameById(formData.RoleId);
          setSuccessMessage(
            isMember 
              ? `${formData.Name} has been created as a member with an associated user account.` 
              : `Account for ${formData.Name} has been created successfully.`
          );
          setShowCreateModal(false);
          setShowSuccessModal(true);

          // Reset form
          setFormData({
            Name: "",
            Email: "",
            Phone: "",
            Password: "",
            ConfirmPassword: "",
            RoleId: 0,
            Address: "",
            InitialCredit: 0,
            CreditLimit: 0,
          });

          // Refresh user list
          fetchUsers();
        } else {
          setErrors({
            apiError: data.message || "Failed to create account",
          });
        }
      } catch (error) {
        console.error("Error creating account:", error);
        setErrors({
          apiError: "An error occurred while creating the account. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      Name: user.Name,
      Email: user.Email,
      RoleId: user.RoleId,
      // @ts-ignore
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.UserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.Name,
          email: editFormData.Email,
          role: getRoleNameById(editFormData.RoleId),
          RoleId: editFormData.RoleId,
          status: editFormData.status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        fetchUsers(); // Refresh the user list
        setSuccessMessage(`Account for ${editFormData.Name} has been updated successfully.`);
        setShowSuccessModal(true);
      } else {
        setErrors({ apiError: data.message || 'Failed to update account' });
      }
    } catch (error) {
      console.error('Error updating account:', error);
      setErrors({ apiError: 'An error occurred while updating the account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeactivateModal = (user: User) => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.UserId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeactivateModal(false);
        fetchUsers(); // Refresh the user list
        setSuccessMessage(`Account for ${selectedUser.Name} has been deactivated.`);
        setShowSuccessModal(true);
      } else {
        // Handle error in UI
        console.error(data.message);
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (user: User) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.UserId}`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        setSuccessMessage(`Account for ${user.Name} has been reactivated.`);
        setShowSuccessModal(true);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error('Error reactivating account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count users by role
  const countUsersByRole = (roleName: string) => {
    return users.filter((user) => user.RoleName.toLowerCase() === roleName.toLowerCase()).length;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin User" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
              <p className="text-gray-600">Create and manage member and cashier accounts</p>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create New Account
            </Button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <AlertDescription className="text-red-600">{errorMessage}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 text-red-600"
                onClick={() => setErrorMessage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Account Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search accounts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="Member">Members</SelectItem>
                <SelectItem value="Cashier">Cashiers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Accounts</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{pagination.total}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Member Accounts</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{countUsersByRole("member")}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cashier Accounts</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{countUsersByRole("cashier")}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accounts Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Accounts</CardTitle>
              <CardDescription>Manage member and cashier accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      // Loading skeletons
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4"><Skeleton className="h-6 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-6 w-32" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-6 w-40" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-6 w-20" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-6 w-24" /></td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-24" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : isSearching ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin text-amber-500" />
                            <span>Searching...</span>
                          </div>
                        </td>
                      </tr>
                    ) : users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.UserId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{user.UserId}</td>
                          <td className="py-3 px-4">{user.Name}</td>
                          <td className="py-3 px-4">{user.Email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                // @ts-ignore
                                user.status === 'inactive'
                                  ? 'bg-gray-200 text-gray-800'
                                  : user.RoleName.toLowerCase() === "member"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : user.RoleName.toLowerCase() === "cashier"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {/* @ts-ignore */}
                              {user.status === 'inactive' ? 'Inactive' : user.RoleName}
                            </span>
                          </td>
                          <td className="py-3 px-4">{formatDate(user.CreatedAt)}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="h-8" onClick={() => openEditModal(user)}>
                                Edit
                              </Button>
                              {/* @ts-ignore */}
                              {user.status !== 'inactive' ? (
                                <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDeactivateModal(user)}>
                                  Deactivate
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleReactivate(user)}>
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="h-10 w-10 text-gray-300" />
                            <p className="text-gray-500 font-medium">No accounts found</p>
                            {accountType !== "all" || searchQuery ? (
                              <p className="text-gray-400 text-sm">Try changing your search or filter criteria</p>
                            ) : (
                              <p className="text-gray-400 text-sm">
                                Start by creating your first user account
                              </p>
                            )}
                            <Button 
                              onClick={() => setShowCreateModal(true)}
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create New Account
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-md p-6 max-h-screen overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create New Account</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              {errors.apiError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <AlertDescription className="text-red-600">{errors.apiError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="RoleId">Account Type</Label>
                  <Select onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(role => role.Name === "Member" || role.Name === "Cashier").map((role) => (
                        <SelectItem key={role.RoleId} value={role.RoleId.toString()}>
                          {role.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.RoleId && <p className="text-sm text-red-500 mt-1">{errors.RoleId}</p>}
                </div>

                <div>
                  <Label htmlFor="Name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="Name"
                      name="Name"
                      placeholder="Enter full name"
                      className="pl-10"
                      value={formData.Name}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.Name && <p className="text-sm text-red-500 mt-1">{errors.Name}</p>}
                </div>

                <div>
                  <Label htmlFor="Email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="Email"
                      name="Email"
                      type="email"
                      placeholder="Enter email address"
                      className="pl-10"
                      value={formData.Email}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.Email && <p className="text-sm text-red-500 mt-1">{errors.Email}</p>}
                </div>

                <div>
                  <Label htmlFor="Phone">Phone Number</Label>
                  <Input
                    id="Phone"
                    name="Phone"
                    placeholder="Enter phone number"
                    value={formData.Phone}
                    onChange={handleInputChange}
                  />
                  {errors.Phone && <p className="text-sm text-red-500 mt-1">{errors.Phone}</p>}
                </div>

                {formData.RoleId > 0 && getRoleNameById(formData.RoleId) === "Member" && (
                  <>
                    <div>
                      <Label htmlFor="Address">Address</Label>
                      <Input
                        id="Address"
                        name="Address"
                        placeholder="Enter address (optional)"
                        value={formData.Address}
                        onChange={handleInputChange}
                      />
                      {errors.Address && <p className="text-sm text-red-500 mt-1">{errors.Address}</p>}
                    </div>

                    <div>
                      <Label htmlFor="InitialCredit">Initial Credit</Label>
                      <Input
                        id="InitialCredit"
                        name="InitialCredit"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.InitialCredit}
                        onChange={handleInputChange}
                      />
                      {errors.InitialCredit && <p className="text-sm text-red-500 mt-1">{errors.InitialCredit}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="CreditLimit">Credit Limit</Label>
                      <Input
                        id="CreditLimit"
                        name="CreditLimit"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.CreditLimit}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum amount of credit this member can use for purchases</p>
                      {errors.CreditLimit && <p className="text-sm text-red-500 mt-1">{errors.CreditLimit}</p>}
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="Password">Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="Password"
                      name="Password"
                      type="password"
                      placeholder="Enter password"
                      className="pl-10"
                      value={formData.Password}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.Password && <p className="text-sm text-red-500 mt-1">{errors.Password}</p>}
                </div>

                <div>
                  <Label htmlFor="ConfirmPassword">Confirm Password</Label>
                  <Input
                    id="ConfirmPassword"
                    name="ConfirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.ConfirmPassword}
                    onChange={handleInputChange}
                  />
                  {errors.ConfirmPassword && <p className="text-sm text-red-500 mt-1">{errors.ConfirmPassword}</p>}
                </div>
              </div>

              <Alert className="mb-4">
                <AlertDescription>
                  A welcome email with login instructions will be sent to the user's email address.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && selectedUser && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>Update details for {selectedUser.Name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              {errors.apiError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <AlertDescription className="text-red-600">{errors.apiError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="EditName">Full Name</Label>
                  <Input
                    id="EditName"
                    name="Name"
                    value={editFormData.Name}
                    onChange={(e) => setEditFormData({ ...editFormData, Name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="EditEmail">Email Address</Label>
                  <Input
                    id="EditEmail"
                    name="Email"
                    type="email"
                    value={editFormData.Email}
                    onChange={(e) => setEditFormData({ ...editFormData, Email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="EditRoleId">Account Type</Label>
                  <Select
                    value={editFormData.RoleId.toString()}
                    onValueChange={handleEditRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(role => role.Name === "Member" || role.Name === "Cashier").map((role) => (
                        <SelectItem key={role.RoleId} value={role.RoleId.toString()}>
                          {role.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="EditStatus">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner className="mr-2" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && selectedUser && (
        <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate the account for {selectedUser.Name}?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeactivateConfirm} disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="mr-2" /> : 'Deactivate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-md p-6"
          >
            <div className="text-center py-6">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Account Created Successfully</h3>
              <p className="text-gray-500 mb-6">
                {successMessage}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setShowCreateModal(true)
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Create Another
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Search, Plus, ArrowUpDown, MoreHorizontal, Edit, Trash2, CreditCard, Mail, Loader2, BadgeInfo, Receipt, CheckCircle2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { GetCurrentSession } from "@/lib/auth";
// Use the interface from the API route
import type { MemberForAdminPage } from "@/app/api/members/route";
import { IssueAccountVerification, UpdateMember, DeleteMember } from "./actions";

// Debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}


type Role = {
  id: number;
  name: string;
  description?: string;
};

type User = {
  UserId: number;
  Name: string;
  Email: string;
  RoleId: number;
  RoleName: string;
};

// Purchase History Component
function PurchaseHistory({ userId }: { userId: number }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchaseHistory = async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/members/${id}/transactions`);
        
        if (!response.ok) {
          const errorText = await response.text();
          try {
            // Try to parse as JSON to get a specific error message from the API
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || "Failed to fetch purchase history");
          } catch (e) {
            // If it's not JSON, it might be an HTML error page
            throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
          }
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch purchase history");
        }
        
        setTransactions(data.transactions || []);
      } catch (err: any) {
        console.error("Fetch purchase history error:", err);
        setError(err.message || "An error occurred while fetching purchase history.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchPurchaseHistory(userId);
    }
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 h-4 w-4" /> Purchase History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500 mr-2" />
            <p>Loading purchase history...</p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="text-red-500 py-2">
            Error: {error}
          </div>
        )}
        
        {!isLoading && !error && transactions.length === 0 && (
          <p className="text-gray-500 py-2">No purchase history found for this member.</p>
        )}
        
        {!isLoading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 font-medium text-gray-600">Time</th>
                  <th className="text-left py-2 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-2 font-medium text-gray-600">Payment</th>
                  <th className="text-left py-2 font-medium text-gray-600">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{transaction.date}</td>
                    <td className="py-2">{transaction.time}</td>
                    <td className="py-2">{transaction.totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                    <td className="py-2 capitalize">{transaction.paymentMethod}</td>
                    <td className="py-2">{transaction.cashierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Credit History Component
function CreditHistory({ userId }: { userId: number }) {
  const [credits, setCredits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreditHistory = async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/members/${id}/credits`);
        if (!response.ok) {
          const errorJson = await response.json();
          throw new Error(errorJson.message || "Failed to fetch credit history");
        }
        const data = await response.json();
        setCredits(data.credits || []);
      } catch (err: any) {
        console.error("Fetch credit history error:", err);
        setError(err.message || "An error occurred while fetching credit history.");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchCreditHistory(userId);
    }
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-4 w-4" /> Credit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500 mr-2" />
            <p>Loading credit history...</p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="text-red-500 py-2">
            Error: {error}
          </div>
        )}
        
        {!isLoading && !error && credits.length === 0 && (
          <p className="text-gray-500 py-2">No credit history found for this member.</p>
        )}
        
        {!isLoading && !error && credits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-2 font-medium text-gray-600">Paid Amount</th>
                  <th className="text-left py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((credit) => (
                  <tr key={credit.CreditId} className="border-b hover:bg-gray-50">
                    <td className="py-2">{formatDate(credit.Timestamp)}</td>
                    <td className="py-2">{parseFloat(credit.Amount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                    <td className="py-2">{parseFloat(credit.PaidAmount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                    <td className="py-2">{getStatusBadge(credit.Status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to format date
const formatDate = (dateString: string | Date) => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Invalid date:', dateString, error);
    return 'Invalid Date';
  }
};

// Zod schema for the edit member form
const editMemberFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  address: z.string().optional(),
  userId: z.string().optional(), // Stored as string from the Select component
  initialCredit: z.coerce
    .number({ invalid_type_error: "Initial credit must be a number." })
    .min(0, { message: "Credit cannot be negative." }),
  creditLimit: z.coerce
    .number({ invalid_type_error: "Credit limit must be a number." })
    .min(0, { message: "Credit limit cannot be negative." }),
});

export default function AdminMembersPage() {
  const { toast } = useToast();
  // State for data, loading, errors, filters, sorting, pagination
  const [members, setMembers] = useState<MemberForAdminPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creditFilter, setCreditFilter] = useState<'all' | 'hasCredit'>('all');
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Match API default
  const [totalCount, setTotalCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // State for modals

  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberForAdminPage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isViewMemberModalOpen, setIsViewMemberModalOpen] = useState(false);
  // Pay Credit modal state
  const [isPayCreditModalOpen, setIsPayCreditModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuingAccount, setIssuingAccount] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [liveCreditBalance, setLiveCreditBalance] = useState<{ loading: boolean; balance: number | null }>({ loading: false, balance: null });

  const [accountIssueMessage, setAccountIssueMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL('/api/members', window.location.origin);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('pageSize', pageSize.toString());
      url.searchParams.set('sortBy', sortBy);
      url.searchParams.set('sortOrder', sortOrder);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (creditFilter === 'hasCredit') url.searchParams.set('hasCredit', 'true');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch members');
      }

      setMembers(data.members);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while fetching members.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, statusFilter, creditFilter]);
  
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);
  
  // Fetch users for modals
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch('/api/users?role=member'); // Assuming an endpoint to get users by role
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers((data.users || []).filter((user: any) => user && user.UserId != null));
      } catch (error) {
        console.error("Error fetching users:", error);
        // Handle error in UI if necessary
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isEditMemberModalOpen) {
      fetchUsers();
    }
  }, [ isEditMemberModalOpen]);

  // Setup form

  // Add edit member form setup
  const editMemberForm = useForm<z.infer<typeof editMemberFormSchema>>({
    resolver: zodResolver(editMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      userId: "",
      initialCredit: 0,
      creditLimit: 0,
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleViewMember = async (member: MemberForAdminPage) => {
    setSelectedMember(member);
    setIsViewMemberModalOpen(true);
    setLiveCreditBalance({ loading: true, balance: null });

    try {
      // Fetch the live running balance for the selected member
      const response = await fetch(`/api/members/${member.id}/running-balance`);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to fetch live balance.');
        } catch (e) {
          // The error response was not JSON, likely an HTML error page
          console.error("Non-JSON error response:", errorText);
          throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      setLiveCreditBalance({ loading: false, balance: data.runningBalance });
    } catch (err: any) {
      console.error("Error fetching live credit balance:", err);
      setLiveCreditBalance({ loading: false, balance: null }); // Keep it null on error
      // Optionally, you could set an error state here to display in the modal.
    }
  };

  const handleEditMember = (member: MemberForAdminPage) => {
    setSelectedMember(member);
    editMemberForm.reset({
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        address: member.address || "",
        userId: member.userId ? member.userId.toString() : "",
        creditLimit: member.creditLimit,
        initialCredit: member.currentCredit,
    });
    setIsEditMemberModalOpen(true);
  };

  const handleDeleteMember = (member: MemberForAdminPage) => {
    setSelectedMember(member);
    setIsDeleteConfirmOpen(true);
    setDeleteError(null);
  };




  const onEditMemberSubmit = async (values: z.infer<typeof editMemberFormSchema>) => {

    if (!selectedMember) return;
    setIsSubmitting(true);
    editMemberForm.clearErrors('root');

    try {
        const dataToSend = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          userId: values.userId && values.userId !== '0' ? parseInt(values.userId, 10) : null,
          creditBalance: values.initialCredit,
          creditLimit: values.creditLimit,
        };
        const result = await UpdateMember(selectedMember.id, dataToSend);
        if (result.success) {
            setIsEditMemberModalOpen(false);
            fetchMembers(); // Refetch or update state
        } else {
            editMemberForm.setError('root', { message: result.message || "An unknown error occurred while updating the member." });
        }
    } catch (error) {
        editMemberForm.setError('root', { message: 'An unexpected error occurred.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
        const result = await DeleteMember(selectedMember.id);
        if (result.success) {
            setIsDeleteConfirmOpen(false);
            fetchMembers(); // Refetch or update state
        } else {
            setDeleteError(result.message || "An unspecified error occurred.");
        }
    } catch (error) {
        setDeleteError('An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleIssueAccount = async (member: MemberForAdminPage) => {
    const { id: memberId, userId } = member;

    if (memberId) {
      // All logic goes in here, where memberId is a string
      if (userId) {
        setAccountIssueMessage({
          type: 'error',
          text: 'This member already has an account'
        });
        setTimeout(() => setAccountIssueMessage(null), 5000);
      } else {
        try {
          setIssuingAccount(memberId); // Should be safe here
          const result = await IssueAccountVerification(memberId);
          
          if (result.success) {
            setAccountIssueMessage({ type: 'success', text: result.message || "Account verification issued successfully." });
            fetchMembers();
          } else {
            setAccountIssueMessage({ type: 'error', text: result.message || "Failed to issue account verification." });
          }
        } catch (error) {
          console.error("Error issuing account:", error);
          setAccountIssueMessage({
            type: 'error',
            text: 'Failed to issue account verification'
          });
        } finally {
          setIssuingAccount(null);
          setTimeout(() => setAccountIssueMessage(null), 5000);
        }
      }
    } else {
      // The only other case: memberId is undefined
      console.error("Cannot issue account: member ID is missing.");
      setAccountIssueMessage({ type: 'error', text: 'Internal Error: Member ID missing.' });
      setTimeout(() => setAccountIssueMessage(null), 5000);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin User" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
              <p className="text-gray-600">Manage cooperative members ({totalCount} total)</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setSelectedMember(null); setIsPayCreditModalOpen(true); }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Credit Payment
              </Button>
            </div>

          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Name, ID, or Email..."
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1); // Reset page on new search
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  {/* These statuses need to exist in the DB */}
                </SelectContent>
              </Select>
              <Select value={creditFilter as string} onValueChange={(v) => setCreditFilter(v as any)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Credit filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="hasCredit">Has Outstanding Credit</SelectItem>
                </SelectContent>
              </Select>
              {/* Add more filters if needed (e.g., date range for joinDate) */}
            </CardContent>
          </Card>

          {/* Loading and Error States */}
          {isLoading && (
              <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500" />
                  <p className="mt-2 text-gray-600">Loading members...</p>
              </div>
          )}
          {error && !isLoading && (
              <Alert variant="destructive" className="mb-8">
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {/* Members Table */}
          {!isLoading && !error && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-100">
                      <tr>
                        {/* Sortable Headers */} 
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                          Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('id')}>
                          Member ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('credit')}>
                          OUTSTANDING CREDIT <ArrowUpDown className="inline h-3 w-3 ml-1" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('date')}>
                          Join Date <ArrowUpDown className="inline h-3 w-3 ml-1" />
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.length === 0 ? (
                          <tr>
                              <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                  No members found matching your criteria.
                              </td>
                          </tr>
                      ) : (
                          members.map((member) => (
                            <tr key={member.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Avatar className="h-8 w-8 mr-3">
                                    {/* <AvatarImage src={`/avatars/${member.id}.png`} alt={member.name} /> */}
                                    <AvatarFallback>{member.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium text-gray-900 hover:text-amber-600 cursor-pointer" onClick={() => handleViewMember(member)}>{member.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.universalId}</td>

                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={member.status === 'active' ? 'default' : member.status === 'inactive' ? 'secondary' : 'outline'}
                                  className={`capitalize ${
                                    member.status === 'active' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : ''
                                  }`}
                                >
                                  {member.status} {/* Needs actual status data */}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.currentCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.roleName || 'No Role'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(member.joinDate)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewMember(member)}>
                                      <BadgeInfo className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMember(member)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteMember(member)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {member.currentCredit > 0 && (
                                      <DropdownMenuItem onClick={() => { setSelectedMember(member); setIsPayCreditModalOpen(true); setPaymentAmount(member.currentCredit.toFixed(2)); setIsFullPayment(false); }}>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Pay Credit
                                      </DropdownMenuItem>
                                    )}
                                    {!member.userId ? (
                                      <DropdownMenuItem 
                                        onClick={() => handleIssueAccount(member)}
                                        disabled={issuingAccount === member.id}
                                      >
                                        {issuingAccount === member.id ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending Email...
                                          </>
                                        ) : (
                                          <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Issue Account
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem disabled>
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                        Account Created
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && totalCount > 0 && (
              <div className="flex items-center justify-between mt-8">
                  <span className="text-sm text-gray-700">
                      Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} members
                  </span>
                  <div className="flex gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page <= 1}
                      >
                          Previous
                      </Button>
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                      >
                          Next
                      </Button>
                  </div>
              </div>
          )}
        </div>
      </main>

      {/* --- Modals (Placeholders - Need Forms and API Calls) --- */}




      {/* Edit Member Modal */}
      <Dialog open={isEditMemberModalOpen} onOpenChange={setIsEditMemberModalOpen}>
        <DialogContent className="max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member: {selectedMember?.name}</DialogTitle>
            <DialogDescription>Update the details for this member.</DialogDescription>
          </DialogHeader>
          <Form {...editMemberForm}>
            <form onSubmit={editMemberForm.handleSubmit(onEditMemberSubmit)} className="space-y-4">
              <FormField
                control={editMemberForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMemberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email Address" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editMemberForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone Number (Optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editMemberForm.control}
                  name="initialCredit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Credit</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editMemberForm.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum amount of credit this member can use for purchases
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMemberForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Member Address (Optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMemberForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Account</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {isLoadingUsers ? (
                            <SelectItem value="loading" disabled>Loading users...</SelectItem>
                          ) : (
                            users.map(user => (
                              <SelectItem key={user.UserId} value={user.UserId.toString()}>
                                {user.Name} ({user.Email}) - {user.RoleName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Associate this member with a user account that has a member role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Display general form errors */}
              {editMemberForm.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {editMemberForm.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditMemberModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Member Modal */}
      <Dialog open={isViewMemberModalOpen} onOpenChange={setIsViewMemberModalOpen}>
        <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details: {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="mt-4 space-y-4">
              <p><strong>Member ID:</strong> {selectedMember.memberID}</p>
              <p><strong>Email:</strong> {selectedMember.email}</p>
              <p><strong>Phone:</strong> {selectedMember.phone}</p>
              <p><strong>Join Date:</strong> {formatDate(selectedMember.joinDate)}</p>
              <div><strong>Status:</strong> <Badge variant={selectedMember.status === 'active' ? 'default' : 'secondary'} className="capitalize">{selectedMember.status}</Badge></div>
              <p><strong>Outstanding Credit:</strong> 
                {liveCreditBalance.loading ? (
                  <span className="italic text-gray-500">Loading balance...</span>
                ) : liveCreditBalance.balance !== null ? (
                  liveCreditBalance.balance.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
                ) : (
                  selectedMember.currentCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) + ' (error fetching live)'
                )}
              </p>
              <p><strong>Credit Limit:</strong> {selectedMember.creditLimit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
              <p><strong>Role:</strong> {selectedMember.roleName || 'No Role Assigned'}</p>
              
              <PurchaseHistory userId={selectedMember.id} />
              <CreditHistory userId={selectedMember.id} />
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsViewMemberModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Credit Modal */}
      <Dialog open={isPayCreditModalOpen} onOpenChange={setIsPayCreditModalOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Payment</DialogTitle>
            <DialogDescription>Enter the payment amount and confirm. FIFO is applied automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-2">
            {!selectedMember && (
              <div>
                <Label>Search Member</Label>
                <Select onValueChange={(memberId) => {
                  const member = members.find(m => m.id === parseInt(memberId));
                  if (member) {
                    setSelectedMember(member);
                    setPaymentAmount(member.currentCredit.toString());
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a member to pay credit" /></SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.currentCredit > 0).map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>{member.name} - {member.currentCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedMember && (
              <>
                <div>
                  <Label>Member</Label>
                  <div className="py-1">{selectedMember?.name} ({selectedMember?.memberID})</div>
                </div>
                <div>
                  <Label>Outstanding Credit</Label>
                  <div className="font-semibold">{selectedMember?.currentCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input id="fullPayment" type="checkbox" checked={isFullPayment} onChange={(e) => { setIsFullPayment(e.target.checked); if (e.target.checked && selectedMember) setPaymentAmount(selectedMember.currentCredit.toString()); }} />
                    <label htmlFor="fullPayment">Full Payment</label>
                  </div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" min="0" step="0.01" disabled={isFullPayment} />
                </div>
              </>
            )}

          </div>
          {selectedMember && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsPayCreditModalOpen(false); setPaymentMessage(null); }}>Cancel</Button>
              <Button onClick={async () => {
                if (!selectedMember) return;
                setIsProcessingPayment(true);
                setPaymentMessage(null);
                try {
                  const amountVal = isFullPayment ? selectedMember.currentCredit : parseFloat(paymentAmount);
                  if (!isFullPayment && (isNaN(amountVal) || amountVal <= 0)) {
                    toast({
                      title: "Invalid Amount",
                      description: "Please enter a valid payment amount.",
                      variant: "destructive",
                    });
                    setIsProcessingPayment(false);
                    return;
                  }

                  const res = await fetch(`/api/admin/members/${selectedMember.id}/credit-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: amountVal, full: isFullPayment })
                  });
                  const data = await res.json();
                  if (!res.ok || !data.success) {
                    toast({
                      title: "Payment Failed",
                      description: data.message || "Failed to process payment. Please try again.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Payment Successful",
                      description: `Payment of ₱${amountVal.toFixed(2)} has been applied successfully.`,
                    });
                    setIsPayCreditModalOpen(false);
                    fetchMembers();
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "An unexpected error occurred. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsProcessingPayment(false);
                }
              }} disabled={isProcessingPayment}>
                {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete member "{selectedMember?.name}" (ID: {selectedMember?.memberID})?
              This action cannot be undone.
            </DialogDescription>
            {deleteError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Issue Notification */}
      {accountIssueMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-4 p-4 rounded-md ${
            accountIssueMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center">
            {accountIssueMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            )}
            <p>{accountIssueMessage.text}</p>
          </div>
        </motion.div>
      )}

    </div>
  )
}

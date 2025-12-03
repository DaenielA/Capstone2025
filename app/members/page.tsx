"use client"

import { SetStateAction, useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ShoppingBag,
  CreditCard,
  Calendar,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  BarChart4,
  Wallet,
  X,
  Receipt,
  Info,
  User,
  Clock,
  Star,
  TrendingUp,
  Shield,
  ArrowUpRight,
  Gift,
  BadgePercent,
  BadgeCheck,
  ChevronDown,
} from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth";
import { Purchase, Payment, MemberProfileData, GetCurrentMemberData, CreditItem } from "./actions";
import { UpcomingEvent, GetUpcomingEvents } from "../admin/actions"; // Import GetUpcomingEvents




import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function MemberDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview")
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [creditIncreaseAmount, setCreditIncreaseAmount] = useState(1000)
  const [memberData, setMemberData] = useState<MemberProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreditOnly, setShowCreditOnly] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [isLoadingUpcomingEvents, setIsLoadingUpcomingEvents] = useState(true)
  const [upcomingEventsError, setUpcomingEventsError] = useState<string | null>(null)

  // Fetch member data from the database
  useEffect(() => {
    const fetchMemberData = async () => {
      if (user === undefined) {
        // Still loading auth state, do nothing yet.
        return;
      }

      setIsLoading(true);
      if (user) { // User is logged in
        try {
          const data = await GetCurrentMemberData();
          if (data) {
            setMemberData(data);
          } else {
            setError("Could not retrieve member data. Please try again.");
          }
        } catch (e) {
          setError("An error occurred while fetching member data.");
        }
      } else { // User is not logged in (user is null)
        setError("You must be logged in to view this page.");
      }
      setIsLoading(false);
    }

    fetchMemberData();
  }, [user]);

  // Fetch upcoming events
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      setIsLoadingUpcomingEvents(true);
      setUpcomingEventsError(null);

      try {
        const data = await GetUpcomingEvents(3); // Fetch up to 3 upcoming events
        setUpcomingEvents(data);
      } catch (err) {
        console.error("Error fetching upcoming events for member dashboard:", err);
        setUpcomingEventsError("Failed to load upcoming events. Please try again.");
      } finally {
        setIsLoadingUpcomingEvents(false);
      }
    };

    fetchUpcomingEvents();
  }, []);

  // Function to view receipt
  const viewReceipt = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowReceiptModal(true)
  }

  // Function to make a payment
  const makePayment = (payment: Payment | null = null) => {
    if (payment) {
      setSelectedPayment(payment)
    } else {
      setSelectedPayment(null)
    }
    setShowPaymentModal(true)
  }

  // Function to process payment
  const processPayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      // In a real app, we would update the payment status
    }, 2000)
  }

  // Function to request credit increase
  const requestCreditIncrease = () => {
    setShowCreditModal(true)
  }

  // Function to process credit increase request
  const processCreditRequest = () => {
    // Simulate processing
    setTimeout(() => {
      setShowCreditModal(false)
      // In a real app, we would update the credit limit
    }, 1000)
  }

  // Function to close modals
  const closeModal = () => {
    setShowReceiptModal(false)
    setShowPaymentModal(false)
    setShowCreditModal(false)
    setSelectedPurchase(null)
    setSelectedPayment(null)
  }

  // Get time of day for greeting
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }

  // Format date for better display
  const formatDate = (dateString: string | Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member data...</p>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error || !memberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error || "Unable to load member data. Please try again later."}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-amber-500 to-orange-500"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="member" userName={memberData.Name} memberData={memberData as any} />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          {/* Simplified Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Good {getTimeOfDay()}, {memberData.Name}</h1>
                  <p className="text-gray-600">Welcome back to your Pandol Cooperative dashboard</p>
                </div>

                <div className="flex gap-2">
                  <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                    Member since {formatDate(memberData?.joinDate || '')}
                  </Badge>
                  <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200">
                    <User className="h-3.5 w-3.5 mr-1" />
                    ID: {memberData?.memberID}
                  </Badge>
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 rounded-lg shadow-sm"
                    onClick={() => window.location.href = '/members/profile'}
                  >
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                </div>
              </div>

            
              {/* Clean, properly positioned card layout */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Credit Overview Card */}
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <Wallet className="h-5 w-5 text-amber-600" />
                      Credit Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-amber-700 mb-1">Credit Limit</p>
                        <p className="text-xl font-bold text-amber-900">₱{memberData?.CreditLimit?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-700 mb-1">Available Credit</p>
                        <p className="text-xl font-bold text-amber-900">₱{memberData?.availableCredit?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-700 mb-1">Credit Used</p>
                        <p className="text-xl font-bold text-amber-900">₱{memberData?.CreditBalance?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-amber-700">Credit Utilization</p>
                        <p className="text-xs font-medium text-amber-900">{memberData?.creditUtilization?.toFixed(2)}%</p>
                      </div>
                      <Progress value={memberData?.creditUtilization || 0} className="h-1.5 bg-amber-200 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" />
                    </div>


                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="pb-2 bg-gray-50/50 border-b">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingUpcomingEvents ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading events...</p>
                      </div>
                    ) : upcomingEventsError ? (
                      <div className="text-center py-12">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Events</h3>
                        <p className="text-gray-500">{upcomingEventsError}</p>
                      </div>
                    ) : upcomingEvents.length > 0 ? (
                      <div className="divide-y">
                        {upcomingEvents.map((event, index) => (
                          <div key={event.id} className="flex items-center justify-between p-4 hover:bg-amber-50/40 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{event.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>{event.date}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                {event.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No Upcoming Events</h3>
                        <p className="text-gray-500">Check back later for new activities!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <Tabs 
            defaultValue="overview" 
            onValueChange={setActiveTab}
            className="space-y-8"
          >
            <div className="bg-white rounded-xl shadow-sm p-1">
            <TabsList className="grid grid-cols-3 bg-gray-100/80 p-1 gap-1">
                <TabsTrigger
                  value="overview"
                  onClick={() => setActiveTab("overview")}
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white py-3"
                >
                  <BarChart4 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="purchases"
                  onClick={() => setActiveTab("purchases")}
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white py-3"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Purchases
                </TabsTrigger>
                <TabsTrigger
                  value="credit-management"
                  onClick={() => setActiveTab("credit-management")}
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white py-3"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit Management
                </TabsTrigger>
              </TabsList>
            </div>



            <TabsContent value="overview" className="space-y-8">
              {/* Activity Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Recent Activity */}
                <Card className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="pb-2 bg-gray-50/50 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Recent Activity
                      </CardTitle>
                      <Button
                        variant="ghost"
                        className="text-amber-600 h-8 px-2"
                        onClick={() => setActiveTab("purchases")}
                      >
                        View All Purchases <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {memberData?.purchaseHistory?.slice(0, 3).map((purchase: Purchase, index: number) => (

                        <div
                          key={purchase.Id}
                          className="flex items-center justify-between p-4 hover:bg-amber-50/40 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{purchase.Id}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(purchase.Date)}</span>
                                <span>•</span>
                                <span>{purchase.Items} items</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-medium text-gray-900">₱{purchase.Total.toFixed(2)}</p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  purchase.Status === 'Paid' || purchase.Status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  purchase.Status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {purchase.Status === 'Paid' || purchase.Status === 'Completed' ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <Clock className="h-3 w-3 mr-1" />
                                )}
                                {purchase.Status}
                              </span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => viewReceipt(purchase)}
                              className="h-8 bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1.5" />
                              Receipt
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Payments */}
                <Card className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="pb-2 bg-gray-50/50 border-b">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      Upcoming Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {memberData?.upcomingPayments?.length > 0 ? (

                      <div className="divide-y">
                        {memberData?.upcomingPayments?.map((payment: Payment, index: number) => (

                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 bg-amber-50/80 hover:bg-amber-50 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{payment.description}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>Due: {formatDate(payment.dueDate)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="font-medium text-gray-900">₱{payment.amount.toFixed(2)}</p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm"
                                onClick={() => makePayment(payment)}
                              >
                                Pay at Cooperative
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">All Caught Up!</h3>
                        <p className="text-gray-500">You have no upcoming payments due</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>



            </TabsContent>

            <TabsContent value="purchases">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Purchases</CardTitle>
                      <CardDescription>A record of all your purchases and credit items.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={activeTab === "purchases" && !showCreditOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCreditOnly(false)}
                      >
                        All Purchases
                      </Button>
                      <Button
                        variant={showCreditOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCreditOnly(true)}
                      >
                        Credit Items
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th className="text-left">Details</th>
                        <th className="text-left">Total</th>
                        <th className="text-left">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showCreditOnly ? memberData?.purchaseHistory?.filter(p => p.Status !== 'Completed') : memberData?.purchaseHistory)?.map((item: Purchase, index: number) => (

                        <tr key={item.Id}>
                          <td>{formatDate(item.Date)}</td>
                          <td>
                            {item.ItemDetails && item.ItemDetails.length > 0 ? (
                              <div className="flex flex-col">
                                {item.ItemDetails.slice(0, 2).map((detail) => (
                                  <span key={detail.TransactionItemId} className="text-sm text-gray-700">
                                    {detail.Name} (x{detail.Quantity}) @ ₱{detail.Price.toFixed(2)}
                                  </span>
                                ))}
                                {item.ItemDetails.length > 2 && (
                                  <span
                                    className="text-xs text-blue-600 cursor-pointer hover:underline"
                                    onClick={() => viewReceipt(item)}
                                  >
                                    and {item.ItemDetails.length - 2} more items (view receipt)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No items</span>
                            )}
                          </td>
                          <td>₱{item.Total.toFixed(2)}</td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.Status === 'Paid' || item.Status === 'Completed' ? 'bg-green-100 text-green-800' :
                              item.Status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.Status}
                            </span>
                          </td>
                          <td>
                            <Button variant="outline" size="sm" onClick={() => viewReceipt(item)}>
                              View Receipt
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="credit-management">
              <Card>
                <CardHeader>
                  <CardTitle>Credit Management</CardTitle>
                  <CardDescription>Manage your cooperative credit line.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="text-2xl font-bold">₱{memberData?.CreditLimit?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Credit Used</p>
                      <p className="text-2xl font-bold">₱{memberData?.CreditBalance?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Available Credit</p>
                      <p className="text-2xl font-bold text-green-600">₱{memberData?.availableCredit?.toFixed(2)}</p>
                    </div>

                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-500" />
                      Individual Credit Items
                    </h3>
                    {memberData?.creditItems && memberData.creditItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Original Amount</th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penalty</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {memberData.creditItems
                              .filter(item => item.Type !== 'Payment') // Exclude payment type credits from this table
                              .map((item) => {
                                const outstandingBalance = parseFloat(item.Amount) - parseFloat(item.PaidAmount);
                                const isPendingPenalty = item.isOverdue && item.Status !== 'fully_paid' && item.creditPenaltyValue && item.creditPenaltyType && item.Type === 'Spent';

                                // Calculate days remaining or overdue
                                let daysStatus = '';
                                if (item.calculatedDueDate) {
                                  const today = new Date();
                                  const dueDate = new Date(item.calculatedDueDate);
                                  const diffTime = dueDate.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                  if (diffDays > 0) {
                                    daysStatus = `${diffDays} days left`;
                                  } else if (diffDays === 0) {
                                    daysStatus = 'Due Today';
                                  } else {
                                    daysStatus = `${Math.abs(diffDays)} days overdue`;
                                  }
                                }

                                return (
                                  <tr key={item.CreditId} className={isPendingPenalty ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.Timestamp)}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{item.Notes || `Credit Item #${item.CreditId}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₱{parseFloat(item.Amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₱{parseFloat(item.PaidAmount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₱{outstandingBalance.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.calculatedDueDate ? formatDate(item.calculatedDueDate) : 'N/A'}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                                      {daysStatus}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        item.Status === 'fully_paid' ? 'bg-green-100 text-green-800' :
                                        item.Status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                                        item.isOverdue ? 'bg-red-100 text-red-800' :
                                        'bg-amber-100 text-amber-800'
                                      }`}>
                                        {item.Status?.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.isPenaltyApplied ? (
                                        <span className="text-red-600 font-medium">Applied</span>
                                      ) : isPendingPenalty ? (
                                        <span className="text-red-600 font-medium">
                                          {item.creditPenaltyType === 'percentage' ? `${item.creditPenaltyValue}%` : `₱${parseFloat(item.creditPenaltyValue || '0').toFixed(2)}`} (Potential)
                                        </span>
                                      ) : (
                                        'N/A'
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No individual credit items found.</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <Button onClick={requestCreditIncrease}>Request Credit Increase</Button>
                    <Button onClick={() => makePayment()}>Make a Payment</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceiptModal && selectedPurchase && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Purchase Receipt</h3>
                <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0 text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6 pb-6 border-b">
                <Image 
                  src="/pandol-logo.png" 
                  alt="Pandol Cooperative Logo" 
                  width={60} 
                  height={60} 
                  className="rounded-full mx-auto mb-3"
                />
                <h2 className="text-xl font-bold text-gray-900">Pandol Cooperative</h2>
                <p className="text-sm text-gray-500">123 Main Street, Anytown</p>
                <p className="text-sm text-gray-500">Tel: (123) 456-7890</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-gray-500 text-xs">Receipt No:</p>
                  <p className="font-medium text-gray-900">{selectedPurchase?.Id}</p>

                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-gray-500 text-xs">Date:</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedPurchase?.Date || '')}</p>

                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-gray-500 text-xs">Member:</p>
                  <p className="font-medium text-gray-900">{memberData?.Name}</p>

                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-gray-500 text-xs">Member ID:</p>
                  <p className="font-medium text-gray-900">{memberData?.memberID}</p>

                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-500" />
                  Items Purchased
                </h4>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Item</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600">Qty</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Unit</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Price</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPurchase?.ItemDetails?.map((item) => (

                        <tr key={item.TransactionItemId}>
                          <td className="py-2 px-3">{item.Name}</td>
                          <td className="py-2 px-3 text-center">{item.Quantity}</td>
                          <td className="py-2 px-3">{item.PieceUnitName || 'Unit'}</td>
                          <td className="py-2 px-3 text-right">₱{item.Price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">₱{(item.Quantity * item.Price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="border-t">
                        <td colSpan={4} className="py-2 px-3 text-right font-medium text-gray-700">
                          Total
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-600">₱{selectedPurchase?.Total?.toFixed(2)}</td>

                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedPurchase?.Status === 'Paid' || selectedPurchase?.Status === 'Completed' ? 'bg-green-100 text-green-800' :
                        selectedPurchase?.Status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-amber-100 text-amber-800'
                      }`}
                  >
                    {selectedPurchase?.Status === 'Paid' || selectedPurchase?.Status === 'Completed' ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {selectedPurchase?.Status}
                  </span>

                </div>
                {(selectedPurchase?.Status === 'Pending' || selectedPurchase?.Status === 'Partial') && (

                  <Button
                    size="sm"
                    onClick={() => {
                      closeModal()
                      makePayment({
                        amount: selectedPurchase?.Total || 0,
                        description: `Payment for ${selectedPurchase?.Id}`,

                        id: `PAY-${selectedPurchase.Id.split('-')[1]}`,
                        dueDate: selectedPurchase.Date,
                        date: new Date().toISOString(),
                        method: 'credit',
                        status: 'Pending'
                      })
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm"
                  >
                    Pay at Cooperative
                  </Button>
                )}
              </div>

              <div className="text-center text-sm text-gray-500 mb-6">
                <p>Thank you for shopping at Pandol Cooperative!</p>
                <p>This receipt serves as proof of your purchase.</p>
              </div>



            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Payment Information</h3>
                <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0 text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center py-6">
                <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                  <Info className="h-10 w-10 text-amber-600" />
                </div>
                <h3 className="text-xl font-medium mb-4 text-gray-900">Visit the Cooperative</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  To make a payment on your credit balance, please visit the cooperative office in person. 
                  Online payments are not available at this time.
                </p>
                
                {selectedPayment && (
                  <div className="w-full bg-gray-50 p-5 rounded-lg mb-6 text-left border shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                      <span className="text-gray-500">Payment Details</span>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment ID</span>
                        <span className="font-medium">{selectedPayment?.id}</span>
                      </div>
                      {selectedPayment?.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date</span>
                          <span className="font-medium">{selectedPayment.dueDate}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount</span>
                        <span className="font-bold text-amber-600">₱{selectedPayment?.amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Description</span>
                        <span className="font-medium">{selectedPayment?.description || "Credit payment"}</span>
                      </div>

                    </div>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <Button
                    onClick={closeModal}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Credit Increase Modal */}
      {showCreditModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Request Credit Increase</h3>
                <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0 text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Current Credit Limit</p>
                    <p className="text-xl font-bold text-gray-900">₱{memberData?.CreditLimit?.toFixed(2)}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">New Credit Limit</p>
                    <p className="text-xl font-bold text-green-700">₱{((memberData?.CreditLimit || 0) + creditIncreaseAmount).toFixed(2)}</p>
                  </div>

                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700">Requested Increase Amount (₱)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₱</span>
                    </div>
                    <input
                      title="Credit Increase Amount"
                      type="number"
                      className="w-full pl-7 p-2.5 border rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      value={creditIncreaseAmount}
                      onChange={(e) => setCreditIncreaseAmount(Number.parseFloat(e.target.value))}
                      min="1000"
                      step="1000"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <div className="flex items-center space-x-1 px-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => setCreditIncreaseAmount(prev => Math.max(1000, prev - 1000))}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => setCreditIncreaseAmount(prev => prev + 1000)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>




                <Alert className="bg-blue-50 text-blue-800 border border-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Credit increase requests are subject to approval by the cooperative management.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={closeModal}
                  className="border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={processCreditRequest}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

    </div>

  )

}

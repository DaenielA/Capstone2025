"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { motion, AnimatePresence, AnimatePresenceProps } from "framer-motion"
import { Search, X, Plus, Minus, Trash2, User, CreditCard, DollarSign, Printer, Mail, Download, ShoppingCart, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Product, Member, getProducts, getCategories, searchProducts, getMembers, searchMembers, createTransaction, sendReceiptEmail, Transaction, getTransactions, getTransactionById } from "./actions"



import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PrintableReceipt } from "./PrintableReceipt"
import { getCurrentUserData, UserProfileData } from "@/app/actions/userActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"
type CartItem = Product & {
  quantity: number;
  // New fields for unit of sale
  salePrice: number;
  saleUnitName: string; // e.g., "Pack", "Sachet", "Piece"
  cartItemId: string; // Unique ID for each cart item instance
};


// Helper functions for date handling, moved outside the component
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

const isExpired = (dateString: string | null | undefined) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date < new Date();
};

const isExpiringSoon = (dateString: string | null | undefined) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(today.getMonth() + 1);
  return date > today && date <= oneMonthFromNow;
};

const STOCK_THRESHOLD = 10;

type NotificationType = 'lowStock' | 'expiringSoon' | 'expired';
type NotificationMessage = { message: string; type: NotificationType };


type SelectedCustomer = Member | {
  Id: string; // For walk-in, this will be a temporary ID like 'walk-in-1'
  Name: string;
};

export default function PointOfSaleClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(null)

  // Member state
  const [members, setMembers] = useState<Member[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [memberSearch, setMemberSearch] = useState("")
  const [isMemberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [walkInName, setWalkInName] = useState("");
  const [walkInCounter, setWalkInCounter] = useState(1);

  // Payment state
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionComplete, setTransactionComplete] = useState<{ transactionId: string; member?: Member } | null>(null)

  // Manual Discount State
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false)
  const [manualDiscount, setManualDiscount] = useState(0)
  const [discountInput, setDiscountInput] = useState("")

  // Notification state
  const [notificationMessages, setNotificationMessages] = useState<NotificationMessage[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [activeNotificationFilter, setActiveNotificationFilter] = useState<NotificationType | null>(null);

  // New state for totals calculation
  const [subtotal, setSubtotal] = useState(0);
  const [creditMarkupAmount, setCreditMarkupAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [fullTransactionDetails, setFullTransactionDetails] = useState<Transaction | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // New state for export modal
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [selectedTransactionIdsExport, setSelectedTransactionIdsExport] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportScope, setExportScope] = useState<"page" | "selected" | "all">("page");
  const [includeItemDetails, setIncludeItemDetails] = useState(true);


  const { toast } = useToast()

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [productsData, categoriesData, membersData, userData] = await Promise.all([
        getProducts(),
        getCategories(),
        getMembers(),
        getCurrentUserData(),
      ])
      setProducts(productsData)
      setCategories(["all", ...categoriesData])
      setMembers(membersData)
      setCurrentUser(userData)

      // --- Notification Logic ---
      const lowStock = productsData.filter(p => p.Stock < STOCK_THRESHOLD).length;
      const expiringSoon = productsData.filter(p => p.ExpiryDate && isExpiringSoon(p.ExpiryDate) && !isExpired(p.ExpiryDate)).length;
      const expiredCount = productsData.filter(p => p.ExpiryDate && isExpired(p.ExpiryDate)).length;

      const messages: NotificationMessage[] = [];
      if (lowStock > 0) {
        messages.push({
          message: `${lowStock} product${lowStock > 1 ? 's are' : ' is'} running low on stock.`,
          type: 'lowStock'
        });
      }
      if (expiringSoon > 0) {
        messages.push({
          message: `${expiringSoon} product${expiringSoon > 1 ? 's are' : ' is'} expiring within a month.`,
          type: 'expiringSoon'
        });
      }
      if (expiredCount > 0) {
        messages.push({
          message: `${expiredCount} product${expiredCount > 1 ? 's have' : ' has'} expired.`,
          type: 'expired'
        });
      }
      setNotificationMessages(messages);
    } catch (error) {
      let errorMessage = "Failed to load initial POS data. Please refresh the page.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchTransactions = useCallback(async (page: number) => {
    setIsLoadingTransactions(true);
    try {
      // Simulate fetching transactions
      const fetchedTransactions = await getTransactions();
      setTransactions(fetchedTransactions);
      setTransactionTotalPages(1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (isExportModalOpen) {
      fetchTransactions(transactionPage);
    }
  }, [isExportModalOpen, transactionPage, fetchTransactions]);

  const toggleExportSelect = (id: string) => {
    setSelectedTransactionIdsExport((prev) => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
  }

  const clearExportSelection = () => setSelectedTransactionIdsExport([])

  const buildCSVFromPOS = (txs: Transaction[], includeItems = true) => {
    const escape = (v: any) => {
      if (v === null || v === undefined) return ''
      let s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        s = '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }
    const rows: string[] = []
    if (includeItems) {
      rows.push(['TransactionId','Date','Time','Cashier','Member','MemberId','MemberEmail','PaymentMethod','Status','ItemName','ItemQuantity','ItemPrice','ItemOriginalPrice','ItemLineTotal','DiscountAmount','ManualDiscountAmount','Total'].join(','))
      txs.forEach(tx => {
        tx.ItemDetails.forEach(item => {
          const lineTotal = (item.Price || 0) * Number(item.Quantity || 0)
          rows.push([
            escape(tx.Id), escape(tx.Date), escape(tx.Time), escape(tx.Cashier), escape(tx.Member), escape(tx.MemberId), escape(tx.MemberEmail), escape(tx.PaymentMethod), escape(tx.Status),
            escape(item.Name), escape(item.Quantity), escape(item.Price?.toFixed?.(2) ?? item.Price), escape(item.OriginalPrice?.toFixed?.(2) ?? item.OriginalPrice), escape(lineTotal.toFixed(2)),
            escape(tx.DiscountAmount?.toFixed?.(2) ?? ''), escape(tx.ManualDiscountAmount?.toFixed?.(2) ?? ''), escape(tx.Total?.toFixed?.(2) ?? '')
          ].join(','))
        })
      })
    } else {
      rows.push(['TransactionId','Date','Time','Cashier','Member','MemberId','MemberEmail','PaymentMethod','Status','Items','DiscountAmount','ManualDiscountAmount','Total'].join(','))
      txs.forEach(tx => {
        rows.push([
          escape(tx.Id), escape(tx.Date), escape(tx.Time), escape(tx.Cashier), escape(tx.Member), escape(tx.MemberId), escape(tx.MemberEmail), escape(tx.PaymentMethod), escape(tx.Status), escape(tx.Items),
          escape(tx.DiscountAmount?.toFixed?.(2) ?? ''), escape(tx.ManualDiscountAmount?.toFixed?.(2) ?? ''), escape(tx.Total?.toFixed?.(2) ?? '')
        ].join(','))
      })
    }
    return rows.join('\n')
  }

  const exportAllPages = async () => {
    const allTxs: Transaction[] = []
    const data = await getTransactions()
    if (Array.isArray(data)) allTxs.push(...data)
    return allTxs
  }

  const handleExportFromPOS = async () => {
    let txs: Transaction[] = []
    if (exportScope === 'page') txs = transactions
    else if (exportScope === 'selected') txs = transactions.filter(t => selectedTransactionIdsExport.includes(t.Id))
    else if (exportScope === 'all') txs = await exportAllPages()

    if (txs.length === 0) {
      toast({ title: 'No Transactions', description: 'No transactions available for selected export scope.', variant: 'destructive' })
      return
    }

    if (exportFormat === 'json') {
      const filename = `pos_transactions_${Date.now()}.json`
      const content = JSON.stringify(txs, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const csv = buildCSVFromPOS(txs, includeItemDetails)
      const filename = `pos_transactions_${Date.now()}.csv`
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
    setExportModalOpen(false)
    toast({ title: 'Export Ready', description: `Downloaded ${txs.length} transaction(s) as ${exportFormat.toUpperCase()}.` })
  }

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (transactionComplete?.transactionId) {
      const fetchTransactionDetails = async () => {
        const tx = await getTransactionById(transactionComplete.transactionId);
        setFullTransactionDetails(tx);
      };
      fetchTransactionDetails();
    }
  }, [transactionComplete]);

  // Effect to cycle through notification messages
  useEffect(() => {
    if (notificationMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentNotificationIndex(prevIndex => (prevIndex + 1) % notificationMessages.length);
      }, 5000); // Change message every 5 seconds

      return () => clearInterval(interval);
    }
  }, [notificationMessages.length]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim() === "") {
      const productsData = await getProducts()
      setProducts(productsData)
      return
    }
    try {
      const results = await searchProducts(query)
      setProducts(results)
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Could not perform search. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleProductClick = (product: Product) => {
    // Always add the default unit to the cart when a product is clicked.
    // The unit can be changed later from within the cart.
    addToCart(product);
  };

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      // Use the default sale unit when adding to cart for the first time.
      const defaultUnit = product.saleUnits.find(u => u.isDefault) || product.saleUnits[0];
      const cartItemId = `${product.Id}-${defaultUnit.unit}`;

      const existingItem = prevCart.find((item) => item.cartItemId === cartItemId);

      if (existingItem) {
        // If the same item (with the same unit) exists, just increase its quantity.
        return prevCart.map((item) => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }

      // Add new item to cart
      return [...prevCart, { 
        ...product, 
        quantity: 1, 
        salePrice: defaultUnit.price, 
        saleUnitName: defaultUnit.unit, 
        cartItemId: cartItemId 
      }];
    });
  };

  const handleUnitChange = (cartItemId: string, newUnitName: string) => {
    setCart(prevCart => {
      const itemToUpdate = prevCart.find(item => item.cartItemId === cartItemId);
      if (!itemToUpdate) return prevCart;

      const newUnit = itemToUpdate.saleUnits.find(u => u.unit === newUnitName);
      if (!newUnit) return prevCart;

      return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, salePrice: newUnit.price, saleUnitName: newUnit.unit } : item);
    });
  };

  const updateQuantity = (cartItemId: string, quantityValue: string) => {
    setCart((prevCart) => {
      const newQuantity = parseFloat(quantityValue);
      // If the input is empty or not a valid number, keep the current quantity but allow the input to be visually empty.
      // We use a special value like '' for the quantity to achieve this.
      if (quantityValue === '') {
        return prevCart.map((item) => item.cartItemId === cartItemId ? { ...item, quantity: '' as any } : item);
      }
      if (isNaN(newQuantity) || newQuantity <= 0) return prevCart.filter((item) => item.cartItemId !== cartItemId);
      return prevCart.map((item) => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item );
    });
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.Id !== productId))
  }

  // This effect will recalculate totals whenever the cart, payment method, or discount changes.
  useEffect(() => {
    const calculateTotals = async () => {
      if (cart.length === 0) {
        setSubtotal(0);
        setCreditMarkupAmount(0);
        setTotal(0);
        return;
      }

      setIsCalculating(true);

      const regularSubtotal = cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

      if (paymentMethod === 'credit') {
        try {
          const itemsForApi = cart.map(item => ({
            productId: parseInt(item.Id),
            quantity: item.quantity,
            price: item.salePrice,
          }));


          const response = await fetch('/api/transactions/calculate-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsForApi }),
          });

          const data = await response.json();

          if (data.success) {
            setSubtotal(parseFloat(data.subtotal));
            setCreditMarkupAmount(parseFloat(data.totalMarkupAmount));
            setTotal(parseFloat(data.grandTotal) - manualDiscount);
          }
        } catch (error) {
          console.error("Error calculating markup:", error);
          toast({ title: "Error", description: "Could not calculate credit markup.", variant: "destructive" });
        }
      } else {
        setSubtotal(regularSubtotal);
        setCreditMarkupAmount(0);
        setTotal(regularSubtotal - manualDiscount);
      }
      setIsCalculating(false);
    };

    calculateTotals();
  }, [cart, paymentMethod, manualDiscount, toast]);

  const handleMemberSearch = async (query: string) => {
    setMemberSearch(query)
    if (query.trim() === "") {
      const membersData = await getMembers()
      setMembers(membersData)
      return
    }
    const results = await searchMembers(query)
    setMembers(results)
  }

  const handleSelectMember = (member: SelectedCustomer) => {
    setSelectedCustomer(member)
    setMemberPopoverOpen(false)
    setMemberSearch("")
  }

  const handleProcessPayment = async () => {
    console.log("handleProcessPayment called");
    if (!currentUser) {

      toast({ title: "Error", description: "User not identified.", variant: "destructive" })
      return
    }

    if (paymentMethod === "credit" && (!selectedCustomer || !('CreditLimit' in selectedCustomer))) {
      toast({ title: "Credit Payment Error", description: "A member must be selected for credit payments.", variant: "destructive" })
      return
    }

    if (paymentMethod === "credit" && selectedCustomer && 'CreditLimit' in selectedCustomer && total > selectedCustomer.CreditLimit - selectedCustomer.CurrentCredit) {
      toast({
        title: "Credit Limit Exceeded",
        description: `This purchase exceeds the member's available credit.`,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const transactionData = {
        items: cart.map(item => ({
          ProductId: parseInt(item.Id),
          Quantity: item.quantity,
          Price: item.salePrice, // Send the price at which it was sold
          basePrice: item.basePrice, // Add the missing basePrice
          isPieceSale: item.saleUnitName === item.pieceUnitName,
        })),
        totalAmount: total,
        paymentMethod,
        userId: currentUser.userId,
        memberId: selectedCustomer && 'CreditLimit' in selectedCustomer ? parseInt(selectedCustomer.Id) : undefined,
        creditMarkupAmount: creditMarkupAmount,
        manualDiscount: manualDiscount,
      }

      const result = await createTransaction(transactionData);

      if (result.success && result.transactionId) {
        toast({
          title: "Transaction Successful",
          description: `Transaction ID: ${result.transactionId}`,
        })
        setTransactionComplete({ transactionId: result.transactionId, member: selectedCustomer && 'CreditLimit' in selectedCustomer ? selectedCustomer : undefined })
        setPaymentModalOpen(false)
      } else {
        // Directly show the error from the backend
        toast({
          title: "Transaction Failed",
          description: result.error || "Could not process the transaction.",
          variant: "destructive",
        })
        setPaymentModalOpen(false); // Close modal on failure
      }
    } catch (error: any) {
      console.error("Transaction failed:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Could not process the transaction.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendReceipt = async () => {
    if (!transactionComplete || !transactionComplete.member) {
      toast({ title: "Error", description: "No member associated with this transaction.", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    try {
      const result = await sendReceiptEmail(
        transactionComplete.transactionId,
        transactionComplete.member.Email,
        transactionComplete.member.Name
      )

      if (result.success) {
        toast({
          title: "Receipt Sent",
          description: `Email receipt sent to ${transactionComplete.member.Email}.`,
        })
      } else {
        throw new Error(result.error || "Failed to send receipt.")
      }
    } catch (error: any) {
      console.error("Failed to send receipt:", error)
      toast({
        title: "Failed to Send Receipt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // --- Print Logic ---
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ bodyClass: "print-body" });

  const triggerPrint = () => {
    if (!fullTransactionDetails) {
      toast({
        title: "Cannot Print Receipt",
        description: "Transaction details are not available yet. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }
    if (!receiptRef.current) return;
    handlePrint(() => receiptRef.current);
  }

  const resetPOS = () => {
    setCart([])
    setSelectedCustomer(null)
    setTransactionComplete(null)
    setManualDiscount(0)
    setDiscountInput("")
    setPaymentMethod("cash")
    setFullTransactionDetails(null);
    setWalkInName("");
    fetchInitialData() // Refetch data for next transaction
  }

  const handleWalkInBlur = () => {
    if (walkInName.trim()) {
      setSelectedCustomer({ Id: `walk-in-${walkInCounter}`, Name: walkInName.trim() });
    } else if (selectedCustomer && !('CreditLimit' in selectedCustomer)) {
      // If the input is cleared and a walk-in was previously set
      setSelectedCustomer(null);
    }
  }

  const applyManualDiscount = () => {
    const value = parseFloat(discountInput)
    if (isNaN(value) || value < 0) {
      toast({ title: "Invalid Discount", description: "Please enter a valid positive number.", variant: "destructive" })
      return
    }
    if (value > subtotal) {
      toast({ title: "Invalid Discount", description: "Discount cannot be greater than the subtotal.", variant: "destructive" })
      return
    }
    setManualDiscount(value)
    setDiscountModalOpen(false)
    toast({ title: "Discount Applied", description: `₱${value.toFixed(2)} discount has been applied.` })
  }

  const handleNotificationClick = () => {
    if (notificationMessages.length > 0) {
      const currentFilterType = notificationMessages[currentNotificationIndex].type;
      setActiveNotificationFilter(currentFilterType);
      setSearchQuery("");
      setActiveCategory("all");
      toast({
        title: "Filter Applied",
        description: `Showing ${currentFilterType === 'lowStock' ? 'low stock' : currentFilterType === 'expiringSoon' ? 'expiring soon' : 'expired'} products.`,
      });
    }
  };

  const filteredProducts = useMemo(() => {
    let prods = products;

    if (activeNotificationFilter) {
      if (activeNotificationFilter === 'lowStock') prods = prods.filter(p => p.Stock < STOCK_THRESHOLD);
      if (activeNotificationFilter === 'expiringSoon') prods = prods.filter(p => p.ExpiryDate && isExpiringSoon(p.ExpiryDate) && !isExpired(p.ExpiryDate));
      if (activeNotificationFilter === 'expired') prods = prods.filter(p => p.ExpiryDate && isExpired(p.ExpiryDate));
    } else {
      if (activeCategory !== "all") {
        prods = prods.filter(p => p.Category.toLowerCase() === activeCategory.toLowerCase());
      }
    }

    return prods;

  }, [products, activeCategory, activeNotificationFilter])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Point of Sale...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navbar userType="cashier" userName={currentUser?.name || "Cashier"} />
      <main className="flex-grow pt-16 flex">
        {/* Main content */}
        <div className="flex-grow flex flex-col">
          {/* Search and Categories */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search for products..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? "default" : "outline"}
                    onClick={() => setActiveCategory(category)}
                    className="capitalize shrink-0"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filter Indicator */}
          {activeNotificationFilter && (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between bg-blue-100 text-blue-800 p-3 rounded-md">
                <p className="text-sm font-medium capitalize">
                  Showing only <strong>{activeNotificationFilter.replace('Soon', ' Soon')}</strong> products.
                </p>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-blue-800" onClick={() => setActiveNotificationFilter(null)}>
                  Clear Filter
                </Button>
              </div>
            </div>
          )}

          {/* Rolling Notification Widget */}
          {notificationMessages.length > 0 && !activeNotificationFilter && (
            <div className="px-4 pb-2">
              <div
                className={`relative h-10 w-full overflow-hidden rounded-md shadow-sm flex items-center px-4 cursor-pointer transition-colors ${
                  notificationMessages[currentNotificationIndex]?.type === 'expired' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}
                onClick={handleNotificationClick}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentNotificationIndex}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 1.5 }}
                    className="w-full flex items-center"
                  >
                    <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="text-sm font-medium">{notificationMessages[currentNotificationIndex].message}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <ScrollArea className="flex-grow">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              <AnimatePresence>
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.Id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      onClick={() => handleProductClick(product)}
                      className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col"
                    >
                      <div className="relative w-full h-32">
                        <Image
                          src={product.Image || "/placeholder.svg"}
                          alt={product.Name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                          className="object-cover rounded-t-lg"
                        />
                        {/* {product.discountValue && product.discountValue > 0 && (
                           <Badge variant="destructive" className="absolute top-2 left-2">SALE</Badge>
                        )} */}
                        {product.bulkPrice && (
                          <Badge className="absolute top-2 right-2 bg-blue-500">Bulk Deal</Badge>
                        )}
                      </div>
                      <CardContent className="p-4 flex-grow flex flex-col justify-between">
                        <div className="flex-grow">
                          <h3 className="font-semibold text-sm leading-tight">{product.Name}</h3>
                          <p className="text-xs text-gray-500">{product.Category}</p>
                          {product.piecePrice && product.pieceUnitName && (
                            <p className="text-xs text-blue-600 mt-1">
                              ₱{product.piecePrice.toFixed(2)} / {product.pieceUnitName}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          {product.discountValue && product.discountValue > 0 && product.basePrice > product.Price ? (
                            <div className="flex flex-col items-end">
                              <p className="text-xs text-gray-500 line-through">₱{product.basePrice.toFixed(2)}</p>
                              <p className="font-bold text-lg text-red-600">₱{product.Price.toFixed(2)}</p>
                            </div>
                          ) : (
                            <p className="font-bold text-lg">₱{product.Price.toFixed(2)}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Cart / Order Summary */}
        <div className="w-full max-w-sm bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Current Order
            </h2>
          </div>

          {/* Member Selection */}
          <div className="p-4 border-b">
            <Popover open={isMemberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedCustomer && 'CreditLimit' in selectedCustomer ? (
                    <>
                      <span className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        {selectedCustomer.Name}
                      </span>
                      <span
                        role="button"
                        aria-label="Clear selected member"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents the popover from opening
                          setSelectedCustomer(null);
                        }}
                      ><X className="h-4 w-4 text-gray-500 hover:text-gray-800" /></span>
                    </>
                  ) : (
                    "Select Member (Optional)"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search member..."
                    value={memberSearch}
                    onValueChange={handleMemberSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No member found.</CommandEmpty>
                    <CommandGroup>
                      {members.map((member) => (
                        <CommandItem
                          key={member.Id}
                          onSelect={() => handleSelectMember(member)}
                        >
                          {member.Name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCustomer && 'CreditLimit' in selectedCustomer ? (
              <div className="text-xs text-gray-600 mt-2">
                <p>Credit Limit: ₱{selectedCustomer.CreditLimit.toFixed(2)}</p>
                <p>Available Credit: ₱{(selectedCustomer.CreditLimit - selectedCustomer.CurrentCredit).toFixed(2)}</p>
              </div>
            ) : (
              <div className="mt-2">
                <Input
                  placeholder="Walk-In Customer Name (Optional)"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  onBlur={handleWalkInBlur}
                  disabled={!!(selectedCustomer && 'CreditLimit' in selectedCustomer)}
                />
              </div>
            )}
          </div>

          <ScrollArea className="flex-grow">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {selectedCustomer && !('CreditLimit' in selectedCustomer) && (
                  <p className="font-semibold mb-2">Customer: {selectedCustomer.Name}</p>
                )}
                <p>Your cart is empty.</p>
                <p className="text-sm">Click on products to add them to the order.</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="p-4 flex items-center">
                    <div className="flex-grow">
                      <p className="font-medium">{item.Name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-semibold">₱{item.salePrice.toFixed(2)}</p>
                        <Select value={item.saleUnitName} onValueChange={(newUnit) => handleUnitChange(item.cartItemId, newUnit)} disabled={item.saleUnits.length <= 1}>
                          <SelectTrigger className="h-8 w-auto text-xs">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.saleUnits.map(unit => <SelectItem key={unit.unit} value={unit.unit}>{unit.unit}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cartItemId, (item.quantity - 1).toString())}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.cartItemId, e.target.value)}
                        className="h-7 w-16 text-center"
                        step="any"
                        min="0"
                        aria-label="Item quantity"
                      />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.cartItemId, (item.quantity + 1).toString())}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => updateQuantity(item.cartItemId, "0")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Subtotal</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                {paymentMethod === 'credit' && creditMarkupAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Credit Markup</span>
                    <span>+ ₱{creditMarkupAmount.toFixed(2)}</span>
                  </div>
                )}
                {manualDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm text-blue-600">
                    <span>Manual Discount</span>
                    <span>- ₱{manualDiscount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center font-bold text-2xl">
                  <span>Total</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDiscountModalOpen(true)}>
                  Add Discount
                </Button>
                <Button variant="outline" onClick={() => setCart([])}>Clear Cart</Button>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-6">
              <p className="text-lg text-gray-600">Total Amount</p>
              <p className="text-5xl font-bold">₱{total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="py-6 text-lg"
                onClick={() => setPaymentMethod("cash")}
              >
                <DollarSign className="mr-2" /> Cash
              </Button>
              <Button
                variant={paymentMethod === "credit" ? "default" : "outline"}
                className="py-6 text-lg"
                onClick={() => setPaymentMethod("credit")}
                disabled={!selectedCustomer || !('CreditLimit' in selectedCustomer)}
              >
                <CreditCard className="mr-2" /> Credit
              </Button>
            </div>
            {!(selectedCustomer && 'CreditLimit' in selectedCustomer) && (
              <p className="text-center text-sm text-red-500 mt-2">Select a member to enable credit payment.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isProcessing}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Complete Modal */}
      <Dialog open={!!transactionComplete} onOpenChange={() => resetPOS()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Complete</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4"
            >
              <CheckCircle className="h-12 w-12 text-green-600" />
            </motion.div>
            <p className="text-lg font-medium">Payment was successful!</p>
            <p className="text-sm text-gray-500">Transaction ID: {transactionComplete?.transactionId}</p>
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={triggerPrint} disabled={isProcessing}>
                <Printer className="mr-2 h-3 w-3" /> Print Receipt
              </Button>
              <Button variant="outline" onClick={() => { if (transactionComplete?.transactionId) { setSelectedTransactionIdsExport([transactionComplete.transactionId]); setExportScope('selected'); setExportModalOpen(true); } }}>
                <Download className="mr-2 h-3 w-3" /> Export Transaction
              </Button>
            </div>
            <Button onClick={resetPOS}>
              Next Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Hidden component for printing */}
      <div className="hidden">
          <PrintableReceipt ref={receiptRef} transaction={fullTransactionDetails} />
      </div>
      {/* Manual Discount Modal */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Manual Discount</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="discount-amount">Discount Amount (₱)</Label>
              <Input
                id="discount-amount"
                type="number"
                placeholder="e.g., 10.00"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={applyManualDiscount}>Apply Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Transactions Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isLoadingTransactions ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Scope:</label>
                    <Button variant={exportScope === 'page' ? 'default' : 'outline'} size="sm" onClick={() => setExportScope('page')}>Current Page</Button>
                    <Button variant={exportScope === 'selected' ? 'default' : 'outline'} size="sm" onClick={() => setExportScope('selected')} disabled={selectedTransactionIdsExport.length === 0}>Selected</Button>
                    <Button variant={exportScope === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setExportScope('all')}>All</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Format:</label>
                    <Button variant={exportFormat === 'csv' ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat('csv')}>CSV</Button>
                    <Button variant={exportFormat === 'json' ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat('json')}>JSON</Button>
                    <Checkbox checked={includeItemDetails} onCheckedChange={() => setIncludeItemDetails(prev => !prev)} />
                    <span className="text-sm">Include item details</span>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-6">
                          <Checkbox checked={selectedTransactionIdsExport.length > 0 && selectedTransactionIdsExport.length === transactions.length} onCheckedChange={(checked) => {
                            if (checked) setSelectedTransactionIdsExport(transactions.map(t => t.Id)); else clearExportSelection()
                          }} />
                        </TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.Id}>
                          <TableCell>
                            <Checkbox checked={selectedTransactionIdsExport.includes(transaction.Id)} onCheckedChange={() => toggleExportSelect(transaction.Id)} />
                          </TableCell>
                          <TableCell>{transaction.Id}</TableCell>
                          <TableCell>{new Date(transaction.Date).toLocaleString()}</TableCell>
                          <TableCell>{transaction.Member || "Walk-in"}</TableCell>
                          <TableCell>₱{transaction.Total.toFixed(2)}</TableCell>
                          <TableCell>{transaction.PaymentMethod}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setTransactionPage((prev) => Math.max(prev - 1, 1));
                        }}
                        // @ts-ignore
                        disabled={transactionPage === 1}
                      />
                    </PaginationItem>
                    {[...Array(transactionTotalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setTransactionPage(i + 1);
                          }}
                          isActive={transactionPage === i + 1}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setTransactionPage((prev) => Math.min(prev + 1, transactionTotalPages));
                        }}
                        // @ts-ignore
                        disabled={transactionPage === transactionTotalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleExportFromPOS} className="bg-gradient-to-r from-amber-500 to-orange-500">Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

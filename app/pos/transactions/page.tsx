"use client"

import { useState, useEffect } from "react"
import { format, subDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { motion } from "framer-motion"
import { Search, Calendar as CalendarIcon, Download, Eye, Mail, Printer, ChevronDown } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { getTransactions, sendReceiptEmail } from "../actions"


// Transaction type definition
interface Transaction {
  Id: string
  Date: string
  Time: string
  Items: number
  DiscountAmount?: number
  ManualDiscountAmount?: number
  Total: number
  AmountReceived?: number
  Change?: number
  PaymentMethod: string
  Status: string
  Member?: string
  MemberId?: string
  MemberEmail?: string
  Cashier: string
  ItemDetails: {
    Name: string
    Quantity: number
    Price: number
    OriginalPrice: number
  }[]
}

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [exportScope, setExportScope] = useState<"filtered" | "selected" | "single">("filtered")
  const [includeItemDetails, setIncludeItemDetails] = useState(true)

  // Fetch transactions from database
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const data = await getTransactions()
        setTransactions(data)
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError("Failed to load transactions. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTransactions()
  }, [])

  // Filter transactions based on search query, date filter, and status filter
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.Id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.Member && transaction.Member.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.MemberId && transaction.MemberId.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesDate = (() => {
      if (!dateRange || !dateRange.from) {
        return true; // No date filter applied
      }
      const transactionDate = new Date(transaction.Date);
      transactionDate.setUTCHours(0, 0, 0, 0);

      if (!dateRange.to) {
        return transactionDate.getTime() === dateRange.from.getTime();
      }

      return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
    })();

    const matchesStatus = statusFilter === "all" || transaction.Status === statusFilter

    return matchesSearch && matchesDate && matchesStatus
  })

  // Get unique statuses from transactions
  const uniqueStatuses = ["all", ...Array.from(new Set(transactions.map((transaction) => transaction.Status)))]

  // Handle transaction click to view receipt
  const viewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsReceiptModalOpen(true)
    setIsEmailSent(false)
    setEmailError(null)
  }

  const toggleSelectTransaction = (id: string) => {
    setSelectedTransactionIds((prev) => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
  }

  const clearSelection = () => setSelectedTransactionIds([])

  // Handle sending receipt to email
  const handleSendReceipt = async () => {
    if (!selectedTransaction) {
      return
    }
    
    // Check if member email is available
    if (!selectedTransaction.MemberEmail) {
      setEmailError("Customer email not available. Cannot send receipt.")
      toast({
        title: "Email Not Available",
        description: "This transaction doesn't have an associated email address.",
        variant: "destructive"
      })
      return
    }
    
    setIsSendingEmail(true)
    setEmailError(null)
    
    // Show optimistic toast
    toast({
      title: "Sending Receipt",
      description: `Sending to ${selectedTransaction.MemberEmail}...`,
    })
    
    try {
      const result = await sendReceiptEmail(
        selectedTransaction.Id,
        selectedTransaction.MemberEmail,
        selectedTransaction.Member || "Customer"
      )
      
      if (result.success) {
        setIsEmailSent(true)
        toast({
          title: "Receipt Sent Successfully",
          description: `Receipt for transaction ${selectedTransaction.Id} has been sent to ${selectedTransaction.MemberEmail}.`,
          variant: "default"
        })
        
        // Clear email sent status after 5 seconds
        setTimeout(() => {
          setIsEmailSent(false)
        }, 5000)
      } else {
        setEmailError(result.error || "Failed to send email. Please try again.")
        toast({
          title: "Failed to Send Receipt",
          description: result.error || "An error occurred while sending the receipt. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error sending receipt:", error)
      setEmailError("An unexpected error occurred. Please try again.")
      toast({
        title: "Email Error",
        description: "An unexpected error occurred while sending the email.",
        variant: "destructive"
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Handle printing receipt
  const handlePrintReceipt = () => {
    window.print()
  }

  // Helpers: CSV/JSON exporters
  const buildCSV = (txs: Transaction[], includeItems = true) => {
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
      rows.push(['TransactionId','Date','Time','Cashier','Member','MemberId','MemberEmail','PaymentMethod','Status','ItemName','ItemQuantity','ItemPrice','ItemOriginalPrice','ItemLineTotal','DiscountAmount','ManualDiscountAmount','Total','AmountReceived','Change'].join(','))
      txs.forEach(tx => {
        tx.ItemDetails.forEach(item => {
          const lineTotal = (item.Price || 0) * (item.Quantity || 0)
          rows.push([
            escape(tx.Id), escape(tx.Date), escape(tx.Time), escape(tx.Cashier), escape(tx.Member), escape(tx.MemberId), escape(tx.MemberEmail), escape(tx.PaymentMethod), escape(tx.Status),
            escape(item.Name), escape(item.Quantity), escape(item.Price?.toFixed?.(2) ?? item.Price), escape(item.OriginalPrice?.toFixed?.(2) ?? item.OriginalPrice), escape(lineTotal.toFixed(2)),
            escape(tx.DiscountAmount?.toFixed?.(2) ?? ''), escape(tx.ManualDiscountAmount?.toFixed?.(2) ?? ''), escape(tx.Total?.toFixed?.(2) ?? ''), escape(tx.AmountReceived?.toFixed?.(2) ?? ''), escape(tx.Change?.toFixed?.(2) ?? '')
          ].join(','))
        })
      })
    } else {
      rows.push(['TransactionId','Date','Time','Cashier','Member','MemberId','MemberEmail','PaymentMethod','Status','Items','DiscountAmount','ManualDiscountAmount','Total','AmountReceived','Change'].join(','))
      txs.forEach(tx => {
        rows.push([
          escape(tx.Id), escape(tx.Date), escape(tx.Time), escape(tx.Cashier), escape(tx.Member), escape(tx.MemberId), escape(tx.MemberEmail), escape(tx.PaymentMethod), escape(tx.Status), escape(tx.Items),
          escape(tx.DiscountAmount?.toFixed?.(2) ?? ''), escape(tx.ManualDiscountAmount?.toFixed?.(2) ?? ''), escape(tx.Total?.toFixed?.(2) ?? ''), escape(tx.AmountReceived?.toFixed?.(2) ?? ''), escape(tx.Change?.toFixed?.(2) ?? '')
        ].join(','))
      })
    }
    return rows.join('\n')
  }

  const triggerDownload = (filename: string, content: string, mime = 'text/csv') => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    let txs: Transaction[] = []
    if (exportScope === 'filtered') txs = filteredTransactions
    else if (exportScope === 'selected') txs = transactions.filter(t => selectedTransactionIds.includes(t.Id))
    else if (exportScope === 'single' && selectedTransaction) txs = [selectedTransaction]

    if (txs.length === 0) {
      toast({ title: 'No Transactions', description: 'There are no transactions to export for the selected scope.', variant: 'destructive' })
      return
    }

    if (exportFormat === 'json') {
      const filename = `transactions_${Date.now()}.json`
      triggerDownload(filename, JSON.stringify(txs, null, 2), 'application/json')
    } else {
      const csv = buildCSV(txs, includeItemDetails)
      const filename = `transactions_${Date.now()}.csv`
      triggerDownload(filename, csv, 'text/csv')
    }

    setIsExportModalOpen(false)
    toast({ title: 'Export Ready', description: `Downloaded ${txs.length} transaction(s) as ${exportFormat.toUpperCase()}.` })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="cashier" userName="Cashier" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
              <p className="text-gray-600">View and manage all transactions</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex">
                    <div className="flex flex-col space-y-2 border-r p-4">
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Today</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>Last 7 Days</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>Last 30 Days</Button>
                    </div>
                    <Calendar 
                      mode="range" 
                      selected={dateRange} 
                      onSelect={setDateRange} 
                      initialFocus 
                      numberOfMonths={2}
                      defaultMonth={dateRange?.from}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" onClick={() => setIsExportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Transactions
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by transaction ID or member..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Statuses" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="w-full h-12 bg-gray-200 rounded animate-pulse"/>
                  ))}
                </div>
              ) : error ? (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500" >
                  No transactions found. {searchQuery || dateRange || statusFilter !== "all" 
                    ? "Try adjusting your filters." 
                    : ""}
                </div>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 w-6">
                          <Checkbox
                            checked={selectedTransactionIds.length > 0 && selectedTransactionIds.length === filteredTransactions.length}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedTransactionIds(filteredTransactions.map(t => t.Id))
                              else clearSelection()
                            }}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Transaction ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Date & Time</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Items</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Payment</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let walkInCounter = 1;
                        return filteredTransactions.map((transaction) => {
                          const customerDisplay = transaction.Member ? (
                            <div>
                              <div>{transaction.Member}</div>
                              <div className="text-xs text-gray-500">{transaction.MemberId}</div>
                            </div>
                          ) : (
                            `Walk-in ${walkInCounter++}`
                          );

                          return (
                            <motion.tr
                              key={transaction.Id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 font-medium">
                                <Checkbox
                                  checked={selectedTransactionIds.includes(transaction.Id)}
                                  onCheckedChange={() => toggleSelectTransaction(transaction.Id)}
                                />
                              </td>
                              <td className="py-3 px-4 font-medium">{transaction.Id}</td>
                              <td className="py-3 px-4">
                                {transaction.Date}
                                <div className="text-xs text-gray-500">{transaction.Time}</div>
                              </td>
                              <td className="py-3 px-4">
                                {transaction.Items === 1 ? (
                                  transaction.ItemDetails[0].Name
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-auto p-0 text-gray-700 hover:text-gray-900">
                                        {transaction.Items} items <ChevronDown className="h-3 w-3 ml-1" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-64">
                                      {transaction.ItemDetails.map((item, index) => (
                                        <DropdownMenuItem key={index} className="flex justify-between">
                                          <span className="truncate">{item.Name}</span>
                                          <span className="text-sm text-gray-500 ml-2">
                                            {item.Quantity}x ₱{item.Price ? item.Price.toFixed(2) : "0.00"}
                                          </span>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </td>
                              <td className="py-3 px-4 font-medium">
                                ₱{transaction.Total ? transaction.Total.toFixed(2) : "0.00"}
                              </td>
                              <td className="py-3 px-4">{transaction.PaymentMethod}</td>
                              <td className="py-3 px-4">{customerDisplay}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${transaction.Status === "Completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                  {transaction.Status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Button variant="ghost" size="sm" className="h-8 text-amber-600" onClick={() => viewReceipt(transaction)}>
                                  <Eye className="h-4 w-4 mr-1" /> View
                                </Button>
                              </td>
                            </motion.tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="px-2">
            <DialogTitle>Transaction Receipt</DialogTitle>
            <DialogDescription>Transaction #{selectedTransaction?.Id}</DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
              <div className="space-y-3 px-2">
              <div className="text-center border-b border-dashed border-gray-200 pb-3">
                <h3 className="font-bold text-xl">Pandol Cooperative</h3>
                <p className="text-gray-600 text-sm">Pandol, Corella, Bohol</p>
                <p className="text-gray-600 text-sm">Tel: +63 (38) 412-5678</p>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium">{selectedTransaction.Id}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium">
                  {selectedTransaction.Date} {selectedTransaction.Time}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cashier:</span>
                <span className="font-medium">{selectedTransaction.Cashier}</span>
              </div>

              {selectedTransaction.Member && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Member:</span>
                  <span className="font-medium">
                    {selectedTransaction.Member} ({selectedTransaction.MemberId})
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-gray-200 pt-3 mt-3">
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedTransaction.ItemDetails.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.Name}</span>
                        <div className="text-gray-600">
                          {item.Quantity} x ₱{item.Price ? item.Price.toFixed(2) : "0.00"}
                        </div>
                        {item.OriginalPrice && item.OriginalPrice > item.Price && (
                          <div className="text-xs text-gray-500 pl-2">
                            (Original: ₱{item.OriginalPrice.toFixed(2)})
                          </div>
                        )}
                      </div>
                      <span className="font-medium">
                        ₱{item.Price && item.Quantity ? (item.Price * item.Quantity).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-3 space-y-1">
                {(selectedTransaction.DiscountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Item Discounts:</span>
                    <span className="text-red-600">
                      - ₱{selectedTransaction.DiscountAmount?.toFixed(2)}
                    </span>
                  </div>
                )}
                {(selectedTransaction.ManualDiscountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Manual Discount:</span>
                    <span className="text-red-600">
                      - ₱{selectedTransaction.ManualDiscountAmount?.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-amber-600">
                    ₱{selectedTransaction.Total ? selectedTransaction.Total.toFixed(2) : "0.00"}
                  </span>
                </div>

                {selectedTransaction.AmountReceived !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount Received:</span>
                    <span>
                      ₱{selectedTransaction.AmountReceived.toFixed(2)}
                    </span>
                  </div>
                )}

                {selectedTransaction.Change !== undefined && selectedTransaction.Change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change:</span>
                    <span>₱{selectedTransaction.Change.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method:</span>
                  <span>{selectedTransaction.PaymentMethod}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`${selectedTransaction.Status === "Completed " ? "text-green-600" : "text-amber-600"}`}
                  >
                    {selectedTransaction.Status}
                  </span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-gray-200 pt-3">
                <p className="font-medium">Thank you for shopping with us!</p>
                <p className="text-gray-600 text-sm">Please come again</p>
              </div>

              {emailError && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertDescription>{emailError}</AlertDescription>
                </Alert>
              )}
              
              {isEmailSent && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    Receipt sent successfully to {selectedTransaction.MemberEmail || "customer"}!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => {
                setIsReceiptModalOpen(false)
              }}
            >
              Close
            </Button>
            <Button variant="outline" className="sm:flex-1" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              className="sm:flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={handleSendReceipt}
              disabled={isEmailSent || isSendingEmail || !selectedTransaction?.MemberEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span> Sending...
                </span>
              ) : isEmailSent ? (
                "Sent!"
              ) : (
                "Send Receipt"
              )}
            </Button>
            <Button variant="outline" className="sm:flex-1" onClick={() => { setExportScope('single'); setIsExportModalOpen(true); }}>
              <Download className="h-4 w-4 mr-2" /> Export Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Transactions Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>Select export options and download.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Export Scope</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="exportScope" checked={exportScope === 'filtered'} onChange={() => setExportScope('filtered')} />
                    <span className="text-sm">Filtered Transactions ({filteredTransactions.length})</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="exportScope" checked={exportScope === 'selected'} onChange={() => setExportScope('selected')} disabled={selectedTransactionIds.length === 0} />
                    <span className="text-sm">Selected Transactions ({selectedTransactionIds.length})</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="exportScope" checked={exportScope === 'single'} onChange={() => setExportScope('single')} disabled={!selectedTransaction} />
                    <span className="text-sm">Single Transaction ({selectedTransaction ? selectedTransaction.Id : 'None'})</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Export Format</span>
                <div className="flex items-center gap-2">
                  <Button variant={exportFormat === 'csv' ? 'default' : 'outline'} onClick={() => setExportFormat('csv')}>CSV</Button>
                  <Button variant={exportFormat === 'json' ? 'default' : 'outline'} onClick={() => setExportFormat('json')}>JSON</Button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Checkbox checked={includeItemDetails} onCheckedChange={() => setIncludeItemDetails(prev => !prev)} />
                  <span className="text-sm">Include item-level details</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Export preview: <strong>{exportScope === 'filtered' ? filteredTransactions.length : exportScope === 'selected' ? selectedTransactionIds.length : selectedTransaction ? 1 : 0}</strong> transaction(s).
            </div>
            {exportScope === 'selected' && selectedTransactionIds.length > 0 && (
              <div className="text-xs text-gray-700 max-h-40 overflow-y-auto border p-2 rounded">
                <div className="flex flex-wrap gap-2">
                  {selectedTransactionIds.slice(0, 20).map(id => (
                    <span key={id} className="px-2 py-1 bg-gray-100 rounded text-xs">{id}</span>
                  ))}
                  {selectedTransactionIds.length > 20 && <span className="text-xs text-gray-400">and {selectedTransactionIds.length - 20} more...</span>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500" onClick={handleExport}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

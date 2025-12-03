"use client"

import { useState, useEffect, useRef } from "react"
import { format, subDays, startOfToday, addDays, formatDistanceToNow } from "date-fns"
import { DateRange } from "react-day-picker"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Printer, TrendingUp, ShoppingCart, Loader2, AlertCircle, ChevronDown, Calendar as CalendarIcon, Download } from "lucide-react"
import { LogPanel } from "@/app/admin/reports/LogPanel"
import { Button } from "@/components/ui/button"
import { GetSalesReport, SalesReportData } from "@/app/admin/actions"
import type { MemberForAdminPage } from "@/app/api/members/route";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: number
  name: string
  price: number
  basePrice: number
  stock: number
  category: string
  expiryDate?: string | null
  isActive?: boolean
}

interface CreditItem {
    transactionId: number;
    transactionDate: string;
    productName: string;
    quantity: number;
    priceAtTimeOfSale: number;
    total: number;
    status: string;
    basePriceAtTimeOfSale?: number;
    markupPerUnit?: number;
    markupTotal?: number;
    originalTotal?: number;
    profitTotal?: number;
    markupCalculated?: number;
}

/**
 * Fetches members with outstanding credit balances.
 */
async function getMembersWithCredit(): Promise<{ success: boolean; members?: MemberForAdminPage[]; message?: string }> {
    try {
        // We can reuse the existing members API with a filter for credit
        const response = await fetch(`/api/members?hasCredit=true&pageSize=1000`); // Fetch a large number to get all
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server responded with ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || "Failed to fetch members with credit.");
        }
        return { success: true, members: data.members };
    } catch (error: any) {
        console.error("Error fetching members with credit:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}

function MemberCreditItems({ member }: { member: MemberForAdminPage }) {
    const [items, setItems] = useState<CreditItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCreditItems = async () => {
        if (items.length > 0) return; // Already loaded

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/members/${member.id}/credit-items`);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch items.');
            }
            setItems(data.creditItems || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Accordion type="single" collapsible onValueChange={fetchCreditItems}>
            <AccordionItem value={`member-${member.id}`}>
                <AccordionTrigger className="text-sm p-2 rounded-md hover:bg-gray-50">
                    <div className="flex justify-between w-full items-center">
                        <span>{member.name}</span>
                        <span className="text-gray-600 font-normal pr-2">{member.currentCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 pl-4 pr-2 bg-gray-50 rounded-b-md">
                    {isLoading && <p className="text-xs text-gray-500 p-2">Loading items...</p>}
                    {error && <p className="text-xs text-red-500 p-2">Error: {error}</p>}
                    {!isLoading && !error && items.length === 0 && <p className="text-xs text-gray-500 p-2">No credited items found.</p>}
                    {!isLoading && !error && items.length > 0 && (
                      <div className="text-xs max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-gray-600 bg-gray-100">
                            <tr>
                              <td className="px-2 py-1">Product</td>
                              <td className="px-2 py-1">Status</td>
                              <td className="px-2 py-1 text-right">Qty</td>
                              <td className="px-2 py-1 text-right">Original/Unit</td>
                              <td className="px-2 py-1 text-right">Markup/Unit</td>
                              <td className="px-2 py-1 text-right">Markup Total</td>
                              <td className="px-2 py-1 text-right">Final/Unit</td>
                              <td className="px-2 py-1 text-right">Subtotal</td>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={`${item.transactionId}-${index}`} className="border-b hover:bg-gray-50">
                                <td className="px-2 py-2 truncate" title={item.productName}>{item.productName}</td>
                                <td className="px-2 py-2 capitalize">{item.status}</td>
                                <td className="px-2 py-2 text-right">{item.quantity}</td>
                                <td className="px-2 py-2 text-right">{(item.basePriceAtTimeOfSale ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                                <td className="px-2 py-2 text-right">{(item.markupPerUnit ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                                <td className="px-2 py-2 text-right">{(item.markupCalculated ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                                <td className="px-2 py-2 text-right">{(item.priceAtTimeOfSale ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                                <td className="px-2 py-2 text-right font-medium">{(item.total ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={2} className="px-2 py-1 font-medium">Totals</td>
                              <td className="px-2 py-1 text-right font-medium">{items.reduce((s, it) => s + it.quantity, 0)}</td>
                              <td className="px-2 py-1 text-right font-medium">{items.reduce((s, it) => s + ((it.originalTotal ?? 0)), 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                              <td className="px-2 py-1 text-right font-medium">
                                {items.reduce((s, it) => s + ((it.markupCalculated ?? 0)), 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                <div className="text-xs text-gray-500">{(() => {
                                  const original = items.reduce((s, it) => s + ((it.originalTotal ?? 0)), 0);
                                  const markup = items.reduce((s, it) => s + ((it.markupCalculated ?? 0)), 0);
                                  if (original > 0) return `(${((markup / original) * 100).toFixed(2)}%)`;
                                  return '(N/A)';
                                })()}</div>
                              </td>
                              <td className="px-2 py-1 text-right font-medium" colSpan={2}>-</td>
                              <td className="px-2 py-1 text-right font-bold">{items.reduce((s, it) => s + it.total, 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

function CreditSummary() {
    const [members, setMembers] = useState<MemberForAdminPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const result = await getMembersWithCredit();
            if (result.success && result.members) {
                setMembers(result.members);
            } else {
                setError(result.message || "Failed to load credit summary.");
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const totalCredit = members.reduce((sum, member) => sum + parseFloat(member.currentCredit.toString()), 0);

    return (
        <Card className="print-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle>Credit Summary</CardTitle>
                    <p className="text-sm text-muted-foreground">Total outstanding credit from all members.</p>
                </div>
                <div className="text-2xl font-bold text-amber-600">{totalCredit.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mr-2" />
                        <p>Loading credit summary...</p>
                    </div>
                )}
                {error && !isLoading && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!isLoading && !error && (
                    <div className="max-h-[260px] overflow-y-auto pr-2 border-t pt-4">
                        {members.length > 0 ? (
                            <ul className="space-y-1">
                                {members.map(member => <MemberCreditItems key={member.id} member={member} />)}
                            </ul>
                        ) : <p className="text-gray-500 text-center py-4">No members with running credit.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminReportsPage() {
  // Sales Report State
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null);
  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = startOfToday();
    return { from: today, to: addDays(today, 1) };
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadCSV = () => {
    console.log("handleDownloadCSV called");
    if (!salesReport) {
      console.log("salesReport is null or undefined, not downloading.");
      return;
    }
    console.log("salesReport data:", salesReport);

    // Prepare overall summary
    let csvContent = "Sales Report Summary\n";
    csvContent += `Total Revenue,${salesReport.totalRevenue}\n`;
    csvContent += `Total Transactions,${salesReport.totalTransactions}\n`;
    csvContent += `Total Profit,${salesReport.totalProfit}\n\n`;

    // Prepare detailed sales data
    csvContent += "Detailed Sales Transactions\n";
    const headers = ["Transaction ID", "Customer Name", "Cashier Name", "Date", "Unit Type", "Items", "Total Amount"];
    csvContent += headers.join(",") + "\n";

    salesReport.sales.forEach(sale => {
      const itemsString = sale.items.map(item => `${item.quantity}x ${item.name}`).join("; ");
      const row = [
        sale.id,
        sale.customerName || "Walk-in",
        sale.cashierName,
        sale.date,
        sale.unitType,
        `"${itemsString}"`, // Enclose items string in quotes to handle commas
        sale.total,
      ];
      csvContent += row.join(",") + "\n";
    });

    console.log("Generated CSV content:", csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales_report_${format(dateRange?.from || new Date(), 'yyyyMMdd')}_to_${format(dateRange?.to || new Date(), 'yyyyMMdd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("Download initiated.");
    } else {
      console.log("Download attribute not supported by browser.");
    }
  };

  const handlePrint = () => {
    console.log("handlePrint called");
    window.print();
  };

  useEffect(() => {
    const fetchSalesReport = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      setIsSalesLoading(true);
      setSalesError(null);
      try {
        const reportData = await GetSalesReport(dateRange.from, dateRange.to);
        setSalesReport(reportData);
      } catch (err) {
        setSalesError('Error loading sales data. Please try again later.');
        console.error('Error fetching sales data:', err);
      } finally {
        setIsSalesLoading(false);
      }
    };

    fetchSalesReport();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          main {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>
      <div className="no-print">
        <Navbar userType="admin" userName="Admin User" />
      </div>
      <main className="pt-20 pb-8 print:pt-4">
        <div ref={reportRef} className="container mx-auto px-4 print-container">
          <div className="flex justify-between items-center mb-8 no-print">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
              <p className="text-gray-600">An overview of your cooperative's credits and sales.</p>
            </div>
            <Button onClick={handlePrint} className="mr-2">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button onClick={handleDownloadCSV}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>

          <Tabs defaultValue="credit-summary" className="mb-8">
            <TabsList className="grid grid-cols-3 mb-6 no-print">
              <TabsTrigger value="credit-summary">Credit Summary</TabsTrigger>
              <TabsTrigger value="sales-report">Sales Report</TabsTrigger>
              <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="credit-summary">
              <CreditSummary />
            </TabsContent>


            <TabsContent value="sales-report">
              <div className="flex items-center mb-6 no-print">
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
                  <PopoverContent className="w-auto p-0 flex" align="start">
                    <div className="flex flex-col space-y-2 border-r p-4">
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Today</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>Last 7 Days</Button>
                        <Button variant="ghost" className="justify-start" onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>Last 30 Days</Button>
                    </div>
                    <div className="p-0">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                        numberOfMonths={2}
                        defaultMonth={dateRange?.from ? subDays(dateRange.from, 0) : undefined}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {isSalesLoading ? (
                <div className="text-center py-12">Loading sales report...</div>
              ) : salesError ? (
                <div className="text-center py-12 text-red-600">{salesError}</div>
              ) : salesReport && (
                <div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card className="print-card md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salesReport.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="print-card md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesReport.totalTransactions}</div>
                  </CardContent>
                </Card>
                <Card className="print-card md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salesReport.totalProfit)}</div>
                  </CardContent>
                </Card>
                <Card className="print-card md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Mark-up</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalCost = salesReport.totalRevenue - salesReport.totalProfit;
                        if (totalCost > 0) {
                          return `${((salesReport.totalProfit / totalCost) * 100).toFixed(2)}%`;
                        }
                        return 'N/A';
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="print-card">
                <CardHeader>
                  <CardTitle>Product Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[280px]">
                    <table className="w-full">
                      <thead className="bg-gray-100 text-gray-600 text-sm">
                        <tr>
                          <th className="px-4 py-3 text-left">Transaction ID</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Cashier</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Unit Type</th>
                          <th className="px-4 py-3 text-left">Items</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          if (salesReport.sales.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="text-center text-gray-500 py-8">No transactions found. Try adjusting your filters.</td>
                              </tr>
                            );
                          }

                          let walkInCounter = 1;
                          return salesReport.sales.map((sale) => {
                            const customerDisplay = sale.customerName || `Walk-in ${walkInCounter++}`;
                            return (
                              <tr key={sale.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{sale.id}</td>
                                <td className="px-4 py-3">{customerDisplay}</td>
                                <td className="px-4 py-3">{sale.cashierName}</td>
                                <td className="px-4 py-3">{sale.date}</td>
                                <td className="px-4 py-3">{sale.unitType}</td>
                                <td className="px-4 py-3">
                                  {sale.items.length === 1 ? (
                                    <span>{sale.items[0].quantity}x {sale.items[0].name}</span>
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-auto p-0 text-gray-700 hover:text-gray-900">
                                          {sale.items.length} items <ChevronDown className="h-3 w-3 ml-1" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-64">
                                        {sale.items.map((item, index) => (
                                          <DropdownMenuItem key={index} className="flex justify-between">
                                            <span className="truncate" title={item.name}>{item.name}</span>
                                            <span className="text-sm text-gray-500 ml-2">
                                              {item.quantity > 1 ? `${item.quantity}x ` : ''}₱{item.price ? item.price.toFixed(2) : "0.00"}
                                            </span>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">{formatCurrency(sale.total)}</td>
                              </tr>
                            );
                          });
                        })()}
                        {salesReport.sales.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-gray-500 py-8">No transactions found. Try adjusting your filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
              )}
            </TabsContent>

            <TabsContent value="activity-log">
              <LogPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
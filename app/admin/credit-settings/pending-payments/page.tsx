"use client";

import { useState, useEffect } from "react";
import { db } from "@/db/connection";
import { PendingPayments, Members, Users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptPayment, rejectPayment } from "./actions";
import { useToast } from "@/hooks/use-toast";

type Payment = {
  paymentId: number;
  amount: string;
  status: string;
  createdAt: Date;
  memberName: string;
  memberId: number;
};

async function getPendingPayments(): Promise<Payment[]> {
    const pendingPayments = await db.select({
      paymentId: PendingPayments.PendingPaymentId,
      amount: PendingPayments.Amount,
      status: PendingPayments.Status,
      createdAt: PendingPayments.CreatedAt,
      memberName: Members.Name,
      memberId: Members.MemberId,
    })
    .from(PendingPayments)
    .innerJoin(Members, eq(PendingPayments.MemberId, Members.MemberId))
    .where(eq(PendingPayments.Status, 'pending'))
    .orderBy(PendingPayments.CreatedAt);

    // Ensure all amounts are strings
    return pendingPayments.map(p => ({ ...p, amount: String(p.amount) }));
}


export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setIsLoading(true);
    // This is a client component, so we need to fetch data from an API route
    // or call a server action that is designed to be called from the client.
    // For simplicity, let's create a client-callable server action.
    // We'll wrap getPendingPayments in a new function.
    const result = await getPendingPayments();
    setPayments(result);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (payment: Payment) => {
    setIsProcessing(payment.paymentId);
    const result = await acceptPayment(payment.paymentId, payment.memberId, parseFloat(payment.amount));
    if (result.success) {
      toast({
        title: "Payment Approved",
        description: result.success,
      });
      fetchPayments(); // Refresh the list
    } else {
      toast({
        title: "Approval Failed",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsProcessing(null);
  };

  const handleReject = async (paymentId: number) => {
    setIsProcessing(paymentId);
    const result = await rejectPayment(paymentId);
    if (result.success) {
      toast({
        title: "Payment Rejected",
        description: result.success,
      });
      fetchPayments(); // Refresh the list
    } else {
      toast({
        title: "Rejection Failed",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsProcessing(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin User" />
      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Pending Credit Payments</h1>
            <p className="text-gray-600">Review and approve or reject member credit payments.</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                <p>Loading pending payments...</p>
                            </td>
                        </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          No pending payments.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.paymentId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.memberName} (ID: {payment.memberId})</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₱{payment.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                              <Clock className="mr-1 h-3 w-3" />
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <Button 
                                onClick={() => handleApprove(payment)} 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700"
                                disabled={isProcessing === payment.paymentId}
                              >
                                {isProcessing === payment.paymentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Approve
                              </Button>
                              <Button 
                                onClick={() => handleReject(payment.paymentId)} 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                disabled={isProcessing === payment.paymentId}
                              >
                                {isProcessing === payment.paymentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                Reject
                              </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

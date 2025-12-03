"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActivityLogs, MemberActivity, InventoryActivity, TransactionActivity } from '@/app/admin/actions';

import { FileText, Loader2, AlertCircle, User, ShoppingCart, CreditCard, Package, Edit, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';


type CombinedActivity = (MemberActivity & { type: 'member' }) | (InventoryActivity & { type: 'inventory' }) | (TransactionActivity & { type: 'transaction' });


const getIconForAction = (activity: CombinedActivity) => {
    if (activity.type === 'inventory') {
        if (activity.action.toLowerCase().includes('created')) return <Package className="h-5 w-5 text-blue-600" />;
        return <Edit className="h-5 w-5 text-purple-600" />;
    }
    if (activity.type === 'transaction') {
        return <ShoppingCart className="h-5 w-5 text-green-600" />;
    }
    const action = activity.action;
    if (action.toLowerCase().includes('purchase')) return <ShoppingCart className="h-5 w-5 text-green-600" />;
    if (action.toLowerCase().includes('payment')) return <CreditCard className="h-5 w-5 text-blue-600" />;
    return <User className="h-5 w-5 text-amber-600" />;
};


export function LogPanel() {
  const [logs, setLogs] = useState<CombinedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'member' | 'cashier' | 'admin'>('all');

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedLogs = await getActivityLogs(50, filter); // Fetch latest 50 logs with filter
        setLogs(fetchedLogs);
      } catch (err) {
        setError("Failed to load activity logs. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [filter]);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Activity Log
            </CardTitle>
            <p className="text-sm text-muted-foreground">A stream of recent activities in the system from admin to cashier.</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(value: 'all' | 'member' | 'cashier' | 'admin') => setFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="member">Member Activities</SelectItem>
                <SelectItem value="cashier">Cashier Transactions</SelectItem>
                <SelectItem value="admin">Admin Actions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
          ) : error ? (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No activity logs found.</p>
          ) : (
            <div className="space-y-6">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getIconForAction(log)}</div>
                  <div>
                    {log.type === 'member' ? (
                      <>
                        <p className="font-medium">{log.member} <span className="text-gray-600 font-normal">{log.action} {log.amount && `of ${log.amount}`}</span></p>
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                      </>
                    ) : log.type === 'transaction' ? (
                      <>
                        <p className="font-medium"><span className="text-primary">{log.cashier}</span> completed transaction for <span className="text-primary">{log.member}</span></p>
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                        <p className="text-xs text-gray-500">Total: ₱{log.total.toFixed(2)} • {log.paymentMethod}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{log.action} on <span className="text-primary">{log.productName}</span> by <span className="text-primary">{log.user}</span></p>
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                        <p className="text-xs text-gray-500">{log.details}</p>
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

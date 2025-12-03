"use server"

import { TransactionRepository } from "@/db/repositories/TransactionRepository";
import { db } from "@/db/connection"; // This already exports schema items
import { MemberActivities, Members, Events, Transactions, Products, Categories, TransactionItems, Users, InventoryLogs, Roles } from "@/db/schema";
import { and, desc, eq, gte, lte, sql, sum, count, asc } from "drizzle-orm";
import { formatDistanceToNow, subDays } from 'date-fns';
import { getTransactions } from "@/app/pos/actions";
import { GetCurrentSession } from "@/lib/auth";
import { UserRepository } from "@/db/repositories/UserRepository";


export interface DashboardStats {
    totalSales: { value: string; change: string; trend: 'up' | 'down' };
    activeMembers: { value: string; change: string; trend: 'up' | 'down' };
    totalInventory: { value: string; change: string; trend: 'up' | 'down' };
    creditOutstanding: { value: string; change: string; trend: 'up' | 'down' };
}

export interface AdminTransaction {
    Id: string;
    Member: string | null;
    Date: string;
    Total: number;
    Status: string;
    ItemDetails: {
        Name: string;
        Quantity: number;
        Price: number;
    }[];
}

export interface InventoryAlert {
    Product: string;
    Category: string;
    Stock: number;
    Threshold: number;
    SKU: string;
}

export interface MemberActivity {
    member: string;
    memberId: string;
    action: string;
    time: string;
    amount?: string;
}

export interface InventoryActivity {
    productName: string;
    user: string;
    action: string;
    details: string;
    time: string;
    timestamp: Date;
}

export interface TransactionActivity {
    transactionId: string;
    member: string;
    cashier: string;
    total: number;
    paymentMethod: string;
    action: string;
    time: string;
    timestamp: Date;
}


export interface UpcomingEvent {
    id: string;
    title: string;
    date: string;
    type: string;
}

export interface SalesReportData {
    totalRevenue: number;
    totalTransactions: number;
    totalProfit: number;
    sales: {
        id: string;
        date: string;
        total: number;
        customerName: string | null;
        cashierName: string;
        unitType: string;
        items: {
            id: number;
            name: string;
            quantity: number;
            price: number;
        }[];
    }[];
}

export async function GetSalesReport(startDate: Date, endDate: Date): Promise<SalesReportData> {
    try {
        // 1. Get the summary data (revenue, profit, count)
        const summaryData = await TransactionRepository.getSalesReport(startDate, endDate);

        // 2. Get detailed transactions already filtered by the date range
        const salesInRange = (await getTransactions({ startDate, endDate }))
            .map((sale) => {
                // Determine unit type: if any item has PieceUnitName, it's "Conversion of Unit", else "Main Product Purchased"
                const hasPieceUnit = sale.ItemDetails.some(item => (item as any).PieceUnitName);
                const unitType = hasPieceUnit ? "Conversion of Unit" : "Main Product Purchased";

                return {
                    id: sale.Id,
                    customerName: sale.Member || null,
                    cashierName: sale.Cashier,
                    date: sale.Date,
                    unitType,
                    items: sale.ItemDetails.map((item, index) => ({ id: index, name: item.Name, quantity: item.Quantity, price: item.Price })),
                    total: sale.Total,
                };
            });

        return {
            ...summaryData,
            sales: salesInRange,
        };
    } catch (error) {
        console.error("Error in GetSalesReport action:", error);
        throw new Error("Failed to retrieve sales report data.");
    }
}

export async function GetRecentTransactions(limit: number): Promise<AdminTransaction[]> {
    try {
        // We can reuse the getTransactions function from the POS actions.
        // We'll fetch all transactions, sort them by date descending, and then take the limit.
        const allTransactions = await getTransactions({});

        // The getTransactions function already formats the data in a very similar way to AdminTransaction.
        // We just need to add a 'Status' and map the fields.
        const recentTransactions = allTransactions
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
            .slice(0, limit);

        return recentTransactions.map(t => ({
            ...t,
            Member: t.Member || null, // Ensure Member is string | null, not undefined
            Status: 'Completed' // Assuming all fetched transactions are completed.
        }));
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        return [];
    }
}

export async function GetInventoryAlerts(threshold: number, limit: number): Promise<InventoryAlert[]> {
    try {
        const lowStockProducts = await db
            .select({
                Product: Products.Name,
                Category: Categories.Name,
                Stock: Products.StockQuantity,
                SKU: Products.Sku,
            })
            .from(Products)
            .innerJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
            .where(and(lte(Products.StockQuantity, threshold.toString()), eq(Products.IsActive, true)))
            .orderBy(asc(Products.StockQuantity))
            .limit(limit);

        return lowStockProducts.map(p => ({ ...p, Threshold: threshold, Stock: parseFloat(p.Stock) }));
    } catch (error) {
        console.error("Error fetching inventory alerts:", error);
        return [];
    }
}


export async function GetDashboardStats(timeRange: string): Promise<DashboardStats> {
    const now = new Date();
    let days;
    switch (timeRange) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 30; // Default to 30 days
    }

    const currentPeriodStart = subDays(now, days);
    const previousPeriodStart = subDays(now, days * 2);
    const previousPeriodEnd = currentPeriodStart;

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) {
            return { change: current > 0 ? '+100%' : '0%', trend: current > 0 ? 'up' : 'down' as 'up' | 'down' };
        }
        const percentageChange = ((current - previous) / previous) * 100;
        return {
            change: `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`,
            trend: percentageChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        };
    };

    try {
        // 1. Total Sales
        const [currentSalesResult] = await db.select({ total: sum(Transactions.TotalAmount) }).from(Transactions).where(gte(Transactions.Timestamp, currentPeriodStart));
        const [previousSalesResult] = await db.select({ total: sum(Transactions.TotalAmount) }).from(Transactions).where(and(gte(Transactions.Timestamp, previousPeriodStart), lte(Transactions.Timestamp, previousPeriodEnd)));
        const currentSales = parseFloat(currentSalesResult.total || '0');
        const previousSales = parseFloat(previousSalesResult.total || '0');
        const salesChange = calculateChange(currentSales, previousSales);

        // 2. Active Members
        const [activeMembersResult] = await db.select({ count: count() }).from(Members).where(eq(Members.Status, 'active'));
        const [newMembersCurrentResult] = await db.select({ count: count() }).from(Members).where(gte(Members.CreatedAt, currentPeriodStart));
        const [newMembersPreviousResult] = await db.select({ count: count() }).from(Members).where(and(gte(Members.CreatedAt, previousPeriodStart), lte(Members.CreatedAt, previousPeriodEnd)));
        const activeMembersCount = activeMembersResult.count;
        const membersChange = calculateChange(newMembersCurrentResult.count, newMembersPreviousResult.count);

        // 3. Total Inventory Value
        const [inventoryValueResult] = await db.select({
            totalValue: sum(sql<number>`${Products.Price} * ${Products.StockQuantity}`)
        }).from(Products);
        const inventoryValue = inventoryValueResult.totalValue || 0;
        // Note: Calculating inventory change over time is complex and requires historical data or snapshots,
        // which we don't have. So, we'll show 'N/A' for change.

        // 4. Credit Outstanding
        const [creditOutstandingResult] = await db.select({ total: sum(Members.CreditBalance) }).from(Members);
        const creditOutstanding = parseFloat(creditOutstandingResult.total || '0');
        // Note: Similar to inventory, tracking change requires historical data. We'll show 'N/A'.

        return {
            totalSales: {
                value: `₱${currentSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                ...salesChange,
            },
            activeMembers: {
                value: activeMembersCount.toString(),
                ...membersChange,
            },
            totalInventory: {
                value: `₱${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: 'N/A',
                trend: 'down', // Placeholder
            },
            creditOutstanding: {
                value: `₱${creditOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: 'N/A',
                trend: 'down', // Placeholder
            },
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            totalSales: { value: '₱0', change: '0%', trend: 'down' },
            activeMembers: { value: '0', change: '0%', trend: 'down' },
            totalInventory: { value: '₱0', change: '0%', trend: 'down' },
            creditOutstanding: { value: '₱0', change: '0%', trend: 'down' },
        };
    }
}

export async function GetUpcomingEvents(limit: number): Promise<UpcomingEvent[]> {
    const upcomingEvents = await db.select()
        .from(Events)
        .where(gte(Events.EventDate, new Date()))
        .orderBy(Events.EventDate)
        .limit(limit);

    return upcomingEvents.map(event => ({
        id: event.EventId.toString(),
        title: event.Title,
        date: event.EventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        type: event.Type,
    }));
}

export async function GetSalesData(timeRange: string): Promise<{ date: string; amount: number }[]> {
    const now = new Date();
    let days;
    switch (timeRange) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 30; // Default to 30 days
    }
    const startDate = subDays(now, days);

    try {
        const dailySales = await db
            .select({
                // Truncate timestamp to the day and cast to date
                day: sql<string>`DATE_TRUNC('day', ${Transactions.Timestamp})`.as('day'),
                // Sum the total amount for each day
                total: sum(Transactions.TotalAmount)
            })
            .from(Transactions)
            .where(gte(Transactions.Timestamp, startDate))
            .groupBy(sql`day`)
            .orderBy(sql`day`);

        // Format the data for the chart
        return dailySales.map(sale => ({
            date: new Date(sale.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount: parseFloat(sale.total || '0'),
        }));

    } catch (error) {
        console.error("Error fetching sales data for chart:", error);
        // Return an empty array on error so the UI doesn't break
        return [];
    }
}

export async function GetRevenueDistribution(timeRange: string): Promise<{ name: string; value: number; percentage: number }[]> {
    const now = new Date();
    let days;
    switch (timeRange) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 30;
    }
    const startDate = subDays(now, days);

    try {
        const salesPerCategory = await db
            .select({
                categoryName: Categories.Name,
                // Calculate revenue per category by summing up the price * quantity for each item
                totalRevenue: sum(sql<string>`${TransactionItems.PriceAtTimeOfSale} * ${TransactionItems.Quantity}`)
            })
            .from(TransactionItems)
            .innerJoin(Transactions, eq(TransactionItems.TransactionId, Transactions.TransactionId))
            .innerJoin(Products, eq(TransactionItems.ProductId, Products.ProductId))
            .innerJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
            .where(gte(Transactions.Timestamp, startDate))
            .groupBy(Categories.Name);

        const totalRevenueForAllCategories = salesPerCategory.reduce((acc, category) => acc + parseFloat(category.totalRevenue || '0'), 0);

        if (totalRevenueForAllCategories === 0) return [];

        return salesPerCategory.map(category => {
            const value = parseFloat(category.totalRevenue || '0');
            const percentage = (value / totalRevenueForAllCategories) * 100;
            return { name: category.categoryName, value, percentage };
        }).sort((a, b) => b.value - a.value); // Sort from highest to lowest revenue
    } catch (error) {
        console.error("Error fetching revenue distribution:", error);
        return [];
    }
}

export async function GetCalendarEvents(limit: number): Promise<any[]> {
    const upcomingEvents = await db.select()
        .from(Events)
        .where(gte(Events.EventDate, new Date()))
        .orderBy(Events.EventDate)
        .limit(limit);

    return upcomingEvents.map(event => ({
        title: event.Title,
        startDate: event.EventDate.toISOString(),
        endDate: event.EventDate.toISOString(), // Assuming it's a single day event for simplicity
        type: event.Type,
    }));
}

export interface ActivityLog {
    id: number;
    timestamp: Date;
    user: string;
    action: string;
    details: string;
}

type CombinedActivity = (MemberActivity & { type: 'member'; timestamp: Date }) | (InventoryActivity & { type: 'inventory' }) | (TransactionActivity & { type: 'transaction' });


export async function getActivityLogs(limit: number = 50, filter?: 'all' | 'member' | 'cashier' | 'admin'): Promise<CombinedActivity[]> {

    try {
        // Fetch Member Activities
        const memberActivitiesData = await db
            .select({
                memberName: Members.Name,
                memberId: Members.MemberId,
                action: MemberActivities.Action,
                timestamp: MemberActivities.Timestamp,
                amount: MemberActivities.Amount,
            })
            .from(MemberActivities)
            .leftJoin(Members, eq(MemberActivities.MemberId, Members.MemberId))
            .orderBy(desc(MemberActivities.Timestamp))
            .limit(Math.ceil(limit / 3));

        const memberActivities: CombinedActivity[] = memberActivitiesData.map(activity => ({
            type: 'member',
            member: activity.memberName || 'Unknown Member',
            memberId: activity.memberId?.toString() ?? 'N/A',
            action: activity.action,
            timestamp: activity.timestamp,
            time: formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }),
            amount: activity.amount ? `₱${parseFloat(activity.amount).toFixed(2)}` : undefined,
        }));

        // Fetch Inventory Activities (assuming an InventoryLogs table exists)
        const inventoryActivitiesData = await db
            .select({
                productName: Products.Name,
                userName: Users.Name,
                action: InventoryLogs.Action,
                details: InventoryLogs.Details,
                timestamp: InventoryLogs.Timestamp,
            })
            .from(InventoryLogs)
            .leftJoin(Products, eq(InventoryLogs.ProductId, Products.ProductId))
            .leftJoin(Users, eq(InventoryLogs.UserId, Users.UserId))
            .orderBy(desc(InventoryLogs.Timestamp))
            .limit(Math.ceil(limit / 3));

        const inventoryActivities: CombinedActivity[] = inventoryActivitiesData.map(activity => ({
            type: 'inventory',
            productName: activity.productName || 'Unknown Product',
            user: activity.userName || 'System',
            action: activity.action,
            details: activity.details ?? '',
            timestamp: activity.timestamp,
            time: formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }),
        }));

        // Fetch Transaction Activities
        const transactionActivitiesData = await db
            .select({
                transactionId: Transactions.TransactionId,
                memberName: Members.Name,
                userName: Users.Name,
                total: Transactions.TotalAmount,
                paymentMethod: Transactions.PaymentMethod,
                timestamp: Transactions.Timestamp,
            })
            .from(Transactions)
            .leftJoin(Members, eq(Transactions.MemberId, Members.MemberId))
            .leftJoin(Users, eq(Transactions.UserId, Users.UserId))
            .orderBy(desc(Transactions.Timestamp))
            .limit(Math.ceil(limit / 3));

        const transactionActivities: CombinedActivity[] = transactionActivitiesData.map(activity => ({
            type: 'transaction',
            transactionId: activity.transactionId.toString(),
            member: activity.memberName || 'Walk-in Customer',
            cashier: activity.userName || 'Unknown Cashier',
            total: parseFloat(activity.total),
            paymentMethod: activity.paymentMethod || 'Cash',
            action: 'completed transaction',
            timestamp: activity.timestamp,
            time: formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }),
        }));

        // Combine, sort, and limit
        return [...memberActivities, ...inventoryActivities, ...transactionActivities]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);

    } catch (error) {
        console.error("Error fetching combined activity logs:", error);
        return [];
    }
}


export interface AdminProfileData {
    userId: string;
    name: string;
    email: string;
    role: string;
    joinDate: string;
    isActive: boolean;
    lastLogin?: string;
    totalTransactions?: number;
    totalMembersManaged?: number;
}

export async function GetCurrentAdminData(): Promise<AdminProfileData | null> {
    const session = await GetCurrentSession();
    if (!session?.UserId) {
        console.error("No user session found");
        return null;
    }

    try {
        const userResult = await UserRepository.GetUserById(parseInt(session.UserId, 10));
        if (!userResult.success || !userResult.user) {
            console.error("Failed to fetch user data");
            return null;
        }

        const user = userResult.user;

        // Get additional stats
        const [transactionCount] = await db
            .select({ count: count() })
            .from(Transactions)
            .where(eq(Transactions.UserId, user.UserId));

        const [memberCount] = await db
            .select({ count: count() })
            .from(Members);

        return {
            userId: user.UserId.toString(),
            name: user.Name,
            email: user.Email,
            role: user.RoleName,
            joinDate: user.CreatedAt.toISOString(),
            isActive: user.IsActive,
            totalTransactions: transactionCount.count,
            totalMembersManaged: memberCount.count,
        };
    } catch (error) {
        console.error("Error fetching admin profile data:", error);
        return null;
    }
}

export async function UpdateAdminProfile(userId: string, data: { name: string; email: string }): Promise<boolean> {
    try {
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            throw new Error("Invalid User ID.");
        }

        const result = await UserRepository.UpdateUser(userIdNum, {
            Name: data.name,
            Email: data.email,
        });

        return result.success;
    } catch (error) {
        console.error("Error updating admin profile:", error);
        return false;
    }
}

export async function SaveAdminProfilePicture(userId: string, image: string): Promise<boolean> {
    console.log(`Saving profile picture for admin ${userId}. Image data length: ${image.length}`);
    // In a real app, you would upload this to a storage service (S3, Cloudinary, etc.)
    // and save the URL in the database.
    // For now, we'll just simulate success.
    return true;
}

export async function RemoveAdminProfilePicture(userId: string): Promise<boolean> {
    console.log(`Removing profile picture for admin ${userId}.`);
    // In a real app, you would delete the image from storage and clear the URL in the database.
    return true;
}

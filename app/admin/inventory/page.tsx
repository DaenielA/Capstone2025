"use client"

import { Navbar } from "@/components/ui/navbar"
import InventoryComponent from "@/components/inventory/InventoryComponent";

export default function AdminInventoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin User" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
           <InventoryComponent userType="admin" showSummaryCards={true} showNotifications={true} />
        </div>
      </main>
    </div>
  )
}

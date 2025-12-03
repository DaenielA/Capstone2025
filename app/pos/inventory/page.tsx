"use client"

import { Navbar } from "@/components/ui/navbar"
import InventoryComponent from "@/components/inventory/InventoryComponent"

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="cashier" userName="Cashier" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <InventoryComponent userType="cashier" />
        </div>
      </main>
    </div>
  )
}

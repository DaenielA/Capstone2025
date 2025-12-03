"use client"

import PointOfSaleClient from "./PointOfSaleClient" // This path is correct for this file location

export default function PointOfSalePage() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <PointOfSaleClient />
    </div>
  )
}
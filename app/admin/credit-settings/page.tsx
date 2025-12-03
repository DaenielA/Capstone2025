"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, Settings } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"

interface CreditSettings {
  SettingId: number
  defaultMarkupPercentage: string
  InterestRate: string
  GracePeriodDays: number
  LateFeeAmount: string
  LateFeePercentage: string
  creditDueDays: number
  creditPenaltyType: 'percentage' | 'fixed'
  creditPenaltyValue: string
  CreatedAt: string
  UpdatedAt: string
}


export default function CreditSettingsPage() {
  const [settings, setSettings] = useState<CreditSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    defaultMarkupPercentage: '5.00',
    InterestRate: '1.50',
    GracePeriodDays: 25,
    LateFeeAmount: '50.00',
    LateFeePercentage: '2.00',
    creditDueDays: 30,
    creditPenaltyType: 'fixed' as 'fixed' | 'percentage',
    creditPenaltyValue: '0.00'
  })


  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/credit-settings')
        const data = await response.json()

        if (data.success && data.settings) {
          setSettings(data.settings)
          setFormData({
            defaultMarkupPercentage: data.settings.defaultMarkupPercentage,
            InterestRate: data.settings.InterestRate,
            GracePeriodDays: data.settings.GracePeriodDays,
            LateFeeAmount: data.settings.LateFeeAmount,
            LateFeePercentage: data.settings.LateFeePercentage,
            creditDueDays: data.settings.creditDueDays,
            creditPenaltyType: data.settings.creditPenaltyType,
            creditPenaltyValue: data.settings.creditPenaltyValue
          })
        }

      } catch (err) {
        setError('Failed to load credit settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/credit-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Credit settings updated successfully!')
        setSettings(data.settings)
      } else {
        setError(data.message || 'Failed to update settings')
      }
    } catch (err) {
      setError('Failed to update credit settings')
    } finally {
      setSaving(false)
    }
  }

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading credit settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-8 w-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold">Credit Settings</h1>
              <p className="text-gray-600">Configure markup, interest, and fee policies</p>
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Markup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Markup Settings</CardTitle>
                  <CardDescription>Configure markup applied to credit purchases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="defaultMarkupPercentage">Default Markup Percentage (%)</Label>
                    <Input
                      id="defaultMarkupPercentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.defaultMarkupPercentage}
                      onChange={(e) => handleInputChange('defaultMarkupPercentage', e.target.value)}
                      placeholder="5.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">Percentage added to credit purchases</p>
                  </div>
                </CardContent>
              </Card>

              {/* Interest Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Interest Settings</CardTitle>
                  <CardDescription>Configure interest rates and grace periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="InterestRate">Interest Rate (%)</Label>
                    <Input
                      id="InterestRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={formData.InterestRate}
                      onChange={(e) => handleInputChange('InterestRate', e.target.value)}
                      placeholder="1.50"
                    />
                    <p className="text-sm text-gray-500 mt-1">Monthly interest rate on credit balances</p>
                  </div>


                  <div>
                    <Label htmlFor="GracePeriodDays">Grace Period (Days)</Label>
                    <Input
                      id="GracePeriodDays"
                      type="number"
                      min="0"
                      max="365"
                      value={formData.GracePeriodDays}
                      onChange={(e) => handleInputChange('GracePeriodDays', parseInt(e.target.value))}
                      placeholder="25"
                    />
                    <p className="text-sm text-gray-500 mt-1">Days before interest starts accruing</p>
                  </div>

                </CardContent>
              </Card>

              {/* Late Fee Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Late Fee Settings</CardTitle>
                  <CardDescription>Configure penalties for overdue payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="LateFeeAmount">Late Fee Amount (₱)</Label>
                    <Input
                      id="LateFeeAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.LateFeeAmount}
                      onChange={(e) => handleInputChange('LateFeeAmount', e.target.value)}
                      placeholder="50.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">Fixed amount for late payments</p>
                  </div>

                  <div>
                    <Label htmlFor="LateFeePercentage">Late Fee Percentage (%)</Label>
                    <Input
                      id="LateFeePercentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.LateFeePercentage}
                      onChange={(e) => handleInputChange('LateFeePercentage', e.target.value)}
                      placeholder="2.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">Percentage of payment amount</p>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Penalty Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Credit Penalty Settings</CardTitle>
                  <CardDescription>Configure penalties for product-specific credits after due days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="creditDueDays">Credit Due Days</Label>
                    <Input
                      id="creditDueDays"
                      type="number"
                      min="0"
                      value={formData.creditDueDays}
                      onChange={(e) => handleInputChange('creditDueDays', parseInt(e.target.value))}
                      placeholder="30"
                    />
                    <p className="text-sm text-gray-500 mt-1">Days after transaction before product credit penalty applies</p>
                  </div>

                  <div>
                    <Label htmlFor="creditPenaltyType">Credit Penalty Type</Label>
                    <Select
                      value={formData.creditPenaltyType}
                      onValueChange={(value: 'percentage' | 'fixed') => handleInputChange('creditPenaltyType', value)}
                    >
                      <SelectTrigger id="creditPenaltyType">
                        <SelectValue placeholder="Select penalty type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">Whether penalty is a fixed amount or percentage of outstanding balance</p>
                  </div>

                  <div>
                    <Label htmlFor="creditPenaltyValue">Credit Penalty Value</Label>
                    <Input
                      id="creditPenaltyValue"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.creditPenaltyValue}
                      onChange={(e) => handleInputChange('creditPenaltyValue', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">The value of the credit penalty (amount or percentage)</p>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Current Settings Info */}
          {settings && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Current Settings Status</CardTitle>
                <CardDescription>Last updated: {new Date(settings.UpdatedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Markup:</span>
                    <p className="text-lg font-semibold">{settings.defaultMarkupPercentage ?? settings.defaultMarkupPercentage}%</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Interest:</span>
                    <p className="text-lg font-semibold">{settings.InterestRate}%</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Grace Period:</span>
                    <p className="text-lg font-semibold">{settings.GracePeriodDays} days</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Credit Due Days:</span>
                    <p className="text-lg font-semibold">{settings.creditDueDays} days</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Credit Penalty Type:</span>
                    <p className="text-lg font-semibold">{settings.creditPenaltyType}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Credit Penalty Value:</span>
                    <p className="text-lg font-semibold">{settings.creditPenaltyValue}{settings.creditPenaltyType === 'percentage' ? '%' : '₱'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

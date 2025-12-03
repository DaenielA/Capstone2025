"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, isToday, isWithinInterval } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
// Define a type for calendar events that matches what the API returns
type CalendarEvent = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string;
  type: "Operation" | "Community" | "Management";
};
import { Badge } from "@/components/ui/badge"

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Date[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    allDay: false,
    location: "",
    type: "Operation" as CalendarEvent["type"]
  })

  // Generate calendar days for the current month
  useEffect(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    // Add padding days at the beginning to align with the correct day of the week
    const startDay = getDay(start)
    const paddingDays = Array.from({ length: startDay }, (_, i) => 
      new Date(start.getFullYear(), start.getMonth(), -i)
    ).reverse()

    // Add padding days at the end to complete the grid (6 rows of 7 days)
    const totalDaysNeeded = 42 // 6 rows of 7 days
    const endPaddingDays = Array.from(
      { length: totalDaysNeeded - days.length - paddingDays.length },
      (_, i) => new Date(end.getFullYear(), end.getMonth(), end.getDate() + i + 1)
    )

    setCalendarDays([...paddingDays, ...days, ...endPaddingDays])
  }, [currentMonth])

  // Fetch events for the current month
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const month = currentMonth.getMonth()
        const year = currentMonth.getFullYear()
        
        const response = await fetch(`/api/calendar?month=${month}&year=${year}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`)
        }
        
        const data = await response.json()
        setEvents(data)
      } catch (err) {
        console.error("Error fetching calendar events:", err)
        setError("Failed to load calendar events. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchEvents()
  }, [currentMonth])

  // Handle month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  // Open event creation modal
  const openNewEventModal = (date: Date) => {
    setSelectedDate(date)
    
    // Set default form data with selected date
    const formattedDate = format(date, "yyyy-MM-dd")
    setFormData({
      ...formData,
      startDate: `${formattedDate}T09:00`,
      endDate: `${formattedDate}T10:00`
    })
    
    setShowEventModal(true)
  }

  // Open event details modal
  const openEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDetails(true)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, allDay: checked }))
  }

  // Submit new event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create event')
      }
      
      // Refresh events
      const month = currentMonth.getMonth()
      const year = currentMonth.getFullYear()
      const eventsResponse = await fetch(`/api/calendar?month=${month}&year=${year}`)
      const data = await eventsResponse.json()
      setEvents(data)
      
      // Close modal and reset form
      setShowEventModal(false)
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        allDay: false,
        location: "",
        type: "Operation"
      })
      
    } catch (err) {
      console.error("Error creating event:", err)
      alert("Failed to create event. Please try again.")
    }
  }

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.startDate)
      const eventEnd = parseISO(event.endDate)
      
      return isWithinInterval(day, { start: eventStart, end: eventEnd })
    })
  }

  // Determine color based on event type
  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "Operation":
        return "bg-blue-500"
      case "Community":
        return "bg-purple-500"
      case "Management":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Determine text based on event type
  const getEventTypeText = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "Operation":
        return "Operation"
      case "Community":
        return "Community"
      case "Management":
        return "Management"
      default:
        return "Event"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userType="admin" userName="Admin User" />

      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">Manage events and scheduling for the cooperative</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="hidden md:flex"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium mx-2">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 ml-2"
                onClick={() => openNewEventModal(new Date())}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>

          {/* Event type legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              <span>Operation</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
              <span>Community</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span>Management</span>
            </div>
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
          ) : error ? (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardContent className="p-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-px mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                    <div key={i} className="text-center py-2 font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {calendarDays.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                    const dayEvents = getEventsForDay(day)
                    
                    return (
                      <div 
                        key={i} 
                        className={`bg-white min-h-[120px] p-2 ${
                          !isCurrentMonth ? "text-gray-400" : isToday(day) ? "bg-amber-50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span 
                            className={`text-sm font-medium ${
                              isToday(day) ? "bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center" : ""
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          <button 
                            onClick={() => openNewEventModal(day)}
                            className="text-gray-400 hover:text-amber-500"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                          {dayEvents.map((event, idx) => (
                            <button
                              key={idx}
                              onClick={() => openEventDetails(event)}
                              className={`w-full text-left px-1 py-0.5 rounded text-xs text-white truncate ${getEventColor(event.type)}`}
                            >
                              {event.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* New Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Event title"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Event description"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Event Type
                </Label>
                <Select 
                  name="type" 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CalendarEvent["type"] }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operation">Operation</SelectItem>
                    <SelectItem value="Community">Community</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right">
                  <Label htmlFor="allDay">All Day</Label>
                </div>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox 
                    id="allDay" 
                    checked={formData.allDay} 
                    onCheckedChange={handleCheckboxChange} 
                  />
                  <label
                    htmlFor="allDay"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All day event
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Start
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type={formData.allDay ? "date" : "datetime-local"}
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type={formData.allDay ? "date" : "datetime-local"}
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Event location (optional)"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Save Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="py-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                <Badge 
                  className={`${getEventColor(selectedEvent.type)} hover:${getEventColor(selectedEvent.type)}`}
                >
                  {getEventTypeText(selectedEvent.type)}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p className="mt-1">{selectedEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Start</p>
                    <p className="mt-1">
                      {format(parseISO(selectedEvent.startDate), selectedEvent.allDay ? "MMM d, yyyy" : "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">End</p>
                    <p className="mt-1">
                      {format(parseISO(selectedEvent.endDate), selectedEvent.allDay ? "MMM d, yyyy" : "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
                
                {selectedEvent.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="mt-1">{selectedEvent.location}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEventDetails(false)}
                >
                  Close
                </Button>
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={() => {
                    setShowEventDetails(false)
                    // In a real app, this would open the edit form with the event data
                    alert("Edit functionality would be implemented here")
                  }}
                >
                  Edit Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 
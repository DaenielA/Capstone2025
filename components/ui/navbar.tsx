"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Bell, ShoppingCart, Users, BarChart2, Menu, X, User, LogOut, CreditCard, Home, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { NotificationBell } from "@/components/ui/NotificationBell"
import { MemberNotificationBell } from "@/components/ui/MemberNotificationBell"
import { GetCurrentMemberData, MemberProfileData } from "@/app/members/actions"

interface NavbarProps {
  userType?: "cashier" | "admin" | "member"
  userName?: string
  memberData?: MemberProfileData
}

export function Navbar({ userType = "cashier", userName = "John Doe", memberData }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // memberInfo and isLoadingMemberData are no longer needed here as MemberNotificationBell handles its own data
  // const [memberInfo, setMemberInfo] = useState<MemberProfileData | null>(memberData || null)
  // const [isLoadingMemberData, setIsLoadingMemberData] = useState(!memberData && userType === "member")
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Removed useEffect for fetching member data as it's no longer needed for MemberNotificationBell
  // useEffect(() => {
  //   async function fetchMemberData() {
  //     if (userType === "member" && !memberData) {
  //       try {
  //         setIsLoadingMemberData(true);
  //         const data = await GetCurrentMemberData();
  //         if (data) {
  //           setMemberInfo(data);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching member data for notifications:", error);
  //       } finally {
  //         setIsLoadingMemberData(false);
  //       }
  //     }
  //   }

  //   fetchMemberData();
  // }, [userType, memberData]);

  const getNavLinks = () => {
    switch (userType) {
      case "cashier":
        return [
          { href: "/pos", label: "POS", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
          { href: "/pos/inventory", label: "Inventory", icon: <BarChart2 className="h-4 w-4 mr-2" /> },
          { href: "/pos/transactions", label: "Transactions", icon: <Receipt className="h-4 w-4 mr-2" /> },
        ]
      case "admin":
        return [
          { href: "/admin", label: "Dashboard", icon: <BarChart2 className="h-4 w-4 mr-2" /> },
          { href: "/admin/inventory", label: "Inventory", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
          { href: "/admin/members", label: "Members", icon: <Users className="h-4 w-4 mr-2" /> },
          { href: "/admin/reports", label: "Reports", icon: <BarChart2 className="h-4 w-4 mr-2" /> },
          { href: "/admin/accounts", label: "Accounts", icon: <User className="h-4 w-4 mr-2" /> },
        ]
      case "member":
        return [
          { href: "/members", label: "Dashboard", icon: <BarChart2 className="h-4 w-4 mr-2" /> },
        ]
      default:
        return []
    }
  }

  const navLinks = getNavLinks()

  // Function to check if a link is active
  const isLinkActive = (href: string) => {
    // Special case for cashier - POS is the same as home
    if (userType === "cashier" && (href === "/pos" || pathname === "/pos")) {
      return href === "/pos"
    }

    // For exact matches (like /admin or /pos or /members)
    const homePathForUserType = userType === "member" ? "/members" : `/${userType}`;
    if (href === homePathForUserType && pathname === href) {
      return true
    }

    // For nested routes (like /admin/inventory, /admin/members, etc.)
    if (href !== homePathForUserType && pathname?.startsWith(href)) {
      return true
    }

    return false
  }

  // Function to handle logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Redirect to login page
        router.push('/login');
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      } else {
        toast({
          title: "Logout Failed",
          description: "There was an error logging out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Render notification component based on user type
  const renderNotifications = () => {
    if (userType === "admin" || userType === "cashier") {
      return <NotificationBell />;
    } else if (userType === "member") {
      // MemberNotificationBell now handles its own data fetching and loading state internally
      return <MemberNotificationBell />;
    }
    
    // Fallback
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white/80"
      }`}
    >
      <div className="container mx-auto px-4 min-w-screen">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/pandol-logo.png" 
                alt="Pandol Cooperative Logo" 
                width={60} 
                height={60} 
                className="rounded-full"
              />
              <span className="text-lg font-bold text-gray-900">Pandol Multi-Purpose Cooperative <br /> Management System</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {userType === "cashier" ? (
              // For cashier, we remove the Home link since POS is now the home
              <></>
            ) : (
              <Link
                href={`/${userType === "member" ? "members" : userType}`}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${
                  pathname === `/${userType}`
                    ? "text-amber-600 bg-amber-50 rounded-md"
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                <Home className="h-4 w-4 mr-2" />
                {userType.charAt(0).toUpperCase() + userType.slice(1)} Home
              </Link>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${
                  isLinkActive(link.href)
                    ? "text-amber-600 bg-amber-50 rounded-md"
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {renderNotifications()}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={userType === 'member' ? '/members/profile' : `/${userType}/profile`} className="w-full cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-2">
            <nav className="flex flex-col space-y-1">
              {userType !== "cashier" && (
                <Link
                  href={`/${userType === "member" ? "members" : userType}`}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${
                    pathname === `/${userType === "member" ? "members" : userType}`
                      ? "text-amber-600 bg-amber-50 rounded-md"
                      : "text-gray-700 hover:text-amber-600"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="h-4 w-4 mr-2" />
                  {userType.charAt(0).toUpperCase() + userType.slice(1)} Home
                </Link>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${
                    isLinkActive(link.href)
                      ? "text-amber-600 bg-amber-50 rounded-md"
                      : "text-gray-700 hover:text-amber-600"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

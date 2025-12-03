"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  BarChart2,
  ChevronRight,
  MapPin,
  Phone,
  ShoppingCart,
  Users,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Send,
  CreditCard,
  HomeIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  // Unified login form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  // Handle form submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    // Check email to determine redirect
    if (email === "admin@cooperative.com") {
      window.location.href = "/admin"
    } else if (email === "cashier@cooperative.com") {
      window.location.href = "/pos"
    } else if (email === "member@cooperative.com") {
      window.location.href = "/members"
    } else {
      setLoginError(
        "Invalid email. Please use admin@cooperative.com, cashier@cooperative.com, or member@cooperative.com",
      )
    }
  }

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-w-screen min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container flex h-16 items-center justify-between min-w-screen">
          <div className="flex items-center gap-2">
            <Image 
              src="/pandol-logo.png" 
              alt="Pandol Cooperative Logo" 
              width={60} 
              height={60} 
              className="rounded-full"
            />
            <span className="text-xl font-bold text-gray-900">Pandol Multi-Purpose Cooperative Management System</span>
          </div> 
          <nav className="hidden md:flex items-center space-x-6">
            {/* <a href="#about" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors">
              About Us
            </a>
            <a href="#features" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors">
              Features
            </a> 
            <a href="#login" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors">
              Login
            </a>
            <a href="#contact" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors">
              Contact
            </a>*/}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container min-w-screen">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                Serving the Community Since 2018
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-gray-900">
                Sales &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  Inventory Management
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                A comprehensive system designed for Pandol Cooperative to manage sales, inventory, and member credit in
                one integrated platform.
              </p>
             {/* <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    Access System
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="group">
                    Explore Features
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
              </div>*/}
              <div className="pt-6">
                <p className="text-sm text-gray-500 mb-3">Trusted by over 2,000 members in our community</p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-300 border-2 border-white"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">Join our growing community</span>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-gray-800">System Highlights</h3>
                    <div className="flex space-x-2">
                      <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                      <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                      <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-24 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Total Members</div>
                          <div className="text-2xl font-bold text-gray-900">2,145</div>
                        </div>
                        <div className="h-12 w-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-amber-600" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Daily Transactions</div>
                        <div className="text-xl font-bold text-gray-900">150+</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Products</div>
                        <div className="text-xl font-bold text-gray-900">1,200+</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">System Features</div>
                        <a href="#features">
                          <Button variant="ghost" size="sm" className="h-8 text-amber-600">
                            View All
                          </Button>
                        </a>
                      </div>
                      {[
                        { title: "Sales Management", icon: <ShoppingCart className="h-4 w-4 text-amber-600" /> },
                        { title: "Inventory Management", icon: <BarChart2 className="h-4 w-4 text-amber-600" /> },
                        { title: "Credit Management", icon: <CreditCard className="h-4 w-4 text-amber-600" /> },
                        {title: "Point of Sale", icon: <ShoppingCart className="h-4 w-4 text-amber-600" /> },
                        { title: "Member Portal", icon: <Users className="h-4 w-4 text-amber-600" /> },
                        {title: "Product Conversion", icon: <BarChart2 className="h-4 w-4 text-amber-600" /> },
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-200 to-orange-200 flex items-center justify-center">
                            {feature.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{feature.title}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section 
      <section id="about" className="py-20 bg-white">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 mb-4">
                About Our System
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Empowering Pandol Cooperative with Modern Technology
              </h2>
              <p className="text-lg text-gray-600">
                Our integrated POS and Credit Management system streamlines operations, enhances member experience, and
                drives community growth.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl transform -rotate-3"></div>
                <div className="relative overflow-hidden rounded-3xl">
                  <Image
                    src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"
                    alt="POS System"
                    width={600}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-gray-900">Why We Built This System</h3>
              <p className="text-gray-600">
                Pandol Cooperative needed a solution that could handle sales transactions, inventory management, and
                member credit in one integrated platform. Our system addresses these needs while providing a seamless
                experience for cashiers, administrators, and members.
              </p>

              <h3 className="text-2xl font-bold text-gray-900 pt-4">Our Approach</h3>
              <p className="text-gray-600">
                We've designed a user-friendly system with modern interfaces, real-time updates, and comprehensive
                reporting. The system is built to scale with the cooperative's growth and adapt to changing needs.
              </p>

              <div className="pt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Key Benefits</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    "Streamlined Operations",
                    "Enhanced Member Experience",
                    "Accurate Reporting",
                    "Secure Transactions",
                  ].map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Image 
                        src="/pandol-logo.png" 
                        alt="Pandol Cooperative Logo" 
                        width={16} 
                        height={16} 
                        className="rounded-full"
                      />
                      <span className="text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section 
      <section id="features" className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 mb-4">
                System Features
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Comprehensive tools for every role</h2>
              <p className="text-lg text-gray-600">
                Our system provides tailored features for cashiers, administrators, and members to ensure efficient
                operations and excellent service.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Point of Sale",
                description:
                  "An intuitive interface for cashiers to process sales, manage transactions, and provide excellent customer service.",
                icon: <ShoppingCart className="h-6 w-6 text-white" />,
                delay: 0.1,
                image:
                  "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
              {
                title: "Inventory Management",
                description:
                  "Track product stock levels, receive alerts for low inventory, and manage product information efficiently.",
                icon: <BarChart2 className="h-6 w-6 text-white" />,
                delay: 0.2,
                image:
                  "https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
              {
                title: "Member Credit System",
                description:
                  "Manage member credit accounts, track balances, and process payments with comprehensive reporting.",
                icon: <CreditCard className="h-6 w-6 text-white" />,
                delay: 0.3,
                image:
                  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
              {
                title: "Admin Dashboard",
                description:
                  "Gain insights into sales, inventory, and member activity with comprehensive analytics and reporting tools.",
                icon: <BarChart2 className="h-6 w-6 text-white" />,
                delay: 0.4,
                image:
                  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
              {
                title: "Member Portal",
                description:
                  "Provide members with access to their purchase history, credit status, and payment options.",
                icon: <Users className="h-6 w-6 text-white" />,
                delay: 0.5,
                image:
                  "https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
              {
                title: "Secure Authentication",
                description:
                  "Role-based access control ensures that users can only access the features they need for their specific roles.",
                icon: <Lock className="h-6 w-6 text-white" />,
                delay: 0.6,
                image:
                  "https://images.unsplash.com/photo-1563237023-b1e970526dcb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: feature.delay }}
              >
                <Card className="h-full overflow-hidden border-none shadow-lg hover:shadow-xl transition-all group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <CardContent className="p-0 relative">
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={feature.image || "/placeholder.svg"}
                        alt={feature.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-20 bg-white">
        <div className="container min-w-screen">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 mb-4">
                Access System
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Login to Your Account</h2>
              <p className="text-lg text-gray-600 mb-8">
                Access the Pandol Cooperative POS and Credit Management System
              </p>

              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Go to Login Page
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <div className="container min-w-screen">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="text-3xl sm:text-4xl font-bold">Get in touch with us</h2>
              <p className="text-lg text-amber-50">
                Have questions about our POS and Credit Management system? Reach out to us today.
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Visit Us</h3>
                    <p className="text-amber-50">Pandol, Corella, Bohol, Philippines 6300</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Call Us</h3>
                    <p className="text-amber-50">+63 (38) 412-5678</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <HomeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Office Hours</h3>
                    <p className="text-amber-50">
                      Monday to Friday: 8:00 AM - 5:00 PM
                      <br />
                      Saturday: 8:00 AM - 12:00 PM
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex space-x-4">
                <a
                  href="#"
                  className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Image 
                    src="/pandol-logo.png" 
                    alt="Pandol Cooperative Logo" 
                    width={20} 
                    height={20} 
                    className="rounded-full"
                  />
                </a>
                <a
                  href="#"
                  className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Image 
                    src="/pandol-logo.png" 
                    alt="Pandol Cooperative Logo" 
                    width={20} 
                    height={20} 
                    className="rounded-full"
                  />
                </a>
                <a
                  href="#"
                  className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Image 
                    src="/pandol-logo.png" 
                    alt="Pandol Cooperative Logo" 
                    width={20} 
                    height={20} 
                    className="rounded-full"
                  />
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold mb-4">Send us a message</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      Name
                    </label>
                    <Input
                      id="name"
                      className="bg-white/20 border-white/10 text-white placeholder:text-white/60"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      id="email"
                      className="bg-white/20 border-white/10 text-white placeholder:text-white/60"
                      placeholder="Your email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    className="bg-white/20 border-white/10 text-white placeholder:text-white/60"
                    placeholder="Subject"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full rounded-md bg-white/20 border-white/10 text-white placeholder:text-white/60 p-2"
                    placeholder="Your message"
                  ></textarea>
                </div>
                <Button className="w-full bg-white text-amber-600 hover:bg-white/90">Send Message</Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container min-w-screen">
          {/* Top Footer */}
          <div className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <span className="text-xl font-bold">Pandol Cooperative</span>
                </div>
                <p className="text-gray-400">
                  A member-owned financial institution dedicated to serving the people of Pandol, Corella, Bohol with
                  affordable financial services and community development programs.
                </p>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center hover:bg-amber-500 transition-colors"
                  >
                    <Image 
                      src="/pandol-logo.png" 
                      alt="Pandol Cooperative Logo" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                  </a>
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center hover:bg-amber-500 transition-colors"
                  >
                    <Image 
                      src="/pandol-logo.png" 
                      alt="Pandol Cooperative Logo" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                  </a>
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center hover:bg-amber-500 transition-colors"
                  >
                    <Image 
                      src="/pandol-logo.png" 
                      alt="Pandol Cooperative Logo" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#about" className="text-gray-400 hover:text-amber-500 transition-colors flex items-center">
                      <ChevronRight className="h-4 w-4 mr-1" /> About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="#features"
                      className="text-gray-400 hover:text-amber-500 transition-colors flex items-center"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" /> Features
                    </a>
                  </li>
                  <li>
                    <a href="#login" className="text-gray-400 hover:text-amber-500 transition-colors flex items-center">
                      <ChevronRight className="h-4 w-4 mr-1" /> Login
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contact"
                      className="text-gray-400 hover:text-amber-500 transition-colors flex items-center"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" /> Contact Us
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Contact Info</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400">Pandol, Corella, Bohol, Philippines 6300</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400">+63 (38) 412-5678</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400">info@pandolcoop.org</span>
                  </li>
                </ul>
              </div>

             {/* <div>
                <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Newsletter</h3>
                <p className="text-gray-400 mb-4">
                  Subscribe to our newsletter to receive updates on our services and features.
                </p>
                <div className="flex">
                  <Input
                    placeholder="Your email address"
                    className="bg-gray-800 border-gray-700 text-white rounded-r-none focus:ring-amber-500 focus:border-amber-500"
                  />
                  <Button className="bg-amber-600 hover:bg-amber-500 rounded-l-none">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>*/}
            </motion.div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-800 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} Pandol Cooperative. All rights reserved.
              </p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="text-gray-500 hover:text-amber-500 text-sm">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-amber-500 text-sm">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-amber-500 text-sm">
                  Sitemap
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Search,
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle, ChevronDown,
  Image as ImageIcon,
  Check, ChevronsUpDown,
  ArrowRightLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import Image from "next/image"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DollarSign,
  TrendingUp,
  Package2,
  FileText,
  Download,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommandList } from "@/components/ui/command";
import { toast } from "@/components/ui/use-toast"
import { INVENTORY_CONSTANTS, STOCK_STATUS, PRODUCT_STATUS_CONFIG, PRODUCT_STATUS_PRIORITIES } from "@/lib/constants"
import { cn } from "@/lib/utils";

// Product type definition
interface Product {
  id: string
  name: string
  price: number
  basePrice: number
  profitType: "percentage" | "fixed"
  profitValue: number
  creditMarkupType?: "percentage" | "fixed"
  creditMarkupValue?: number
  creditDueDays?: number
  creditPenaltyType?: "percentage" | "fixed"
  creditPenaltyValue?: number
  category: string
  image: string
  sku: string
  stock: number
  description: string
  supplier: string
  lastRestocked: string
  expiryDate?: string | null
  isActive?: boolean
  hasTransactions?: boolean
  ParentProductId?: number | null
  ConversionFactor?: number | null
  piecePrice?: number
  pieceUnitName?: string
  PiecesPerPack?: number | null
  updatedAt?: string | null // For Date Edited
  currentPiecesPerPack?: number | null // For current pieces in stock when product is a pack
}

// API response type definition
interface ProductsApiResponse {
  status: string;
  products: Product[];
  message?: string;
}

type ProductPayload = Omit<Product, 'id' | 'lastRestocked' | 'updatedAt'> & {
  id?: string;
  image?: string; // Image is optional and can be a base64 string
};

// Helper functions for date handling, moved outside the component
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

const isExpired = (dateString: string | null | undefined) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date < new Date();
};

const isExpiringSoon = (dateString: string | null | undefined) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(today.getMonth() + 1);
  return date > today && date <= oneMonthFromNow;
};

// New helper function to get product status, similar to Filament's badgeable column logic
const getProductStatus = (product: Product) => {
  if (product.isActive === false) {
    return PRODUCT_STATUS_CONFIG.ARCHIVED;
  }
  if (product.expiryDate) {
    if (isExpired(product.expiryDate)) {
      return PRODUCT_STATUS_CONFIG.EXPIRED;
    }
    if (isExpiringSoon(product.expiryDate)) {
      return PRODUCT_STATUS_CONFIG.EXPIRING_SOON;
    }
  }
  return PRODUCT_STATUS_CONFIG.ACTIVE;
};

// Add a helper function to determine stock status
const getStockStatus = (stock: number) => {
  if (stock < INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD) return STOCK_STATUS.LOW;
  return STOCK_STATUS.NORMAL;
};

// Helper to get status priority for sorting
const getStatusPriority = (product: Product) => {
  if (product.isActive === false) return PRODUCT_STATUS_PRIORITIES.ARCHIVED;
  if (product.expiryDate && isExpired(product.expiryDate)) return PRODUCT_STATUS_PRIORITIES.EXPIRED;
  if (product.expiryDate && isExpiringSoon(product.expiryDate)) return PRODUCT_STATUS_PRIORITIES.EXPIRING_SOON;
  return PRODUCT_STATUS_PRIORITIES.ACTIVE;
};

interface InventoryComponentProps {
    userType: 'admin' | 'cashier';
    showSummaryCards?: boolean;
    showNotifications?: boolean;
}

export default function InventoryComponent({ userType, showSummaryCards = false, showNotifications = false }: InventoryComponentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(["all"])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationMessages, setNotificationMessages] = useState<{ message: string; type: 'lowStock' | 'expiringSoon' | 'expired' }[]>([])
  const [activeNotificationFilter, setActiveNotificationFilter] = useState<'lowStock' | 'expiringSoon' | 'expired' | null>(null);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);

  const [inventorySummary, setInventorySummary] = useState({
    totalValue: 0,
    totalProfit: 0,
    totalStock: 0,
  })

  const [isEditMode, setIsEditMode] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editProduct, setEditProduct] = useState({
    id: "",
    name: "",
    ParentProductId: null as number | null,
    ConversionFactor: null as number | null,
    category: "",
    price: "",
    basePrice: "",
    profitType: "percentage",
    profitValue: "",
    creditMarkupType: "percentage",
    creditMarkupValue: "",
    creditDueDays: "",
    creditPenaltyType: "percentage",
    creditPenaltyValue: "",
    stock: "",
    supplier: "",
    piecePrice: "",
    pieceUnitName: "",
    PiecesPerPack: "",
    description: "",
    sku: "",
    lastRestocked: "",
    expiryDate: "",
    updatedAt: "",
    isActive: true
  })
  const [editProductImage, setEditProductImage] = useState<string | null>(null)
  const [editErrors, setEditErrors] = useState({
    name: "",
    category: "",
    price: "",
    basePrice: "",
    profitValue: "",
    creditMarkupType: "",
    creditMarkupValue: "",
    creditDueDays: "",
    creditPenaltyType: "",
    creditPenaltyValue: "",
    stock: "",
    sku: "",
    expiryDate: "",
    image: "",
    piecePrice: "",
    pieceUnitName: "",
    PiecesPerPack: "",
  });

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    basePrice: "",
    profitType: "percentage",
    profitValue: "",
    creditMarkupType: "percentage",
    creditMarkupValue: "",
    creditDueDays: "",
    creditPenaltyType: "percentage",
    creditPenaltyValue: "",
    stock: "",
    supplier: "",
    description: "",
    sku: "",
    expiryDate: "",
    ParentProductId: null as number | null,
    ConversionFactor: null as number | null,
    piecePrice: "",
    pieceUnitName: "",
    PiecesPerPack: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    category: "",
    price: "",
    basePrice: "",
    profitValue: "",
    stock: "",
    creditMarkupType: "percentage",
    creditMarkupValue: "",
    creditDueDays: "",
    creditPenaltyType: "",
    creditPenaltyValue: "",
    image: "",
    sku: "",
    expiryDate: "",
    ParentProductId: "",
    ConversionFactor: "",
    piecePrice: "",
    pieceUnitName: "",
    PiecesPerPack: "",
  });
  const [updatedStock, setUpdatedStock] = useState("")
  const [stockUpdateError, setStockUpdateError] = useState("")
  const [isProductDetailModalOpen, setIsProductDetailModalOpen] = useState(false)
  const [view, setView] = useState<'active' | 'archived'>('active');

  const [isCategoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isEditCategoryPopoverOpen, setEditCategoryPopoverOpen] = useState(false);
  const createProductPayload = (productState: typeof newProduct | typeof editProduct, image?: string | null): Partial<ProductPayload> => {
    const payload: Partial<ProductPayload> = {
      name: productState.name,
      description: productState.description,
      sku: productState.sku,
      category: productState.category,
      supplier: productState.supplier,
      profitType: productState.profitType as "percentage" | "fixed",
      creditMarkupType: productState.creditMarkupType as "percentage" | "fixed",
      creditMarkupValue: parseFloat(productState.creditMarkupValue || '0'),
      creditDueDays: productState.creditDueDays ? parseInt(productState.creditDueDays, 10) : undefined,
      creditPenaltyType: productState.creditPenaltyType as "percentage" | "fixed",
      creditPenaltyValue: parseFloat(productState.creditPenaltyValue || '0'),
      price: parseFloat(productState.price || '0'),
      basePrice: parseFloat(productState.basePrice || '0'),
      profitValue: parseFloat(productState.profitValue || '0'),
      stock: parseInt(productState.stock || '0', 10),
      expiryDate: productState.expiryDate || null,
      ParentProductId: productState.ParentProductId,
      ConversionFactor: productState.ConversionFactor ? parseInt(productState.ConversionFactor.toString(), 10) : null,
      piecePrice: productState.piecePrice ? parseFloat(productState.piecePrice) : undefined, // Correctly camelCased
      PiecesPerPack: productState.PiecesPerPack ? parseInt(productState.PiecesPerPack, 10) : null,
      pieceUnitName: productState.pieceUnitName || "",
    };
    if (image) payload.image = image;
    return payload;
  };

  const checkForNearExpiryProducts = (productsList: Product[]) => {
    const nearExpiryProducts = productsList.filter(product =>
      product.expiryDate && isExpiringSoon(product.expiryDate) && !isExpired(product.expiryDate)
    );

    if (nearExpiryProducts.length > 0) {
      toast({
        title: "Products Expiring Soon",
        description: `${nearExpiryProducts.length} product(s) will expire soon. Check inventory for details.`,
        variant: "destructive",
      });
    }

    const expiredProducts = productsList.filter(product =>
      product.expiryDate && isExpired(product.expiryDate)
    );

    if (expiredProducts.length > 0) {
      toast({
        title: "Expired Products",
        description: `${expiredProducts.length} product(s) have expired. Please remove from inventory.`,
        variant: "destructive",
      });
    }
  };

  const calculatePrice = (
    basePrice: string,
    profitType: "percentage" | "fixed",
    profitValue: string
  ): number => {
    const basePriceNum = parseFloat(basePrice);
    const profitValueNum = parseFloat(profitValue);

    if (isNaN(basePriceNum) || isNaN(profitValueNum)) {
      return 0;
    }

    if (profitType === "percentage") {
      return basePriceNum * (1 + profitValueNum / 100);
    } else {
      return basePriceNum + profitValueNum;
    }
  }

  const handleArchiveProduct = async (id: number) => {
    const confirmArchive = window.confirm("Are you sure you want to archive this product? Archived products will not appear in the POS system but can be restored later.")

    if (confirmArchive) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to archive product');
        }

        const updatedProducts = products.map(product => {
          if (product.id === id.toString()) {
            return { ...product, isActive: false }
          }
          return product
        })

        setProducts(updatedProducts)

        toast({
          title: "Product Archived",
          description: "The product has been archived and will no longer appear in the POS system.",
        })

      } catch (error) {
        console.error('Error archiving product:', error)
        toast({
          title: "Failed to Archive Product",
          description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  const handleActivateProduct = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to activate product');
      }

      const updatedProducts = products.map(p => p.id === id.toString() ? { ...p, isActive: true } : p);
      setProducts(updatedProducts);

      toast({
        title: "Product Activated",
        description: "The product has been activated and will now appear in the POS system.",
      })

    } catch (error) {
      console.error('Error activating product:', error)
      toast({ title: "Failed to Activate Product", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" })
    }
  }

  const handlePermanentDeleteProduct = async (id: number) => {
    const confirmPermanentDelete = window.confirm(
      "DANGER: Are you sure you want to permanently delete this product? This action is irreversible and the product data will be lost forever."
    );

    if (confirmPermanentDelete) {
      try {
        const response = await fetch(`/api/products/${id}?permanent=true`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) {
            throw new Error(errorData.message || 'This product is linked to past transactions and cannot be deleted.');
          }
          throw new Error(errorData.message || 'Failed to permanently delete product');
        }

        setProducts(products.filter(product => product.id !== id.toString()));

        toast({
          title: "Product Deleted Permanently",
          description: "The product has been successfully and permanently deleted.",
        });

      } catch (error) {
        console.error('Error permanently deleting product:', error);
        toast({
          title: "Failed to Delete Product",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  const initializeEditForm = (product: Product) => {
    const newEditProduct = {
      id: (product.id || '').toString(),
      name: product.name,
      category: product.category,
      price: (product.price || 0).toString(),
      basePrice: (product.basePrice || 0).toString(),
      profitType: product.profitType,
      profitValue: (product.profitValue || 0).toString(),
      creditMarkupType: product.creditMarkupType || "percentage",
      creditMarkupValue: (product.creditMarkupValue || 0).toString(),
      creditDueDays: (product.creditDueDays || "").toString(),
      creditPenaltyType: product.creditPenaltyType || "percentage",
      creditPenaltyValue: (product.creditPenaltyValue || 0).toString(),
      stock: (product.stock || 0).toString(),
      supplier: product.supplier || "",
      description: product.description || "",
      sku: product.sku,
      lastRestocked: product.lastRestocked,
      expiryDate: product.expiryDate || "",
      ParentProductId: product.ParentProductId || null,
      ConversionFactor: product.ConversionFactor || null,
      piecePrice: (product.piecePrice || 0).toString(),
      pieceUnitName: product.pieceUnitName || "",
      PiecesPerPack: (product.PiecesPerPack || "").toString(),
      updatedAt: product.updatedAt || "",
      isActive: product.isActive !== undefined ? product.isActive : true,
    };
    setEditProduct(newEditProduct);
    setEditProductImage(null)
    setEditErrors({
      name: "",
      category: "",
      price: "",
      basePrice: "",
      profitValue: "",
      stock: "",
      creditMarkupType: "",
      creditMarkupValue: "",
      creditDueDays: "",
      creditPenaltyType: "",
      creditPenaltyValue: "",
      sku: "",
      expiryDate: "",
      image: "",
      piecePrice: "",
      pieceUnitName: "",
      PiecesPerPack: "",
    });
    setIsEditMode(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const updatedProduct = { ...editProduct, [name]: value };

    if (name === 'ConversionFactor') {
      const conversionFactor = value ? parseInt(value, 10) : null;
      if (conversionFactor && conversionFactor > 0) {
        updatedProduct.ParentProductId = parseInt(editProduct.id, 10);
      } else {
        updatedProduct.ParentProductId = null;
      }
    }

    setEditProduct(updatedProduct);
    if (name in editErrors) {
      setEditErrors({
        ...editErrors,
        [name]: ""
      })
    }
  }

  const handleEditCategoryChange = (value: string) => {
    setEditProduct({
      ...editProduct,
      category: value
    })

    setEditErrors({
      ...editErrors,
      category: ""
    })
  }

  const handleEditProfitChange = (type: string, value: string) => {
    const newProfitType = type || editProduct.profitType;
    const newProfitValue = value || editProduct.profitValue;

    const calculatedPrice = calculatePrice(editProduct.basePrice, newProfitType as "percentage" | "fixed", newProfitValue);

    setEditProduct({
      ...editProduct,
      profitType: newProfitType as "percentage" | "fixed",
      profitValue: newProfitValue,
      price: calculatedPrice.toFixed(2)
    });

    if (value) {
      setEditErrors({
        ...editErrors,
        profitValue: ""
      });
    }
  }

  const handleEditBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const calculatedPrice = calculatePrice(value, editProduct.profitType as "percentage" | "fixed", editProduct.profitValue);

    setEditProduct({
      ...editProduct,
      basePrice: value,
      price: calculatedPrice.toFixed(2)
    });

    setEditErrors({
      ...editErrors,
      basePrice: ""
    });
  }

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditProductImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateEditForm = (): boolean => {
    const newErrors = {
      name: "",
      category: "",
      price: "",
      basePrice: "",
      profitValue: "",
      stock: "",
      creditMarkupType: "",
      creditMarkupValue: "",
      creditDueDays: "",
      creditPenaltyType: "",
      creditPenaltyValue: "",
      sku: "",
      expiryDate: "",
      image: "",
      piecePrice: "",
      pieceUnitName: "",
      ParentProductId: "",
      ConversionFactor: "",
      PiecesPerPack: "",
    }

    let isValid = true

    if (!editProduct.name.trim()) {
      newErrors.name = "Product name is required"
      isValid = false
    }

    if (!editProduct.category) {
      newErrors.category = "Category is required"
      isValid = false
    }

    if (!editProduct.basePrice || parseFloat(editProduct.basePrice) < 0) {
      newErrors.basePrice = "Valid base price is required"
      isValid = false
    }

    if (editProduct.profitType === "percentage") {
      if (!editProduct.profitValue || parseFloat(editProduct.profitValue) < 0) {
        newErrors.profitValue = "Valid profit percentage is required"
        isValid = false
      }
    } else {
      if (!editProduct.profitValue || parseFloat(editProduct.profitValue) < 0) {
        newErrors.profitValue = "Valid profit amount is required"
        isValid = false
      }
    }

    if (!editProduct.price || parseFloat(editProduct.price) <= 0) {
      newErrors.price = "Valid price is required"
      isValid = false
    }

    if (!editProduct.stock) {
      newErrors.stock = "Stock quantity is required"
      isValid = false
    } else {
      const stockValue = parseFloat(editProduct.stock)
      if (isNaN(stockValue)) {
        newErrors.stock = "Stock must be a valid number"
        isValid = false
      } else if (stockValue < 0) {
        newErrors.stock = "Stock cannot be negative"
        isValid = false
      }
    }

    if (!editProduct.sku.trim()) {
      newErrors.sku = "SKU is required"
      isValid = false
    }

    if (editProduct.expiryDate) {
      const expiryDate = new Date(editProduct.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        newErrors.expiryDate = "Invalid date format";
        isValid = false;
      }
    }

    setEditErrors(newErrors)
    return isValid
  }

  const handleUpdateProduct = async () => {
    if (!validateEditForm()) {
      return
    }

    setIsLoading(true);
    const productData = createProductPayload(editProduct, editProductImage);

    if (editProductImage) {
      productData.image = editProductImage
    }

    try {
      const response = await fetch(`/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      const data = await response.json();
      if (!data.product) {
        throw new Error('Invalid response from server: no product data received');
      }
      const updatedProductFromServer = data.product;


    // Map the API response (already in camelCase) to component state
    const formattedProduct = {
      ...updatedProductFromServer,
      id: updatedProductFromServer.id.toString(),
      name: updatedProductFromServer.name,
      price: Number(updatedProductFromServer.price) || 0,
      basePrice: Number(updatedProductFromServer.basePrice) || 0,
      profitType: updatedProductFromServer.profitType,
      profitValue: Number(updatedProductFromServer.profitValue) || 0,
      creditMarkupType: updatedProductFromServer.creditMarkupType,
      creditMarkupValue: Number(updatedProductFromServer.creditMarkupValue) || 0,
      stock: Number(updatedProductFromServer.stock) || 0,
      image: editProductImage || updatedProductFromServer.image,
      sku: updatedProductFromServer.sku,
      ConversionFactor: updatedProductFromServer.conversionFactor ?? null,
      ParentProductId: updatedProductFromServer.parentProductId ?? null,
      PiecesPerPack: updatedProductFromServer.piecesPerPack ?? null,
      piecePrice: updatedProductFromServer.piecePrice ? Number(updatedProductFromServer.piecePrice) : undefined,
      pieceUnitName: updatedProductFromServer.pieceUnitName || "",
      currentPiecesPerPack: updatedProductFromServer.currentPiecesPerPack ? Number(updatedProductFromServer.currentPiecesPerPack) : undefined,
    };


    const updatedProducts = products.map(product => {
      if (product.id === editProduct.id) {
        return formattedProduct;
      }
      return product
    })

      setProducts(updatedProducts)

      if (selectedProduct && selectedProduct.id === editProduct.id) {
        setSelectedProduct(formattedProduct);
      }

      toast({
        title: "Product Updated Successfully",
        description: `${editProduct.name} has been updated with the latest information.`,
        variant: "default",
      })

      setIsProductDetailModalOpen(false)
      setIsEditMode(false)

      checkForNearExpiryProducts(updatedProducts)

    } catch (error) {
      console.error('Error updating product:', error)
      toast({
        title: "Failed to Update Product",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateStockUpdate = (): boolean => {
    setStockUpdateError("")

    if (!updatedStock.trim()) {
      setStockUpdateError("Stock value is required")
      return false
    }

    const stockValue = parseFloat(updatedStock)
    if (isNaN(stockValue)) {
      setStockUpdateError("Stock must be a valid number")
      return false
    }

    if (stockValue < 0) {
      setStockUpdateError("Stock cannot be negative")
      return false
    }

    return true
  }

  const handleUpdateStock = async () => {
    if (!selectedProduct || !validateStockUpdate()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock: parseFloat(updatedStock),
          lastRestocked: new Date().toISOString(),
          expiryDate: selectedProduct.expiryDate
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock');
      }

      const updatedProducts = products.map(product =>
        product.id === selectedProduct.id.toString()
          ? { ...product, stock: parseFloat(updatedStock), lastRestocked: formatDate(new Date().toISOString()) || new Date().toLocaleDateString() }
          : product
      );
      setProducts(updatedProducts);

      toast({
        title: "Stock Updated Successfully",
        description: `${selectedProduct.name} stock has been updated to ${updatedStock} units.`,
      })

      setIsProductDetailModalOpen(false)
      checkForNearExpiryProducts(updatedProducts)

    } catch (error) {
      console.error('Error updating stock:', error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update stock. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConvertStock = async (product: Product) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/products/${product.id}/convert-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to convert stock');
      }

      const data = await response.json();

      // Update the products list with new stock levels
      const updatedProducts = products.map(p =>
        p.id === product.id.toString()
          ? {
              ...p,
              stock: data.product.stock,
              currentPiecesPerPack: data.product.currentPiecesPerPack
            }
          : p
      );
      setProducts(updatedProducts);

      toast({
        title: "Stock Converted Successfully",
        description: data.message,
      });

      // Refresh product data to show updated stock
      // fetchProducts(); // No need to fetch all products again, we updated the state

    } catch (error) {
      console.error('Error converting stock:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert stock. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }


  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as ProductsApiResponse;

        if (data.status === 'success') {
          // Correctly map PascalCase from DB to camelCase for component state
          const formattedProducts = data.products.map((p: any) => ({
            ...p, // Spread original properties first
            id: p.ProductId?.toString() || p.id.toString(),
            name: p.Name || p.name,
            price: Number(p.Price ?? p.price) || 0,
            basePrice: Number(p.BasePrice ?? p.basePrice) || 0,
            profitValue: Number(p.profitValue) || 0,
            stock: Number(p.StockQuantity ?? p.stock) || 0,
            sku: p.Sku || p.sku,
            category: p.Category || p.category,
            image: p.Image || p.image,
            description: p.Description || p.description,
            supplier: p.Supplier || p.supplier,
            isActive: p.IsActive !== undefined ? p.IsActive : (p.isActive !== undefined ? p.isActive : true),
            hasTransactions: p.hasTransactions,
            ConversionFactor: p.ConversionFactor ?? p.conversionFactor ?? null,
            ParentProductId: p.ParentProductId ?? p.parentProductId ?? null,
            PiecesPerPack: p.PiecesPerPack ?? p.piecesPerPack ?? null,
            piecePrice: p.PiecePrice ? parseFloat(p.PiecePrice) : (p.piecePrice ? Number(p.piecePrice) : undefined),
            pieceUnitName: p.PieceUnitName || p.pieceUnitName || undefined,
            currentPiecesPerPack: p.currentPiecesPerPack,
            // creditPenaltyType: p.creditPenaltyType || 'percentage','fixed'
          }));
          setProducts(formattedProducts)

          const uniqueCategories = ["all", ...Array.from(new Set(data.products.map((product: Product) => product.category)))];
          setCategories(uniqueCategories as string[]);

          if (showNotifications) {
            const lowStock = data.products.filter((product: Product) => product.stock < INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD).length
            const expiringSoon = data.products.filter((product: Product) => product.expiryDate && isExpiringSoon(product.expiryDate) && !isExpired(product.expiryDate)).length
            const expiredCount = data.products.filter((product: Product) => product.expiryDate && isExpired(product.expiryDate)).length;

            const messages: { message: string; type: 'lowStock' | 'expiringSoon' | 'expired' }[] = [];
            if (lowStock > 0) {
              messages.push({
                message: `${lowStock} product${lowStock > 1 ? 's are' : ' is'} running low on stock. Consider restocking soon.`,
                type: 'lowStock'
              });
            }
            if (expiringSoon > 0) {
              messages.push({
                message: `${expiringSoon} product${expiringSoon > 1 ? 's are' : ' is'} expiring within a month. Check details to take action.`,
                type: 'expiringSoon'
              });
            }
            if (expiredCount > 0) {
              messages.push({
                message: `${expiredCount} product${expiredCount > 1 ? 's have' : ' has'} expired. Please remove them from inventory.`,
                type: 'expired'
              });
            }
            setNotificationMessages(messages);
          }

          checkForNearExpiryProducts(data.products)

          if (showSummaryCards) {
            const totalValue = formattedProducts.reduce((sum: number, p: Product) => sum + p.price * p.stock, 0)
            const totalProfit = formattedProducts.reduce((sum: number, p: Product) => sum + (p.price - p.basePrice) * p.stock, 0)
            const totalStock = formattedProducts.reduce((sum: number, p: Product) => sum + p.stock, 0)
            setInventorySummary({
              totalValue,
              totalProfit,
              totalStock,
            })
          }
        } else {
          setError(data.message || 'Failed to fetch products')
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while loading products.');
        }
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [showNotifications, showSummaryCards])

  useEffect(() => {
    if (showNotifications && notificationMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentNotificationIndex(prevIndex => (prevIndex + 1) % notificationMessages.length);
      }, INVENTORY_CONSTANTS.NOTIFICATION_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [notificationMessages.length, showNotifications]);

  const handleNotificationClick = () => {
    if (notificationMessages.length > 0) {
      const currentFilterType = notificationMessages[currentNotificationIndex].type;
      setActiveNotificationFilter(currentFilterType);
      setSearchQuery("");
      setCategoryFilter("all");
      toast({
        title: "Filter Applied",
        description: `Showing ${currentFilterType === 'lowStock' ? 'low stock' : currentFilterType === 'expiringSoon' ? 'expiring soon' : 'expired'} products.`,
      });
    }
  };

  const filteredProducts = products.filter(p => view === 'active' ? p.isActive !== false : p.isActive === false)
    .filter((product) => {
      const productName = product.name || '';
      const productCategory = product.category || '';
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) || (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) || product.id.includes(searchQuery);

      const matchesCategory = categoryFilter === "all" || productCategory.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "name":
            const nameA = a.name || '';
          const nameB = b.name || '';
          comparison = nameA.localeCompare(nameB)
          break
        case "price":
          comparison = a.price - b.price
          break
        case "stock":
          comparison = a.stock - b.stock
          break
        case "status":
          const statusA = getStatusPriority(a);
          const statusB = getStatusPriority(b);
          comparison = statusA - statusB;
          break
        case "category":
          const categoryA = a.category || '';
          const categoryB = b.category || '';
          comparison = categoryA.localeCompare(categoryB)
          break
        default:
          comparison = 0
      }

      return sortOrder === "asc" ? comparison : -comparison
    })
    .filter((product) => {
      if (!activeNotificationFilter) return true;
      if (activeNotificationFilter === 'lowStock') {
        return product.stock < INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD;
      }
      if (activeNotificationFilter === 'expiringSoon') {
        return product.expiryDate && isExpiringSoon(product.expiryDate) && !isExpired(product.expiryDate);
      }
      if (activeNotificationFilter === 'expired') {
        return product.expiryDate && isExpired(product.expiryDate);
      }
      return true;
    });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setUpdatedStock(product.stock.toString())
    setStockUpdateError("")
    setIsProductDetailModalOpen(true)
  }

  const handleGenerateReport = (format: "csv" | "pdf") => {
    toast({
      title: "Generating Report...",
      description: `Your inventory report is being generated in ${format.toUpperCase()} format.`,
      variant: "default",
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewProduct({
      ...newProduct,
      [name]: value
    })

    if (name in errors) {
      setErrors({
        ...errors,
        [name]: ""
      })
    }
  }

  const handleStockInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedStock(e.target.value)
    setStockUpdateError("")
  }

  const handleCategoryChange = (value: string) => {
    setNewProduct({
      ...newProduct,
      category: value
    })

    setErrors({
      ...errors,
      category: ""
    })
  }

  const handleProfitChange = (type: string, value: string) => {
    const newProfitType = type || newProduct.profitType;
    const newProfitValue = value || newProduct.profitValue;

    const calculatedPrice = calculatePrice(newProduct.basePrice, newProfitType as "percentage" | "fixed", newProfitValue);

    setNewProduct({
      ...newProduct,
      profitType: newProfitType as "percentage" | "fixed",
      profitValue: newProfitValue,
      price: calculatedPrice.toFixed(2)
    });

    if (value) {
      setErrors({
        ...errors,
        profitValue: ""
      });
    }
  }

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const calculatedPrice = calculatePrice(value, newProduct.profitType as "percentage" | "fixed", newProduct.profitValue);

    setNewProduct({
      ...newProduct,
      basePrice: value,
      price: calculatedPrice.toFixed(2)
    });

    setErrors({
      ...errors,
      basePrice: ""
    });
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewProductImage(reader.result as string)

        setErrors({
          ...errors,
          image: ""
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setNewProduct({
      name: "",
      category: "",
      price: "",
      basePrice: "",
      profitType: "percentage",
      profitValue: "",
      creditMarkupType: "percentage",
      creditMarkupValue: "",
      creditDueDays: "",
      creditPenaltyType: "percentage",
      creditPenaltyValue: "",
      stock: "",
      supplier: "",
      description: "",
      sku: "",
      expiryDate: "",
      ParentProductId: null,
      ConversionFactor: null,
      piecePrice: "",
      pieceUnitName: "",
      PiecesPerPack: "",
    })
    setNewProductImage(null)
    setErrors({
      name: "",
      category: "",
      price: "",
      basePrice: "",
      profitValue: "",
      stock: "",
      creditMarkupType: "",
      creditMarkupValue: "",
      creditDueDays: "",
      creditPenaltyType: "",
      creditPenaltyValue: "",
      image: "",
      sku: "",
      expiryDate: "",
      ParentProductId: "",
      ConversionFactor: "",
      piecePrice: "",
      pieceUnitName: "",
      PiecesPerPack: "",
    });
  }

  const generateSKU = () => {
    if (!newProduct.sku.trim()) {
      const prefix = newProduct.category.substring(0, 3).toUpperCase() || "PRD";
      const timestamp = Date.now().toString().slice(-6);
      const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
      const sku = `${prefix}-${timestamp}-${randomChars}`;

      setNewProduct({
        ...newProduct,
        sku
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
      category: "",
      price: "",
      basePrice: "",
      profitValue: "",
      stock: "",
      creditMarkupType: "",
      creditMarkupValue: "",
      creditDueDays: "",
      creditPenaltyType: "",
      creditPenaltyValue: "",
      image: "",
      sku: "",
      expiryDate: "",
      ParentProductId: "",
      ConversionFactor: "",
      piecePrice: "",
      pieceUnitName: "",
      PiecesPerPack: "",
    }

    let isValid = true

    if (!newProduct.name.trim()) {
      newErrors.name = "Product name is required"
      isValid = false
    }

    if (!newProduct.category) {
      newErrors.category = "Category is required"
      isValid = false
    }

    if (!newProduct.basePrice || parseFloat(newProduct.basePrice) < 0) {
      newErrors.basePrice = "Valid base price is required"
      isValid = false
    }

    if (newProduct.profitType === "percentage") {
      if (!newProduct.profitValue || parseFloat(newProduct.profitValue) < 0) {
        newErrors.profitValue = "Valid profit percentage is required"
        isValid = false
      }
    } else {
      if (!newProduct.profitValue || parseFloat(newProduct.profitValue) < 0) {
        newErrors.profitValue = "Valid profit amount is required"
        isValid = false
      }
    }

    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      newErrors.price = "Valid price is required"
      isValid = false
    }

    if (!newProduct.stock) {
      newErrors.stock = "Stock quantity is required"
      isValid = false
    } else {
      const stockValue = parseFloat(newProduct.stock)
      if (isNaN(stockValue)) {
        newErrors.stock = "Stock must be a valid number"
        isValid = false
      } else if (stockValue < 0) {
        newErrors.stock = "Stock cannot be negative"
        isValid = false
      }
    }

    if (!newProduct.sku.trim()) {
      newErrors.sku = "SKU is required"
      isValid = false
      generateSKU();
    }

    if (newProduct.expiryDate) {
      const expiryDate = new Date(newProduct.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        newErrors.expiryDate = "Invalid date format";
        isValid = false;
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const handleAddProduct = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true);
    const productData = createProductPayload(newProduct, newProductImage);
    if (newProductImage) {
      productData.image = newProductImage
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add product');
      }

      const data = await response.json();

      const newProductFromServer = data.product;

      const updatedProducts = [...products, {
        ...newProductFromServer,
        image: newProductImage || newProductFromServer.image
      }];
      setProducts(updatedProducts)

      resetForm()
      setIsAddProductModalOpen(false)

      toast({
        title: "Product Added Successfully",
        description: `${newProduct.name} has been added to inventory with ${newProduct.stock} units.`,
        variant: "default",
      })

      checkForNearExpiryProducts(updatedProducts)

    } catch (error) {
      console.error('Error adding product:', error)
      toast({
        title: "Failed to Add Product",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600">Manage and track product inventory</p>
            </div>

            {userType === 'admin' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={() => setIsAddProductModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as 'active' | 'archived')} className="mb-4">
            <TabsList>
              <TabsTrigger value="active">
                Active Products
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived Products
              </TabsTrigger>
            </TabsList>
        </Tabs>

        {showSummaryCards && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₱{inventorySummary.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Estimated value of all products</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₱{inventorySummary.totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Estimated profit from current stock</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                    <Package2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{inventorySummary.totalStock.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total units of all products</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Reports</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport("csv")}><Download className="h-3 w-3 mr-2" /> Export as CSV</Button>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport("pdf")}><FileText className="h-3 w-3 mr-2" /> Export as PDF</Button>
                </CardContent>
                </Card>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products by name or barcode..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="expiryDate">Expiry Date</SelectItem>
                  <SelectItem value="updatedAt">Date Edited</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""} transition-transform`} />
              </Button>
            </div>
        </div>

        {activeNotificationFilter && (
            <div className="flex items-center justify-between bg-blue-100 text-blue-800 p-3 rounded-md mb-6">
              <p className="text-sm font-medium capitalize">
                Showing only <strong>{activeNotificationFilter.replace('Soon', ' Soon')}</strong> products.
              </p>
              <Button variant="ghost" size="sm" className="h-auto p-1 text-blue-800" onClick={() => setActiveNotificationFilter(null)}>
                Clear Filter
              </Button>
            </div>
        )}

        {showNotifications && notificationMessages.length > 0 && (
            <div className="px-4 pb-4">
              <div
                className={`relative h-10 w-full overflow-hidden rounded-md shadow-sm flex items-center px-4 cursor-pointer transition-colors ${
                  notificationMessages[currentNotificationIndex]?.type === 'expired' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}
                onClick={handleNotificationClick}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentNotificationIndex}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 1.5 }}
                    className="w-full flex items-center"
                  >
                    <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="text-sm font-medium">{notificationMessages[currentNotificationIndex].message}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  onClick={() => handleProductClick(product)}
                  className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col"
                >
                  <div className="relative w-full h-48">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover rounded-t-lg"
                    />
                    <Badge
                      variant={getProductStatus(product).color.includes('red') ? 'destructive' : getProductStatus(product).color.includes('amber') ? 'secondary' : 'default'}
                      className="absolute top-2 left-2"
                    >
                      {getProductStatus(product).label}
                    </Badge>

                    {product.stock < INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD && (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex-grow flex flex-col justify-between">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Price:</span> ₱{(product.price || 0).toFixed(2)}</p>
                        <p><span className="font-medium">Main Stock:</span> {product.stock}</p>
                        {product.currentPiecesPerPack !== null && product.currentPiecesPerPack !== undefined && (
                          <p><span className="font-medium">Micro Stock:</span> {product.currentPiecesPerPack}</p>
                        )}
                        {product.sku && <p><span className="font-medium">SKU:</span> {product.sku}</p>}

                        {product.expiryDate && (
                          <p className={`font-medium ${isExpired(product.expiryDate) ? 'text-red-600' : isExpiringSoon(product.expiryDate) ? 'text-yellow-600' : 'text-gray-600'}`}>
                            Expiry: {formatDate(product.expiryDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    {product.PiecesPerPack && product.PiecesPerPack > 0 && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertStock(product);
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert Stock
                        </Button>
                      </div>
                    )}
                    {userType === 'admin' && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            initializeEditForm(product);
                            setIsProductDetailModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleProductClick(product)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => initializeEditForm(product)}>
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (product.isActive !== false) {
                                  handleArchiveProduct(parseInt(product.id));
                                } else {
                                  handleActivateProduct(parseInt(product.id));
                                }
                              }}
                              className={product.isActive !== false ? "text-orange-600" : "text-green-600"}
                            >
                              {product.isActive !== false ? 'Archive Product' : 'Activate Product'}
                            </DropdownMenuItem>
                            {product.isActive === false && !product.hasTransactions && (
                              <DropdownMenuItem
                                onClick={() => handlePermanentDeleteProduct(parseInt(product.id))}
                                className="text-red-600"
                              >
                                Delete Permanently
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {activeNotificationFilter
                ? `No ${activeNotificationFilter.replace('Soon', ' soon')} products found.`
                : searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : view === 'active'
                ? "No active products in inventory."
                : "No archived products found."
              }
            </p>
          </div>
        )}

        {/* Product Detail Modal */}
        <Dialog open={isProductDetailModalOpen} onOpenChange={setIsProductDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Product' : 'Product Details'}</DialogTitle>
            </DialogHeader>
            {selectedProduct && !isEditMode && (
              <>
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="w-1/3">
                      <Image
                        src={selectedProduct.image || "/placeholder.svg"}
                        alt={selectedProduct.name}
                        width={300}
                        height={300}
                        className="w-full h-auto rounded-lg object-cover"
                      />
                    </div>
                    <div className="w-2/3 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                        <p className="text-gray-600">{selectedProduct.category}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Selling Price" value={`₱${selectedProduct.price.toFixed(2)}`} />
                        <DetailItem label="Base Price" value={`₱${selectedProduct.basePrice.toFixed(2)}`} />
                        <DetailItem label="Main Stock" value={selectedProduct.stock} />
                        {selectedProduct.currentPiecesPerPack !== null && selectedProduct.currentPiecesPerPack !== undefined && (
                          <DetailItem label="Micro Stock" value={selectedProduct.currentPiecesPerPack} />
                        )}
                        <DetailItem label="SKU" value={selectedProduct.sku} />
                        <DetailItem label="Status">
                            <Badge variant={getProductStatus(selectedProduct).color.includes('red') ? 'destructive' : getProductStatus(selectedProduct).color.includes('amber') ? 'secondary' : 'default'}>
                                {getProductStatus(selectedProduct).label}
                            </Badge>
                        </DetailItem>
                        <DetailItem label="Supplier" value={selectedProduct.supplier || 'N/A'} />
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Pricing Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <DetailItem label="Profit Type" value={selectedProduct.profitType} className="capitalize" />
                        <DetailItem label="Profit Value" value={`${selectedProduct.profitValue}${selectedProduct.profitType === 'percentage' ? '%' : ''}`} />
                        <DetailItem label="Calculated Profit" value={`₱${(selectedProduct.price - selectedProduct.basePrice).toFixed(2)}`} />
                        <DetailItem label="Credit Markup Type" value={selectedProduct.creditMarkupType ? selectedProduct.creditMarkupType : 'N/A'} className="capitalize" />
                        <DetailItem label="Credit Markup Value" value={selectedProduct.creditMarkupValue ? `${selectedProduct.creditMarkupValue}${selectedProduct.creditMarkupType === 'percentage' ? '%' : ''}` : 'N/A'} />
                    </div>
                  </div>

                  {(selectedProduct.piecePrice || selectedProduct.PiecesPerPack || selectedProduct.ConversionFactor) && (
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">Unit Conversion</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <DetailItem label="Piece Price" value={selectedProduct.piecePrice ? `₱${selectedProduct.piecePrice.toFixed(2)}` : 'N/A'} />
                            <DetailItem label="Piece Unit Name" value={selectedProduct.pieceUnitName || 'N/A'} />
                            <DetailItem label="Pieces Per Pack" value={selectedProduct.PiecesPerPack || 'N/A'} />
                            <DetailItem label="Conversion Factor" value={selectedProduct.ConversionFactor || 'N/A'} />
                        </div>
                    </div>
                  )}


                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">Date Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedProduct.expiryDate && (
                            <DetailItem label="Expiry Date">
                                <p className={`font-semibold ${isExpired(selectedProduct.expiryDate) ? 'text-red-600' : isExpiringSoon(selectedProduct.expiryDate) ? 'text-yellow-600' : 'text-gray-900'}`}>
                                    {formatDate(selectedProduct.expiryDate)}
                                </p>
                            </DetailItem>
                        )}
                        <DetailItem label="Last Restocked" value={formatDate(selectedProduct.lastRestocked) || 'N/A'} />
                        <DetailItem label="Last Edited" value={formatDate(selectedProduct.updatedAt) || 'N/A'} />
                    </div>
                  </div>

                  {selectedProduct.expiryDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Expiry Date</p>
                      <p className={`text-lg font-semibold ${isExpired(selectedProduct.expiryDate) ? 'text-red-600' : isExpiringSoon(selectedProduct.expiryDate) ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {formatDate(selectedProduct.expiryDate)}
                      </p>
                    </div>
                  )}
                  {selectedProduct.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setUpdatedStock(selectedProduct.stock.toString())}>
                    Update Stock
                  </Button>
                  {userType === 'admin' && (
                    <>
                      <Button variant="outline" onClick={() => initializeEditForm(selectedProduct)}>
                        Edit Product
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (selectedProduct.isActive !== false) {
                            handleArchiveProduct(parseInt(selectedProduct.id));
                          } else {
                            handleActivateProduct(parseInt(selectedProduct.id));
                          }
                        }}
                      >
                        {selectedProduct.isActive !== false ? 'Archive Product' : 'Activate Product'}
                      </Button>
                      {selectedProduct.isActive === false && !selectedProduct.hasTransactions && (
                        <Button
                          variant="destructive"
                          onClick={() => handlePermanentDeleteProduct(parseInt(selectedProduct.id))}
                        >
                          Delete Permanently
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            {isEditMode && selectedProduct && (
              // ... existing edit mode JSX
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Product Name</Label>
                      <Input
                        id="edit-name"
                        name="name"
                        value={editProduct.name}
                        onChange={handleEditInputChange}
                        className={editErrors.name ? "border-red-500" : ""}
                      />
                      {editErrors.name && <p className="text-red-500 text-sm">{editErrors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Select value={editProduct.category} onValueChange={handleEditCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category === "all" ? "All Categories" : category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editErrors.category && <p className="text-red-500 text-sm">{editErrors.category}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-sku">SKU</Label>
                      <Input
                        id="edit-sku"
                        name="sku"
                        value={editProduct.sku}
                        onChange={handleEditInputChange}
                        className={editErrors.sku ? "border-red-500" : ""}
                      />
                      {editErrors.sku && <p className="text-red-500 text-sm">{editErrors.sku}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <textarea
                        id="edit-description"
                        name="description"
                        value={editProduct.description}
                        onChange={handleEditInputChange}
                        className="w-full p-2 border rounded-md"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Product Image</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Image
                          src={editProductImage || selectedProduct.image || "/placeholder.svg"}
                          alt="Product image"
                          width={100}
                          height={100}
                          className="rounded-md object-cover"
                        />
                        <div className="flex-grow">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => editFileInputRef.current?.click()}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Change Image
                          </Button>
                          <Input
                            id="edit-image"
                            type="file"
                            accept="image/*"
                            ref={editFileInputRef}
                            onChange={handleEditImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                      {editErrors.image && <p className="text-red-500 text-sm mt-2">{editErrors.image}</p>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-basePrice">Base Price</Label>
                      <Input
                        id="edit-basePrice"
                        name="basePrice"
                        type="number"
                        step="0.01"
                        value={editProduct.basePrice}
                        onChange={handleEditBasePriceChange}
                        className={editErrors.basePrice ? "border-red-500" : ""}
                      />
                      {editErrors.basePrice && <p className="text-red-500 text-sm">{editErrors.basePrice}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-profitType">Profit Type</Label>
                      <Select value={editProduct.profitType} onValueChange={(value) => handleEditProfitChange(value, editProduct.profitValue)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-profitValue">Profit Value</Label>
                      <Input
                        id="edit-profitValue"
                        name="profitValue"
                        type="number"
                        step="0.01"
                        value={editProduct.profitValue}
                        onChange={(e) => handleEditProfitChange(editProduct.profitType, e.target.value)}
                        className={editErrors.profitValue ? "border-red-500" : ""}
                      />
                      {editErrors.profitValue && <p className="text-red-500 text-sm">{editErrors.profitValue}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-price">Selling Price</Label>
                      <Input
                        id="edit-price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={editProduct.price}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-stock">Stock Quantity</Label>
                      <Input
                        id="edit-stock"
                        name="stock"
                        type="number"
                        value={editProduct.stock}
                        onChange={handleEditInputChange}
                        className={editErrors.stock ? "border-red-500" : ""}
                      />
                      {editErrors.stock && <p className="text-red-500 text-sm">{editErrors.stock}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-expiryDate">Expiry Date</Label>
                      <Input
                        id="edit-expiryDate"
                        name="expiryDate"
                        type="date"
                        value={editProduct.expiryDate}
                        onChange={handleEditInputChange}
                        className={editErrors.expiryDate ? "border-red-500" : ""}
                      />
                      {editErrors.expiryDate && <p className="text-red-500 text-sm">{editErrors.expiryDate}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-creditMarkupType">Credit Markup Type</Label>
                      <Select value={editProduct.creditMarkupType} onValueChange={(value) => setEditProduct({ ...editProduct, creditMarkupType: value as "percentage" | "fixed" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-creditMarkupValue">Credit Markup Value</Label>
                      <Input
                        id="edit-creditMarkupValue"
                        name="creditMarkupValue"
                        type="number"
                        step="0.01"
                        value={editProduct.creditMarkupValue}
                        onChange={handleEditInputChange}
                        className={editErrors.creditMarkupValue ? "border-red-500" : ""}
                        placeholder="e.g., 10.00"
                      />
                      {editErrors.creditMarkupValue && <p className="text-red-500 text-sm">{editErrors.creditMarkupValue}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-creditDueDays">Credit Due Days</Label>
                      <Input
                        id="edit-creditDueDays"
                        name="creditDueDays"
                        type="number"
                        value={editProduct.creditDueDays}
                        onChange={handleEditInputChange}
                        className={editErrors.creditDueDays ? "border-red-500" : ""}
                        placeholder="e.g., 30"
                      />
                      {editErrors.creditDueDays && <p className="text-red-500 text-sm">{editErrors.creditDueDays}</p>}
                    </div>
                    <div>
                      <Label htmlFor="edit-creditPenaltyType">Credit Penalty Type</Label>
                      <Select value={editProduct.creditPenaltyType} onValueChange={(value) => setEditProduct({ ...editProduct, creditPenaltyType: value as "percentage" | "fixed" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-creditPenaltyValue">Credit Penalty Value</Label>
                      <Input
                        id="edit-creditPenaltyValue"
                        name="creditPenaltyValue"
                        type="number"
                        step="0.01"
                        value={editProduct.creditPenaltyValue}
                        onChange={handleEditInputChange}
                        className={editErrors.creditPenaltyValue ? "border-red-500" : ""}
                        placeholder="e.g., 5.00"
                      />
                      {editErrors.creditPenaltyValue && <p className="text-red-500 text-sm">{editErrors.creditPenaltyValue}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct}>
                    Update Product
                  </Button>
                </div>
                <Collapsible className="border-t pt-4">
                  <CollapsibleTrigger className="flex justify-between items-center w-full">
                    <h3 className="text-lg font-semibold">Unit Conversion (Optional)</h3>
                    <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <Label htmlFor="edit-piecePrice">Piece Price</Label>
                        <Input
                          id="edit-piecePrice"
                          name="piecePrice"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 10.00"
                          value={editProduct.piecePrice}
                          onChange={handleEditInputChange}
                          className={editErrors.piecePrice ? "border-red-500" : ""}
                        />
                        {editErrors.piecePrice && <p className="text-red-500 text-sm">{editErrors.piecePrice}</p>}
                      </div>
                      <div>
                        <Label htmlFor="edit-pieceUnitName">Piece Unit Name</Label>
                        <Input
                          id="edit-pieceUnitName"
                          name="pieceUnitName"
                          placeholder="e.g., sachet, piece"
                          value={editProduct.pieceUnitName}
                          onChange={handleEditInputChange}
                          className={editErrors.pieceUnitName ? "border-red-500" : ""}
                        />
                        {editErrors.pieceUnitName && <p className="text-red-500 text-sm">{editErrors.pieceUnitName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="edit-piecesPerPack">Pieces Per Pack</Label>
                        <Input
                          id="edit-piecesPerPack"
                          name="PiecesPerPack"
                          type="number"
                          placeholder="e.g., 12"
                          value={editProduct.PiecesPerPack}
                          onChange={handleEditInputChange}
                          className={editErrors.PiecesPerPack ? "border-red-500" : ""}
                        />
                        {editErrors.PiecesPerPack && <p className="text-red-500 text-sm">{editErrors.PiecesPerPack}</p>}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Product Modal */}
        <Dialog open={isAddProductModalOpen} onOpenChange={setIsAddProductModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newProduct.name}
                      onChange={handleInputChange}
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Popover open={isCategoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isCategoryPopoverOpen} className="w-full justify-between">
                          {newProduct.category || "Select category..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search or create category..." onValueChange={handleCategoryChange} value={newProduct.category} />
                          <CommandList>
                            <CommandEmpty>No category found. Type to create.</CommandEmpty>
                            <CommandGroup>
                              {categories.filter(c => c !== 'all').map((category) => (
                                <CommandItem
                                  key={category}
                                  value={category}
                                  onSelect={(currentValue: string) => {
                                    handleCategoryChange(currentValue === newProduct.category ? "" : currentValue);
                                    setCategoryPopoverOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${newProduct.category === category ? "opacity-100" : "opacity-0"}`} />
                                  {category}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sku"
                        name="sku"
                        value={newProduct.sku}
                        onChange={handleInputChange}
                        className={errors.sku ? "border-red-500" : ""}
                      />
                      <Button type="button" variant="outline" onClick={generateSKU}>
                        Generate
                      </Button>
                    </div>
                    {errors.sku && <p className="text-red-500 text-sm">{errors.sku}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      name="description"
                      value={newProduct.description}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      name="supplier"
                      value={newProduct.supplier}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price</Label>
                    <Input
                      id="basePrice"
                      name="basePrice"
                      type="number"
                      step="0.01"
                      value={newProduct.basePrice}
                      onChange={handleBasePriceChange}
                      className={errors.basePrice ? "border-red-500" : ""}
                    />
                    {errors.basePrice && <p className="text-red-500 text-sm">{errors.basePrice}</p>}
                  </div>
                  <div>
                    <Label htmlFor="profitType">Profit Type</Label>
                    <Select value={newProduct.profitType} onValueChange={(value) => handleProfitChange(value, newProduct.profitValue)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="profitValue">Profit Value</Label>
                    <Input
                      id="profitValue"
                      name="profitValue"
                      type="number"
                      step="0.01"
                      value={newProduct.profitValue}
                      onChange={(e) => handleProfitChange(newProduct.profitType, e.target.value)}
                      className={errors.profitValue ? "border-red-500" : ""}
                    />
                    {errors.profitValue && <p className="text-red-500 text-sm">{errors.profitValue}</p>}
                  </div>
                  <div>
                    <Label htmlFor="price">Selling Price</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={handleInputChange}
                      className={errors.stock ? "border-red-500" : ""}
                    />
                    {errors.stock && <p className="text-red-500 text-sm">{errors.stock}</p>}
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      value={newProduct.expiryDate}
                      onChange={handleInputChange}
                      className={errors.expiryDate ? "border-red-500" : ""}
                    />
                    {errors.expiryDate && <p className="text-red-500 text-sm">{errors.expiryDate}</p>}
                  </div>
                  <div>
                    <Label htmlFor="image">Product Image</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {newProductImage && (
                        <Image
                          src={newProductImage || "/placeholder.svg"}
                          alt={newProduct.name || "Product preview"}
                          width={100}
                          height={100}
                          className="rounded-md object-cover"
                        />
                      )}
                      <div className="flex-grow">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addFileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Select Image
                        </Button>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          ref={addFileInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                    {errors.image && <p className="text-red-500 text-sm mt-2">{errors.image}</p>}
                  </div>
                </div>
              </div>

              <Collapsible className="border-t pt-4">
                <CollapsibleTrigger className="flex justify-between items-center w-full">
                  <h3 className="text-lg font-semibold">Unit Conversion (Optional)</h3>
                  <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="piecePrice">Piece Price</Label>
                      <Input
                        id="piecePrice"
                        name="piecePrice"
                        type="number"
                        step="0.01"
                        placeholder="e.g., 10.00"
                        value={newProduct.piecePrice}
                        onChange={handleInputChange}
                        className={errors.piecePrice ? "border-red-500" : ""}
                      />
                      {errors.piecePrice && <p className="text-red-500 text-sm">{errors.piecePrice}</p>}
                    </div>
                    <div>
                      <Label htmlFor="pieceUnitName">Piece Unit Name</Label>
                      <Input
                        id="pieceUnitName"
                        name="pieceUnitName"
                        placeholder="e.g., sachet, piece"
                        value={newProduct.pieceUnitName}
                        onChange={handleInputChange}
                        className={errors.pieceUnitName ? "border-red-500" : ""}
                      />
                      {errors.pieceUnitName && <p className="text-red-500 text-sm">{errors.pieceUnitName}</p>}
                    </div>
                    <div>
                      <Label htmlFor="piecesPerPack">Pieces Per Pack</Label>
                      <Input
                        id="piecesPerPack"
                        name="PiecesPerPack"
                        type="number"
                        placeholder="e.g., 12"
                        value={newProduct.PiecesPerPack}
                        onChange={handleInputChange}
                        className={errors.PiecesPerPack ? "border-red-500" : ""}
                      />
                      {errors.PiecesPerPack && <p className="text-red-500 text-sm">{errors.PiecesPerPack}</p>}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setIsAddProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct}>
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
  );
}

// Helper component for displaying details
const DetailItem = ({ label, value, children, className }: { label: string; value?: string | number; children?: React.ReactNode; className?: string }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {children ? <div className={className}>{children}</div> : <p className={cn("text-lg font-semibold", className)}>{value}</p>}
    </div>
);

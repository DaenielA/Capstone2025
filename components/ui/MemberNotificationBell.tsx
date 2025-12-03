import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShoppingBag, CreditCard, Receipt, Calendar, DollarSign, BadgeAlert, Wallet } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { io, Socket } from 'socket.io-client';
// MemberProfileData is no longer needed as notifications will be fetched from Socket.IO
// import { MemberProfileData } from '@/app/members/actions';

interface MemberNotification {
  id: string;
  type: 'purchase' | 'credit_limit_update' | 'credit_payment' | 'low_stock' | 'expiry_warning' | 'credit_penalty_impending';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
  resolved?: boolean;
}

interface MemberNotificationBellProps {
  // memberData prop is no longer needed
}

export function MemberNotificationBell({}: MemberNotificationBellProps) {
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Establish Socket.IO connection
    // Ensure the connection URL points to your Next.js API route that initializes Socket.IO
    socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/api/socket/io', // Adjust this path if your socket.io endpoint is different
      addTrailingSlash: false,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO server from MemberNotificationBell');
    });

    socketRef.current.on('notifications', (initialNotifications: MemberNotification[]) => {
      // Convert timestamp strings to Date objects
      const processedNotifications = initialNotifications.map(n => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
      setNotifications(processedNotifications);
      setUnreadCount(processedNotifications.filter(n => !n.read).length);
    });

    socketRef.current.on('new_notification', (newNotification: MemberNotification) => {
      // Convert timestamp string to Date object
      const processedNotification = {
        ...newNotification,
        timestamp: new Date(newNotification.timestamp),
      };
      setNotifications(prev => {
        const updatedNotifications = [processedNotification, ...prev];
        return updatedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
      setUnreadCount(prev => prev + 1);
    });

    socketRef.current.on('notification_updated', (updatedNotification: MemberNotification) => {
      // Convert timestamp string to Date object
      const processedNotification = {
        ...updatedNotification,
        timestamp: new Date(updatedNotification.timestamp),
      };
      setNotifications(prev => {
        const updatedList = prev.map(n =>
          n.id === processedNotification.id ? processedNotification : n
        );
        return updatedList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
      // Recalculate unread count based on updated list
      setUnreadCount(notifications.filter(n => !n.read).length);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server from MemberNotificationBell');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    // Update unread count whenever notifications change
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);
  
  // Mark notification as read
  const markAsRead = (id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('mark_read', id);
    }
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        markAsRead(n.id);
      }
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingBag className="h-4 w-4 text-green-600" />;
      case 'credit_limit_update':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'credit_payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'low_stock':
        return <BadgeAlert className="h-4 w-4 text-red-600" />;
      case 'expiry_warning':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'credit_penalty_impending':
        return <Wallet className="h-4 w-4 text-red-600" />; // Wallet icon for penalty warning
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };
  
  // Format time ago
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    return formatDate(timestamp);
  };
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') {
      return !notification.read;
    }
    return true; // 'all' tab shows everything
  });
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-medium">My Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="unread" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}>
          <div className="border-b">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="unread" className="rounded-none">
                Unread {unreadCount > 0 && <Badge className="ml-1 bg-amber-500">{unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-none">All</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>No unread notifications</p>
                </div>
              ) : (
                <div>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      markAsRead={markAsRead}
                      formatTimeAgo={formatTimeAgo}
                      getNotificationIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      markAsRead={markAsRead}
                      formatTimeAgo={formatTimeAgo}
                      getNotificationIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Notification Item Component
function NotificationItem({ 
  notification, 
  markAsRead, 
  formatTimeAgo, 
  getNotificationIcon
}: { 
  notification: MemberNotification,
  markAsRead: (id: string) => void,
  formatTimeAgo: (date: Date) => string,
  getNotificationIcon: (type: string) => React.ReactNode
}) {
  
  // Handle click on notification
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };
  
  // Get background color based on notification type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-50';
      case 'credit_limit_update': return 'bg-blue-50';
      case 'credit_payment': return 'bg-green-50';
      case 'low_stock': return 'bg-red-50';
      case 'expiry_warning': return 'bg-orange-50';
      case 'credit_penalty_impending': return 'bg-red-50'; // Red background for penalty warning
      default: return 'bg-gray-50';
    }
  };
  
  // Get indicator color based on notification type
  const getIndicatorColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-500';
      case 'credit_limit_update': return 'bg-blue-500';
      case 'credit_payment': return 'bg-green-500';
      case 'low_stock': return 'bg-red-500';
      case 'expiry_warning': return 'bg-orange-500';
      case 'credit_penalty_impending': return 'bg-red-500'; // Red indicator for penalty warning
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div 
      className={`border-b last:border-0 ${notification.read ? 'opacity-80' : 'bg-amber-50/30'}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
        <div className={`mt-0.5 h-9 w-9 rounded-full ${getTypeColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{notification.title}</p>
            {!notification.read && (
              <div className={`h-2 w-2 rounded-full ${getIndicatorColor(notification.type)}`}></div>
            )}
          </div>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <p className="text-xs text-gray-400">{formatTimeAgo(notification.timestamp)}</p>
        </div>
      </div>
    </div>
  );
}
 
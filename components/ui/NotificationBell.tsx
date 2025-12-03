import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Notification } from '@/lib/notifications';
import { io, Socket } from 'socket.io-client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unresolved'>('unresolved');

  // Initialize socket connection
  useEffect(() => {
    const socketInit = async () => {
      try {
        // Initialize the socket connection
        await fetch('/api/notifications/socket');
        
        // Connect to the socket
        const socketConnection = io();
        setSocket(socketConnection);
        
        // Set up event listeners
        socketConnection.on('connect', () => {
          console.log('Connected to notification socket');
        });
        
        socketConnection.on('notifications', (data: Notification[]) => {
          // Ensure we have no duplicates by using a Map with ID as key
          const uniqueNotifications = new Map<string, Notification>();
          data.forEach(notification => {
            uniqueNotifications.set(notification.id, notification);
          });
          
          setNotifications(Array.from(uniqueNotifications.values()));
          setUnreadCount(Array.from(uniqueNotifications.values()).filter(n => !n.read).length);
        });
        
        socketConnection.on('new_notification', (notification: Notification) => {
          setNotifications(prev => {
            const exists = prev.some(n => n.id === notification.id);
            if (exists) {
              // Update existing notification without changing count
              return prev.map(n => n.id === notification.id ? notification : n);
            } else {
              // Add new notification and increment unread count
              setUnreadCount(count => count + 1);
              return [notification, ...prev];
            }
          });
        });
        
        socketConnection.on('notification_updated', (notification: Notification) => {
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? notification : n)
          );
          setUnreadCount(prev => 
            notification.read ? Math.max(0, prev - 1) : prev
          );
        });
        
        socketConnection.on('disconnect', () => {
          console.log('Disconnected from notification socket');
        });
        
        // Cleanup on unmount
        return () => {
          socketConnection.disconnect();
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };
    
    socketInit();
    
    // Fetch initial notifications
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Ensure we have no duplicates by using a Map with ID as key
          const uniqueNotifications = new Map<string, Notification>();
          data.notifications.forEach((notification: Notification) => {
            uniqueNotifications.set(notification.id, notification);
          });
          
          setNotifications(Array.from(uniqueNotifications.values()));
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(err => console.error('Error fetching notifications:', err));
    
  }, []);
  
  // Mark notification as read
  const markAsRead = (id: string) => {
    if (!socket) return;
    
    socket.emit('mark_read', id);
    
    // Also update via API for persistence
    fetch(`/api/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true })
    }).catch(err => console.error('Error marking notification as read:', err));
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
    });
  };
  
  // Format notification timestamp
  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '🛒';
      case 'credit_limit_update':
        return '💳';
      case 'credit_payment':
        return '💰';
      case 'low_stock':
        return '⚠️';
      case 'expiry_warning':
        return '⏰';
      default:
        return '📣';
    }
  };
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unresolved') {
      return notification.resolved !== true;
    }
    return true; // 'all' tab shows everything
  });
  
  // Count unresolved notifications
  const unresolvedCount = notifications.filter(n => !n.resolved).length;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-medium">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="unresolved" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unresolved')}>
          <div className="border-b">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="unresolved" className="rounded-none">
                Unresolved {unresolvedCount > 0 && <Badge className="ml-1">{unresolvedCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-none">All</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="unresolved" className="m-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No unresolved notifications
                </div>
              ) : (
                <div>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      markAsRead={markAsRead}
                      formatTime={formatTime}
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
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      markAsRead={markAsRead}
                      formatTime={formatTime}
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

// Extracted NotificationItem component for better readability
function NotificationItem({ 
  notification, 
  markAsRead, 
  formatTime, 
  getNotificationIcon 
}: { 
  notification: Notification, 
  markAsRead: (id: string) => void,
  formatTime: (date: Date) => string,
  getNotificationIcon: (type: string) => string
}) {
  // Add function to mark notification as resolved
  const markAsResolved = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    fetch(`/api/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notification.id, resolved: true })
    }).catch(err => console.error('Error marking notification as resolved:', err));
  };
  
  return (
    <div 
      className={`
        p-4 border-b last:border-0 cursor-pointer
        ${!notification.read ? 'bg-muted/30' : ''}
        ${notification.resolved ? 'opacity-80' : ''}
      `}
      onClick={() => !notification.read && markAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className="text-2xl">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <p className="font-medium">{notification.title}</p>
            <div className="flex gap-1">
              {!notification.read && (
                <Badge variant="secondary" className="ml-2">New</Badge>
              )}
              {notification.resolved ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Resolved
                </Badge>
              ) : (
                <button 
                  onClick={markAsResolved}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatTime(notification.timestamp)}
            </p>
            {!notification.resolved && notification.type.includes('stock') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/pos/inventory';
                }}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Go to Inventory
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
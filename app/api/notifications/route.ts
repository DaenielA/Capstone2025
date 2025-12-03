import { NextRequest, NextResponse } from 'next/server';
import { GetAllNotifications, GetUnreadCount, MarkNotificationAsRead, MarkNotificationAsResolved } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const unresolvedOnly = searchParams.get('unresolved') === 'true';
    
    const notifications = GetAllNotifications();
    
    let filteredNotifications = notifications;
    
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }
    
    if (unresolvedOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.resolved);
    }
    
    return NextResponse.json({
      success: true,
      notifications: filteredNotifications,
      unreadCount: GetUnreadCount(),
      unresolvedCount: notifications.filter(n => !n.resolved).length
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({
      success: false,
      message: `Error fetching notifications: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        message: 'Notification ID is required'
      }, { status: 400 });
    }
    
    // Handle marking as read
    if (body.read !== undefined) {
      const result = MarkNotificationAsRead(body.id);
      if (!result) {
        return NextResponse.json({
          success: false,
          message: 'Notification not found'
        }, { status: 404 });
      }
    }
    
    // Handle marking as resolved
    if (body.resolved !== undefined) {
      const result = MarkNotificationAsResolved(body.id, body.resolved);
      if (!result) {
        return NextResponse.json({
          success: false,
          message: 'Notification not found'
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notification updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({
      success: false,
      message: `Error updating notification: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 
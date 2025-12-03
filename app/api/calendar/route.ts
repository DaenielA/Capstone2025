import { NextResponse } from 'next/server';
import { z } from 'zod';

// Event type definition
export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  type: 'Operation' | 'Community' | 'Management';
  createdBy?: string;
}

// Validation schema
const timeRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
});

import { db } from '@/db/connection';
import { Events } from '@/db/schema';
import { and, gte, lte } from 'drizzle-orm';

// ... (keep the CalendarEvent type and timeRangeSchema)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate parameters
    const validParams = timeRangeSchema.safeParse({
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
    });

    if (!validParams.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validParams.error },
        { status: 400 }
      );
    }

    const params = validParams.data;
    
    let whereClause;
    
    if (params.start && params.end) {
      const startDate = new Date(params.start);
      const endDate = new Date(params.end);
      whereClause = and(
        gte(Events.EventDate, startDate),
        lte(Events.EventDate, endDate)
      );
    } else if (params.month !== undefined && params.year !== undefined) {
      // Month is 0-indexed in JavaScript Date
      const startOfMonth = new Date(params.year, params.month, 1);
      const endOfMonth = new Date(params.year, params.month + 1, 0, 23, 59, 59, 999);
      whereClause = and(
        gte(Events.EventDate, startOfMonth),
        lte(Events.EventDate, endOfMonth)
      );
    }

    const dbEvents = await db.select().from(Events).where(whereClause);

    const formattedEvents: CalendarEvent[] = dbEvents.map(event => ({
        id: event.EventId.toString(),
        title: event.Title,
        description: event.Description || '',
        startDate: event.EventDate.toISOString(),
        endDate: event.EventDate.toISOString(), // Adjust if you have end dates
        allDay: true, // Assuming all-day events for now
        location: event.Location || undefined,
        type: event.Type as CalendarEvent['type'],
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Basic validation, you can use Zod for more complex validation
    if (!body.title || !body.startDate || !body.endDate || !body.type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent = await db.insert(Events).values({
      Title: body.title,
      Description: body.description,
      EventDate: new Date(body.startDate),
      Location: body.location,
      Type: body.type,
      // CreatedBy: 'current_user_id', // You would get this from the session
    }).returning();

    return NextResponse.json(
      { message: 'Event created successfully', event: newEvent[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
} 
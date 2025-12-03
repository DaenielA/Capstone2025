import { expect } from 'chai';
import { db } from '../db';
import { Events } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('Calendar API', () => {

  let createdEventId: number;

  it('should create a new event and save it to the database', async () => {
    const eventData = {
      title: 'Test Event',
      description: 'This is a test event.',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: false,
      location: 'Test Location',
      type: 'meeting' as const,
    };

    const response = await fetch('http://localhost:3000/api/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const responseData = await response.json();

    expect(response.status).to.equal(201);
    expect(responseData.message).to.equal('Event created successfully');
    expect(responseData.event).to.not.be.undefined;
    expect(responseData.event.Title).to.equal(eventData.title);

    createdEventId = responseData.event.EventId;

    // Verify the event was created in the database
    const newEvent = await db.select().from(Events).where(eq(Events.EventId, createdEventId));
    expect(newEvent).to.have.lengthOf(1);
    expect(newEvent[0].Title).to.equal(eventData.title);
  });

  it('should fetch events for a given month', async () => {
    // Create a test event first
    const testEvent = {
        Title: 'Fetch Test Event',
        Description: 'This is a test event for fetching.',
        EventDate: new Date(),
        Location: 'Test Location',
        Type: 'Community' as const,
    };
    const insertedEvent = await db.insert(Events).values(testEvent).returning();
    const eventId = insertedEvent[0].EventId;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const response = await fetch(`http://localhost:3000/api/calendar?month=${month}&year=${year}`);
    const events = await response.json();

    expect(response.status).to.equal(200);
    expect(events).to.be.an('array');
    
    const foundEvent = events.find((e: any) => e.id === eventId.toString());
    expect(foundEvent).to.not.be.undefined;
    expect(foundEvent.title).to.equal(testEvent.Title);

    // Clean up the created event
    await db.delete(Events).where(eq(Events.EventId, eventId));
  });

  after(async () => {
    // Clean up the event created in the first test
    if (createdEventId) {
      await db.delete(Events).where(eq(Events.EventId, createdEventId));
    }
  });
});

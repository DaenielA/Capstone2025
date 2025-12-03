import { db } from './connection';
import { Events, MemberActivities, Members, Transactions } from './schema';

/**
 * Seed the database with events and member activities
 */
async function seedEventsAndActivities() {
  try {
    console.log('Starting events and activities seed...');
    
    // Check if we already have events
    const existingEvents = await db.select().from(Events);
    if (existingEvents.length > 0) {
      console.log('Events table already has data. Skipping events seed.');
    } else {
      // Seed upcoming events
      console.log('Seeding events...');
      const now = new Date();
      const events = await db.insert(Events).values([
        {
          Title: "Inventory Restocking",
          Description: "Regular inventory restocking of all products",
          EventDate: new Date(now.getFullYear(), now.getMonth() + 1, 15), // Next month, day 15
          Type: "Operation"
        },
        {
          Title: "Financial Literacy Workshop",
          Description: "Workshop to help members understand financial management",
          EventDate: new Date(now.getFullYear(), now.getMonth() + 1, 20), // Next month, day 20
          Type: "Community"
        },
        {
          Title: "Monthly Financial Review",
          Description: "Regular monthly financial review meeting",
          EventDate: new Date(now.getFullYear(), now.getMonth() + 1, 30), // Next month, day 30
          Type: "Management"
        },
        {
          Title: "Member Assembly",
          Description: "Annual general assembly for all cooperative members",
          EventDate: new Date(now.getFullYear(), now.getMonth() + 2, 5), // Two months from now, day 5
          Type: "Community"
        }
      ]).returning();
      console.log(`Seeded ${events.length} events`);
    }

    // Check if we already have member activities
    const existingActivities = await db.select().from(MemberActivities);
    if (existingActivities.length > 0) {
      console.log('MemberActivities table already has data. Skipping activities seed.');
    } else {
      // Get the first two members from the database
      const members = await db.select().from(Members).limit(2);
      if (members.length < 2) {
        console.log('Not enough members in the database to seed activities. Skipping activities seed.');
        return;
      }

      // Get a few transactions to link activities to
      const transactions = await db.select().from(Transactions).limit(2);
      
      // Seed member activities
      console.log('Seeding member activities...');
      const memberActivities = await db.insert(MemberActivities).values([
        {
          MemberId: members[0].MemberId,
          Action: "Made a purchase",
          Amount: "1250.00",
          Timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
          RelatedTransactionId: transactions.length > 0 ? transactions[0].TransactionId : undefined
        },
        {
          MemberId: members[1].MemberId,
          Action: "Paid credit balance",
          Amount: "500.00",
          Timestamp: new Date(Date.now() - 3600000 * 5) // 5 hours ago
        },
        {
          MemberId: members[0].MemberId,
          Action: "Updated profile information",
          Timestamp: new Date(Date.now() - 86400000) // Yesterday
        },
        {
          MemberId: members[1].MemberId,
          Action: "Made a purchase",
          Amount: "450.25",
          Timestamp: new Date(Date.now() - 86400000) // Yesterday
        },
        {
          MemberId: members[0].MemberId,
          Action: "Requested credit increase",
          Timestamp: new Date(Date.now() - 86400000 * 2) // 2 days ago
        }
      ]).returning();
      console.log(`Seeded ${memberActivities.length} member activities`);
    }
    
    console.log('Events and activities seed completed successfully!');
  } catch (error) {
    console.error('Error seeding events and activities:', error);
  }
}

// Run the seed function
seedEventsAndActivities(); 
import { eq, and, or, like, sql, not } from 'drizzle-orm';
import { db } from '../connection';
import { Users, Roles, Members } from '../schema';
import * as bcrypt from 'bcrypt';

/**
 * User Repository for handling user-related database operations
 */
export class UserRepository {
  /**
   * Create a new user
   */
  static async CreateUser(userData: {
    Name: string;
    Email: string;
    Password: string;
    RoleId: number;
    Phone?: string;
    Address?: string;
    InitialCredit?: number;
    CreditLimit?: number;
  }) {
    try {
      // Check if user with email already exists
      const existingUser = await db.query.Users.findFirst({
        where: eq(Users.Email, userData.Email),
      });

      if (existingUser) {
        return {
          success: false,
          message: 'A user with this email already exists',
        };
      }

      // Start a transaction
      return await db.transaction(async (tx) => {
        // Hash the password
        const PasswordHash = await bcrypt.hash(userData.Password, 10);

        // Create the user
        const newUser = await tx
          .insert(Users)
          .values({
            Name: userData.Name,
            Email: userData.Email,
            PasswordHash,
            RoleId: userData.RoleId,
          })
          .returning();

        const user = newUser[0];

        // Get the role
        let roleName = "User";
        if (userData.RoleId) {
          const role = await tx.query.Roles.findFirst({
            where: eq(Roles.RoleId, userData.RoleId),
          });
          
          roleName = role?.Name || "User";

          // If the role is Member, also create a member record
          if (role && role.Name === 'Member') {
            // Create member record
            await tx
              .insert(Members)
              .values({
                Name: userData.Name,
                Email: userData.Email,
                Phone: userData.Phone,
                Address: userData.Address,
                CreditBalance: userData.InitialCredit ? userData.InitialCredit.toString() : '0',
                CreditLimit: userData.CreditLimit ? userData.CreditLimit.toString() : '0',
                UserId: user.UserId,
              });
          }
        }

        // After transaction is complete, send welcome email
        // We use a dynamic import to avoid circular dependencies
        // We use a try/catch so email failure doesn't block account creation
        setTimeout(async () => {
          try {
            console.log(`[EMAIL] Preparing to send welcome email to ${userData.Email} [User ID: ${user.UserId}]`);
            console.log(`[EMAIL] Welcome email details - Name: ${userData.Name}, Role: ${roleName}`);
            console.log(`[EMAIL] Initializing EmailService...`);
            
            const startTime = Date.now();
            const { EmailService } = await import('@/lib/email');
            
            console.log(`[EMAIL] Sending welcome email...`);
            const emailResult = await EmailService.SendWelcomeEmail(
              userData.Email, 
              userData.Name,
              roleName
            );
            
            const duration = Date.now() - startTime;
            console.log(`[EMAIL] Welcome email sent successfully to ${userData.Email} [User ID: ${user.UserId}]`);
            console.log(`[EMAIL] Email sending completed in ${duration}ms`);
            console.log(`[EMAIL] Email service response: ${JSON.stringify({
              messageId: emailResult.messageId,
              response: emailResult.response
            })}`);
          } catch (emailError) {
            console.error(`[EMAIL ERROR] Failed to send welcome email to ${userData.Email} [User ID: ${user.UserId}]`);
            console.error('[EMAIL ERROR] Error details:', emailError);
            // Don't fail the account creation if email sending fails
          }
        }, 0);

        return {
          success: true,
          user,
        };
      });
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        message: 'Failed to create user',
        error,
      };
    }
  }

  /**
   * Get user by ID
   */
  static async GetUserById(userId: number) {
    try {
      const userResult = await db.query.Users.findFirst({
        where: eq(Users.UserId, userId),
        with: {
          // IsActive is part of the Users table, so it's fetched by default
          Role: true,
        },
      });

      if (!userResult) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = {
        ...userResult, // userResult is now guaranteed to be defined here
        IsActive: userResult.IsActive,
        RoleName: userResult.Role?.Name || 'Unknown',
      };

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        message: 'Failed to get user',
        error,
      };
    }
  }

  /**
   * Get users with optional filtering
   */
  static async GetUsers(options?: {
    userId?: number;
    roleId?: number;
    role?: string;
    searchQuery?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 50;
      const offset = (page - 1) * limit;

      // Build the where clause
      const conditions = [];
      if (options?.userId) {
        conditions.push(eq(Users.UserId, options.userId));
      }
      if (options?.roleId) {
        conditions.push(eq(Users.RoleId, options.roleId));
      }
      if (options?.role) {
        conditions.push(eq(Roles.Name, options.role));
      }
      if (options?.searchQuery) {
        conditions.push(or(
          like(Users.Name, `%${options.searchQuery}%`),
          like(Users.Email, `%${options.searchQuery}%`),
          like(sql`${Users.UserId}::text`, `%${options.searchQuery}%`)
        ));
      }


      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users with roles
      const users = await db
        .select({
          UserId: Users.UserId,
          Name: Users.Name,
          Email: Users.Email,
          RoleId: Users.RoleId,
          RoleName: Roles.Name,
          CreatedAt: Users.CreatedAt,
          UpdatedAt: Users.UpdatedAt,
          IsActive: Users.IsActive,
        })
        .from(Users)
        .leftJoin(Roles, eq(Users.RoleId, Roles.RoleId))
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(Users)
        .leftJoin(Roles, eq(Users.RoleId, Roles.RoleId))
        .where(whereClause);

      const total = Number(countResult[0].count) || 0;

      return {
        success: true,
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        message: 'Failed to get users',
        error,
      };
    }
  }

  /**
   * Update user
   */
  static async UpdateUser(
    userId: number,
    userData: {
      Name?: string;
      Email?: string;
      Password?: string;
      RoleId?: number;
      IsActive?: boolean;
    }
  ) {
    try {
      // Check if user exists
      const existingUser = await db.query.Users.findFirst({
        where: eq(Users.UserId, userId),
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Prepare update data
      const updateData: any = {};

      if (userData.Name) {
        updateData.Name = userData.Name;
      }

      if (userData.Email) {
        // Check if email is already taken by another user
        const emailUser = await db.query.Users.findFirst({
          where: and(
            eq(Users.Email, userData.Email),
            not(eq(Users.UserId, userId))
          ),
        });

        if (emailUser) {
          return {
            success: false,
            message: 'Email is already in use by another user',
          };
        }

        updateData.Email = userData.Email;
      }

      if (userData.Password) {
        updateData.PasswordHash = await bcrypt.hash(userData.Password, 10);
      }

      if (userData.RoleId) {
        updateData.RoleId = userData.RoleId;
      }

      if (userData.IsActive !== undefined) {
        updateData.IsActive = userData.IsActive;
      }

      // Update timestamp
      updateData.UpdatedAt = new Date();

      // Update user
      const updatedUser = await db
        .update(Users)
        .set(updateData)
        .where(eq(Users.UserId, userId))
        .returning();

      return {
        success: true,
        user: updatedUser[0],
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: 'Failed to update user',
        error,
      };
    }
  }

  /**
   * Get all available roles
   */
  static async GetRoles() {
    try {
      const roles = await db.select().from(Roles);
      
      return {
        success: true,
        roles,
      };
    } catch (error) {
      console.error('Get roles error:', error);
      return {
        success: false,
        message: 'Failed to get roles',
        error,
      };
    }
  }
}

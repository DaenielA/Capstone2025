/**
 * This is a mock in-memory database.
 * In a real application, you would use a real database like PostgreSQL, MySQL, or MongoDB.
 * By placing the data in its own module, we ensure that it's not re-initialized on every request
 * during development, which is a common issue with hot-reloading in Next.js API routes.
 */

export interface MockUser {
    UserId: number;
    Name: string;
    Email: string;
    RoleName: 'Administrator' | 'Cashier' | 'Member';
    CreatedAt: string;
    RoleId: number;
    status: 'active' | 'inactive';
}

export let users: MockUser[] = [
    { UserId: 1, Name: 'Daenerys Targaryen', Email: 'dany@pandol.com', RoleName: 'Administrator' as const, CreatedAt: '2023-10-27T10:00:00Z', RoleId: 1, status: 'active' as const },
    { UserId: 2, Name: 'Jon Snow', Email: 'jon@pandol.com', RoleName: 'Cashier' as const, CreatedAt: '2023-10-27T12:30:00Z', RoleId: 2, status: 'active' as const },
    { UserId: 3, Name: 'Tyrion Lannister', Email: 'tyrion@pandol.com', RoleName: 'Cashier' as const, CreatedAt: '2023-10-26T18:00:00Z', RoleId: 2, status: 'inactive' as const },
];

// We can export a function to modify the users array if needed,
// which is a bit cleaner than exporting the array directly as `let`.
export function updateUser(index: number, user: MockUser) {
    users[index] = user;
}
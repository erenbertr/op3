import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { UserServiceNew } from '../services/userServiceNew';
import { User } from '../types/user';

/**
 * Example demonstrating the Universal Database Service
 * This shows how the same code works with ANY database type!
 */

async function demonstrateUniversalDatabase() {
    console.log('🚀 Universal Database Service Demo');
    console.log('=====================================');

    const universalDb = UniversalDatabaseService.getInstance();
    const userService = UserServiceNew.getInstance();

    try {
        // Initialize schemas for all tables
        console.log('📋 Initializing database schemas...');
        await universalDb.initializeAllSchemas();
        console.log('✅ Schemas initialized successfully');

        // Create a test user
        console.log('\n👤 Creating a test user...');
        const createResult = await userService.createUser({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            role: 'normal',
            isActive: true,
            firstName: 'Test',
            lastName: 'User'
        });

        if (createResult.success) {
            console.log('✅ User created:', createResult.user);
            const userId = createResult.user?.id;

            if (userId) {
                // Get user by ID
                console.log('\n🔍 Getting user by ID...');
                const user = await userService.getUserById(userId);
                console.log('✅ User found:', user?.email);

                // Update user
                console.log('\n📝 Updating user...');
                const updateResult = await userService.updateUser(userId, {
                    firstName: 'Updated',
                    lastName: 'Name'
                });
                console.log('✅ Update result:', updateResult.message);

                // Get user by email
                console.log('\n📧 Getting user by email...');
                const userByEmail = await userService.getUserByEmail('test@example.com');
                console.log('✅ User found by email:', userByEmail?.firstName, userByEmail?.lastName);

                // Get all users
                console.log('\n📊 Getting all users...');
                const allUsers = await userService.getAllUsers({ limit: 5 });
                console.log('✅ Found users:', allUsers.total, 'total');

                // Count users by role
                console.log('\n🔢 Counting users by role...');
                const normalUserCount = await userService.countUsersByRole('normal');
                console.log('✅ Normal users count:', normalUserCount);

                // Update last login
                console.log('\n⏰ Updating last login...');
                await userService.updateLastLogin(userId);
                console.log('✅ Last login updated');

                // Get active users
                console.log('\n🟢 Getting active users...');
                const activeUsers = await userService.getActiveUsers();
                console.log('✅ Active users count:', activeUsers.length);

                // Clean up - delete test user
                console.log('\n🗑️ Cleaning up test user...');
                const deleteResult = await userService.deleteUser(userId);
                console.log('✅ Delete result:', deleteResult.message);
            }
        } else {
            console.error('❌ Failed to create user:', createResult.message);
        }

        console.log('\n🎉 Demo completed successfully!');
        console.log('\n💡 Key Benefits:');
        console.log('   • Same code works with MongoDB, MySQL, PostgreSQL, SQLite, Supabase');
        console.log('   • No more database-specific switch statements');
        console.log('   • Automatic type conversion and field mapping');
        console.log('   • Built-in query building and pagination');
        console.log('   • Consistent API across all database types');
        console.log('   • Reduced code from 1000+ lines to ~250 lines per service');

    } catch (error) {
        console.error('❌ Demo failed:', error);
    }
}

/**
 * Example of direct Universal Database usage (without service layer)
 */
async function demonstrateDirectUsage() {
    console.log('\n🔧 Direct Universal Database Usage');
    console.log('===================================');

    const universalDb = UniversalDatabaseService.getInstance();

    try {
        // Direct insert
        const insertResult = await universalDb.insert<User>('users', {
            id: 'direct-test-id',
            email: 'direct@example.com',
            username: 'directuser',
            password: 'hashedpassword',
            role: 'normal',
            isActive: true
        });
        console.log('✅ Direct insert result:', insertResult);

        // Direct find with complex query
        const findResult = await universalDb.findMany<User>('users', {
            where: [
                { field: 'isActive', operator: 'eq', value: true },
                { field: 'role', operator: 'in', value: ['normal', 'admin'] }
            ],
            orderBy: [
                { field: 'createdAt', direction: 'desc' }
            ],
            limit: 10,
            select: ['id', 'email', 'role', 'createdAt']
        });
        console.log('✅ Direct find result:', findResult.data.length, 'users found');

        // Direct update
        const updateResult = await universalDb.update<User>('users', 'direct-test-id', {
            lastLoginAt: new Date()
        });
        console.log('✅ Direct update result:', updateResult);

        // Direct count
        const count = await universalDb.count('users', {
            where: [{ field: 'isActive', operator: 'eq', value: true }]
        });
        console.log('✅ Direct count result:', count);

        // Direct delete
        const deleteResult = await universalDb.delete('users', 'direct-test-id');
        console.log('✅ Direct delete result:', deleteResult);

    } catch (error) {
        console.error('❌ Direct usage demo failed:', error);
    }
}

/**
 * Run the demonstrations
 */
export async function runUniversalDatabaseDemo() {
    await demonstrateUniversalDatabase();
    await demonstrateDirectUsage();
}

// Uncomment to run the demo
// runUniversalDatabaseDemo().catch(console.error);

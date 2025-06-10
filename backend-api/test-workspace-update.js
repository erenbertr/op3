const { MongoClient } = require('mongodb');

async function testWorkspaceUpdate() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('op3');
    
    // Get the first workspace
    const workspace = await db.collection('workspaces').findOne({});
    if (!workspace) {
        console.log('No workspaces found');
        await client.close();
        return;
    }
    
    console.log('Found workspace:', {
        id: workspace.id,
        name: workspace.name,
        groupId: workspace.groupId,
        sortOrder: workspace.sortOrder
    });
    
    // Get the first group
    const group = await db.collection('workspace_groups').findOne({});
    if (!group) {
        console.log('No groups found');
        await client.close();
        return;
    }
    
    console.log('Found group:', {
        id: group.id,
        name: group.name
    });
    
    // Try to update the workspace's groupId
    console.log('\nAttempting to update workspace groupId...');
    const updateResult = await db.collection('workspaces').updateOne(
        { id: workspace.id },
        { 
            $set: { 
                groupId: group.id,
                sortOrder: 0,
                updatedAt: new Date()
            } 
        }
    );
    
    console.log('Update result:', updateResult);
    
    // Check if the update worked
    const updatedWorkspace = await db.collection('workspaces').findOne({ id: workspace.id });
    console.log('Updated workspace:', {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        groupId: updatedWorkspace.groupId,
        sortOrder: updatedWorkspace.sortOrder
    });
    
    await client.close();
}

testWorkspaceUpdate().catch(console.error);

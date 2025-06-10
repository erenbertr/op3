const { MongoClient } = require('mongodb');

async function checkWorkspaces() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('op3');
    const workspaces = await db.collection('workspaces').find({}).sort({ sortOrder: 1 }).toArray();

    console.log('\n=== Current workspaces ===');
    workspaces.forEach(w => {
        console.log(`- ${w.name}: groupId=${w.groupId || 'null'}, sortOrder=${w.sortOrder}`);
    });

    console.log('\n=== Workspace groups ===');
    const groups = await db.collection('workspace_groups').find({}).toArray();
    groups.forEach(g => {
        console.log(`- ${g.name} (id: ${g.id})`);
    });

    console.log('\n=== Workspaces by group ===');
    groups.forEach(g => {
        const groupWorkspaces = workspaces.filter(w => w.groupId === g.id);
        console.log(`\n${g.name} group (${g.id}):`);
        if (groupWorkspaces.length === 0) {
            console.log('  (no workspaces)');
        } else {
            groupWorkspaces.forEach(w => {
                console.log(`  - ${w.name} (sortOrder: ${w.sortOrder})`);
            });
        }
    });

    const ungroupedWorkspaces = workspaces.filter(w => !w.groupId);
    console.log('\nUngrouped workspaces:');
    if (ungroupedWorkspaces.length === 0) {
        console.log('  (no ungrouped workspaces)');
    } else {
        ungroupedWorkspaces.forEach(w => {
            console.log(`  - ${w.name} (sortOrder: ${w.sortOrder})`);
        });
    }

    await client.close();
}

checkWorkspaces().catch(console.error);

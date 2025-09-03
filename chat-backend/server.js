const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { group } = require('console');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

//Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

let data = {
    users: [],
    groups: [],
    channels: [],
}

//Load data from file if exists
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
            data = JSON.parse(fileContent);
            console.log('Data loaded from file.');
        } else {
            //Load default data if file doesn't exist
            initialiseDefaultData();
            saveData();
            console.log('No data file found. Initialized with default data.');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        initialiseDefaultData();
    }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Data saved to file.');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

//Default data
function initialiseDefaultData() {
    data = {
        users: [
            {   
                id: 1,
                username: 'super',
                email: 'super@admin.com',
                password: '123',
                roles: ['super_admin', 'group_admin', 'user'], 
                groups: [1]
            }
        ],
        groups: [],
        channels: []
    }
}

let currentUser = null;


//AUTH ROUTES

//Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = data.users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        const { password: _, ...userWithoutPassword } = user; //Remove password from response
        res.json({ success: true, user: userWithoutPassword });

    } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

//Logout
app.post('/api/auth/logout', (req, res) => {
    currentUser = null;
    res.json({ success: true, message: 'Logged out successfully' });
});

loadData();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


//USER ROUTES

//Get all users
app.get('/api/users', (req, res) => {
    const usersWithoutPasswords = data.users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
});

//Reg new user
app.post('/api/users', (req, res) => {
    const { username, email, password } = req.body;

    if (data.users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        roles: ['user'],
        groups: []
    };

    data.users.push(newUser);
    saveData();

    const { password: _, ...userWithoutPassword } = newUser;
    res.json ({ success: true, user: userWithoutPassword });
});

//Delete user
app.delete('/api/users/:id', (req, res) => {
    data.users = data.users.filter(u => u.id !== req.params.id);

    //add removal from groups and channels here

    saveData();
    res.json({ success: true, message: 'User deleted' });
});

//Promote user
app.post('/api/users/:id/promote', (req, res) => {
    const { role } = req.body;
    const user = data.users.find(u => u.id === req.params.id);

    if (role === 'user') {
        user.roles = ['user'];
    } else if (role === 'group_admin') {
        user.roles = ['user', 'group_admin'];
    } else if (role === 'super_admin') {
        user.roles = ['user', 'group_admin', 'super_admin'];
    }

    saveData();

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
});
    

//GROUP ROUTES

app.get('/api/groups', (req, res) => {
    res.json(data.groups);
});

//Create group
app.post('/api/groups', (req, res) => {
    const { name } = req.body;
    
    const newGroup = {
        id: Date.now().toString(),
        name,
        admins: [currentUser?.id || '1'],
        members: [currentUser?.id || '1']
    };
    
    data.groups.push(newGroup);
    
    //Update users groups
    const user = data.users.find(u => u.id === (currentUser?.id || '1'));
    if (user) {
        user.groups.push(newGroup.id);
    }
    
    saveData();
    res.json({ success: true, group: newGroup });
});

//Add user to group
app.post('/api/groups/:id/members', (req, res) => {
    const { userId } = req.body;
    const group = data.groups.find(g => g.id === req.params.id);
    
    if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
    }
    
    if (!group.members.includes(userId)) {
        group.members.push(userId);
        
        //Add group to user's groups
        const user = data.users.find(u => u.id === userId);
        if (user && !user.groups.includes(req.params.id)) {
            user.groups.push(req.params.id);
        }
        
        //Add user to all channels in the group
        data.channels
            .filter(c => c.groupId === req.params.id)
            .forEach(channel => {
                if (!channel.members.includes(userId)) {
                    channel.members.push(userId);
                }
            });
        
        saveData();
    }
    res.json({ success: true });
});

//Remove user from group
app.delete('/api/groups/:id/members/:userId', (req, res) => {
    const group = data.groups.find(g => g.id === req.params.id);
    
    if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
    }
    
    group.members = group.members.filter(id => id !== req.params.userId);
    group.admins = group.admins.filter(id => id !== req.params.userId);
    
    //Remove group from user's groups
    const user = data.users.find(u => u.id === req.params.userId);
    if (user) {
        user.groups = user.groups.filter(id => id !== req.params.id);
    }
    
    // Remove from channels in this group
    data.channels
        .filter(c => c.groupId === req.params.id)
        .forEach(channel => {
            channel.members = channel.members.filter(id => id !== req.params.userId);
        });
    
    saveData();
    res.json({ success: true });
});

//Delete group
app.delete('/api/groups/:id', (req, res) => {
    data.groups = data.groups.filter(g => g.id !== req.params.id);
    data.channels = data.channels.filter(c => c.groupId !== req.params.id);
    
    //Remove group from all users
    data.users.forEach(user => {
        user.groups = user.groups.filter(id => id !== req.params.id);
    });
    
    saveData();
    res.json({ success: true });
});

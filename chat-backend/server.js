const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const http = require('http');
const socketIo = require('socket.io');
const { formidable } = require('formidable');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

//Create uploads dir if doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

//Create HTTP server and socket.io instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

//Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//Mongo connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'chatapp';
let db;
let usersCollection;
let groupsCollection;
let channelsCollection;
let messagesCollection;

//Connect to MongoDB
MongoClient.connect(MONGODB_URI)
    .then(client => {
        console.log("Connected to MongoDB");
        db = client.db(DB_NAME);

        //Get collections
        usersCollection = db.collection('users');
        groupsCollection = db.collection('groups');
        channelsCollection = db.collection('channels');
        messagesCollection = db.collection('messages');

        usersCollection.createIndex({ username: 1 }, { unique: true });

        initialiseDefaultData();
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
});


//Default data if empty
async function initialiseDefaultData() {

    try {
        const userCount = await usersCollection.countDocuments();

        if (userCount === 0) {
            console.log("Initialising default data...")

            //Default User
            const superAdminResult = await usersCollection.insertOne({
                username: 'super',
                email: 'super@admin.com',
                password: '123',
                roles: ['super_admin', 'group_admin', 'user'],
                groups: [],
                profileImage: null
            });

            //Default Group
            const groupResult = await groupsCollection.insertOne({
                name: 'General',
                admins: [superAdminResult.insertedId.toString()],
                members: [superAdminResult.insertedId.toString()]
            });

            await usersCollection.updateOne(
                {_id: superAdminResult.insertedId},
                {push: {groups: groupResult.insertedId.toString()}}
            );

            //Default Channel
            await channelsCollection.insertOne(
                {
                    name: 'general',
                    groupId: groupResult.insertedId.toString(),
                    members:[]
                }
            );

            console.log("Default data created");
        }
    } catch (error){
        console.error('Error creating data:', error);
    }
}

//Helper to convert MongoDB _id to id
function formatDocument(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
}

let currentUser = null;


//AUTH ROUTES

//Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await usersCollection.findOne({ username, password });
    
    if (user) {
      currentUser = user;
      const formattedUser = formatDocument(user);
      delete formattedUser.password;
      res.json({ success: true, user: formattedUser });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Logout
app.post('/api/auth/logout', (req, res) => {
    currentUser = null;
    res.json({ success: true, message: 'Logged out successfully' });
});




//USER ROUTES

//Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    const formattedUsers = users.map(user => {
      const formatted = formatDocument(user);
      delete formatted.password;
      return formatted;
    });
    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Reg new user
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    //Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required'
      });
    }
    
    //Check if username exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const result = await usersCollection.insertOne({
      username,
      email,
      password,
      roles: ['user'],
      groups: [],
      profileImage: null
    });
    
    const newUser = await usersCollection.findOne({ _id: result.insertedId });
    const formattedUser = formatDocument(newUser);
    delete formattedUser.password;
    
    res.status(201).json({ success: true, user: formattedUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during registration'
    });
  }
});

//Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    //Delete user
    await usersCollection.deleteOne({ _id: new ObjectId(userId) });
    
    //Remove user from all groups
    await groupsCollection.updateMany(
      {},
      { 
        $pull: { 
          members: userId,
          admins: userId 
        } 
      }
    );
    
    //Remove user from all channels
    await channelsCollection.updateMany(
      {},
      { $pull: { members: userId } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Promote user
app.post('/api/users/:id/promote', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    let roles = ['user'];
    if (role === 'group_admin') {
      roles = ['user', 'group_admin'];
    } else if (role === 'super_admin') {
      roles = ['user', 'group_admin', 'super_admin'];
    }
    
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { roles } }
    );
    
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const formattedUser = formatDocument(user);
    delete formattedUser.password;
    
    res.json({ success: true, user: formattedUser });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
    
//Upload profile image
app.post('/api/users/:id/upload-profile-image', async (req, res) => {
  try {
    const userId = req.params.id;
    
    //Configure formidable
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, //5MB max
      multiples: false
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(400).json({ 
          success: false, 
          message: 'Error uploading file',
          error: err.message 
        });
      }

      console.log('Files received:', files);

      //Get the uploaded file
      let uploadedFile;
      if (files.image) {
        uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;
      }
      
      if (!uploadedFile) {
        console.log('No image file in request');
        return res.status(400).json({ 
          success: false, 
          message: 'No image file provided' 
        });
      }

      console.log('Processing file:', uploadedFile.originalFilename || uploadedFile.newFilename);

      //Validate file type
      const mimetype = uploadedFile.mimetype || '';
      if (!mimetype.startsWith('image/')) {
        //Clean up the uploaded file
        if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }
        return res.status(400).json({ 
          success: false, 
          message: 'File must be an image' 
        });
      }

      try {
        //Get the user
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
          //Clean up uploaded file
          if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
            fs.unlinkSync(uploadedFile.filepath);
          }
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }

        //Delete old profile image if exists
        if (user.profileImage) {
          const oldImagePath = path.join(__dirname, user.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Deleted old profile image');
          }
        }

        //Generate new filename
        const fileExt = path.extname(uploadedFile.originalFilename || uploadedFile.newFilename || '.jpg');
        const newFilename = `profile_${userId}_${Date.now()}${fileExt}`;
        const newFilepath = path.join(uploadsDir, newFilename);
        
        console.log('Moving file from', uploadedFile.filepath, 'to', newFilepath);
        
        //Move/rename file to final location
        if (uploadedFile.filepath !== newFilepath) {
          fs.renameSync(uploadedFile.filepath, newFilepath);
        }
        
        //Update user profile image in database
        const profileImageUrl = `/uploads/profiles/${newFilename}`;
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { profileImage: profileImageUrl } }
        );

        //Get updated user
        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const formattedUser = formatDocument(updatedUser);
        delete formattedUser.password;

        console.log(`Profile image uploaded successfully: ${profileImageUrl}`);
        
        res.json({ 
          success: true, 
          message: 'Profile image uploaded successfully',
          user: formattedUser,
          profileImageUrl: `http://localhost:3000${profileImageUrl}`
        });
      } catch (innerError) {
        console.error('Error processing upload:', innerError);
        //Clean up file if error
        if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }
        throw innerError;
      }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during upload',
      error: error.message 
    });
  }
});

//Remove profile image
app.delete('/api/users/:id/profile-image', async (req, res) => {
  try {
    const userId = req.params.id;
    
    //Get the user
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    //Delete profile image file if exists
    if (user.profileImage) {
      const imagePath = path.join(__dirname, user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.removeSync(imagePath);
      }
    }

    //Update user in database
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profileImage: null } }
    );

    res.json({ 
      success: true, 
      message: 'Profile image removed successfully' 
    });
  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});


//GROUP ROUTES

//Get all groups
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await groupsCollection.find({}).toArray();
    const formattedGroups = groups.map(formatDocument);
    res.json(formattedGroups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Create group
app.post('/api/groups', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = currentUser?._id.toString() || '1';
    
    const result = await groupsCollection.insertOne({
      name,
      admins: [userId],
      members: [userId]
    });
    
    //Add group to user's groups
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { groups: result.insertedId.toString() } }
    );
    
    const newGroup = await groupsCollection.findOne({ _id: result.insertedId });
    res.json({ success: true, group: formatDocument(newGroup) });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Update group
app.put('/api/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const updates = {};
    
    if (req.body.name) updates.name = req.body.name;
    if (req.body.admins) updates.admins = req.body.admins;
    if (req.body.members) updates.members = req.body.members;
    
    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: updates }
    );
    
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    
    res.json({ success: true, group: formatDocument(group) });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Add user to group
app.post('/api/groups/:id/members', async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id;
    
    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: userId } } //Prevent duplicates
    );
    
    // Add group to user's groups
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { groups: groupId } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Remove user from group
app.delete('/api/groups/:id/members/:userId', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.params.userId;
    
    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $pull: { 
          members: userId,
          admins: userId 
        } 
      }
    );
    
    //Remove group from user
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { groups: groupId } }
    );
    
    //Remove user from all channels in this group
    await channelsCollection.updateMany(
      { groupId: groupId },
      { $pull: { members: userId } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Delete group
app.delete('/api/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    
    await groupsCollection.deleteOne({ _id: new ObjectId(groupId) });
    
    //Delete all channels in this group
    await channelsCollection.deleteMany({ groupId: groupId });
    
    //Remove group from all users
    await usersCollection.updateMany(
      {},
      { $pull: { groups: groupId } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});




//CHANNEL ROUTES

//Get channels for a group
app.get('/api/groups/:groupId/channels', async (req, res) => {
  try {
    const channels = await channelsCollection.find({ groupId: req.params.groupId }).toArray();
    const formattedChannels = channels.map(formatDocument);
    res.json(formattedChannels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Create channel
app.post('/api/channels', async (req, res) => {
  try {
    const { name, groupId } = req.body;
    
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    
    const result = await channelsCollection.insertOne({
      name,
      groupId,
      members: []
    });
    
    const newChannel = await channelsCollection.findOne({ _id: result.insertedId });
    res.json({ success: true, channel: formatDocument(newChannel) });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Delete channel
app.delete('/api/channels/:id', async (req, res) => {
  try {
    await channelsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Join channel
app.post('/api/channels/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const channelId = req.params.id;
    
    await channelsCollection.updateOne(
      { _id: new ObjectId(channelId) },
      { $addToSet: { members: userId } }
    );
    
    res.json({ success: true, message: 'Joined channel successfully' });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Leave channel
app.post('/api/channels/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const channelId = req.params.id;
    
    await channelsCollection.updateOne(
      { _id: new ObjectId(channelId) },
      { $pull: { members: userId } }
    );
    
    res.json({ success: true, message: 'Left channel successfully' });
  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});




//CHAT FUNCTIONALITY

//Track connected users
const connectedUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  //User joins the chat system
  socket.on('user-connect', async (userData) => {
    const { userId, username } = userData;
    connectedUsers.set(socket.id, { userId, username });
    userSockets.set(userId, socket.id);
    console.log(`User ${username} connected`);

    //Join all channels the user is a member of
    const channels = await channelsCollection.find({ members: userId }).toArray();
    for (const channel of channels) {
      socket.join(`channel-${channel._id}`);
      console.log(`User ${username} joined channel room: channel-${channel._id}`);
    }
  });

  //User joins a specific channel
  socket.on('join-channel', async (data) => {
    const { channelId, userId, username } = data;
    const roomName = `channel-${channelId}`;
    
    socket.join(roomName);
    console.log(`${username} joined channel ${channelId}`);
    
    //Load and send recent messages (last 50)
    const messages = await messagesCollection
      .find({ channelId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    const formattedMessages = messages.reverse().map(formatDocument);
    socket.emit('message-history', formattedMessages);
    
    //Notify others in the channel
    socket.to(roomName).emit('user-joined', { username, channelId });
  });

  //User leaves a channel
  socket.on('leave-channel', (data) => {
    const { channelId, username } = data;
    const roomName = `channel-${channelId}`;
    
    socket.leave(roomName);
    console.log(`${username} left channel ${channelId}`);
    
    //Notify others in the channel
    socket.to(roomName).emit('user-left', { username, channelId });
  });

  //Handle sending messages
  socket.on('send-message', async (data) => {
    const { channelId, userId, username, content } = data;
    const roomName = `channel-${channelId}`;

    //Get user profile image
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const profileImage = user?.profileImage ? `http://localhost:3000${user.profileImage}` : null;
    
    //Save message to database
    const message = {
      channelId,
      userId,
      username,
      content,
      profileImage, 
      timestamp: new Date()
    };
    
    const result = await messagesCollection.insertOne(message);
    const savedMessage = { ...message, id: result.insertedId.toString() };
    
    console.log(`Message from ${username} in channel ${channelId}: ${content}`);
    
    //Send message to all users in the channel
    io.to(roomName).emit('new-message', formatDocument(savedMessage));
  });

  //Handle typing indicators
  socket.on('typing', (data) => {
    const { channelId, username } = data;
    const roomName = `channel-${channelId}`;
    socket.to(roomName).emit('user-typing', { username, channelId });
  });

  socket.on('stop-typing', (data) => {
    const { channelId, username } = data;
    const roomName = `channel-${channelId}`;
    socket.to(roomName).emit('user-stop-typing', { username, channelId });
  });

  //Handle disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.username} disconnected`);
      connectedUsers.delete(socket.id);
      userSockets.delete(user.userId);
      
      //Notify all channels the user was in
      io.emit('user-disconnected', { username: user.username });
    }
  });
});

//Base route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chat API Server with MongoDB (Native Driver)',
    database: 'MongoDB',
    driver: 'Native MongoDB Driver (no Mongoose)',
    status: db ? 'Connected' : 'Disconnected'
  });
});


//MESSAGE ROUTES

//Get messages for a channel
app.get('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await messagesCollection
      .find({ channelId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    const formattedMessages = messages.reverse().map(formatDocument);
    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
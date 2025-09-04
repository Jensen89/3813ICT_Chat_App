# Chat Application Documentation

## Table of Contents
1. [Data Structures](#data-structures)
2. [Angular Architecture](#angular-architecture)
3. [Node Server Architecture](#node-server-architecture)
4. [Server-Side Routes](#server-side-routes)
5. [Client-Server Interactions](#client-server-interactions)

---

## Data Structures

### Client-Side Data Models (TypeScript)

#### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  password?: string;  // Optional, removed from responses
  roles: string[];    // ['user', 'group_admin', 'super_admin']
  groups: string[];   // Array of group IDs
}
```

#### Group Interface
```typescript
interface Group {
  id: string;
  name: string;
  admins: string[];   // Array of user IDs who are group admins
  members: string[];  // Array of user IDs who are group members
}
```

#### Channel Interface
```typescript
interface Channel {
  id: string;
  name: string;
  groupId: string;    // ID of the parent group
  members: string[];  // Array of user IDs who are channel members
}
```

### Server-Side Data Structure (JSON)

The server stores data in `data.json` with the following structure:

```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "password": "string",
      "roles": ["user", "group_admin", "super_admin"],
      "groups": ["groupId1", "groupId2"]
    }
  ],
  "groups": [
    {
      "id": "string",
      "name": "string",
      "admins": ["userId1", "userId2"],
      "members": ["userId1", "userId2", "userId3"]
    }
  ],
  "channels": [
    {
      "id": "string",
      "name": "string",
      "groupId": "string",
      "members": ["userId1", "userId2"]
    }
  ]
}
```

---

## Angular Architecture

### Components Structure

```
src/app/
├── components/
│   ├── login/          # Authentication component
│   ├── dashboard/      # Main dashboard showing user's groups and navigation
│   ├── users/          # User management (admin only)
│   ├── groups/         # Group management and membership
│   ├── channels/       # Channel management within groups
│   └── chat/           # Chat interface for channels
├── services/
│   └── api.ts          # HTTP service for backend communication
├── app.ts              # Root component
├── app.config.ts       # Application configuration
└── app.routes.ts       # Routing configuration
```

### Component Responsibilities

#### Login Component (`login.ts`)
- Handles user authentication and registration
- Form validation for login/register fields
- Redirects to dashboard on successful login
- **Properties**: `username`, `password`, `showRegister`, `regUsername`, `regEmail`, `regPassword`
- **Methods**: `login()`, `register()`, `toggleRegister()`

#### Dashboard Component (`dashboard.ts`)
- Main landing page after login
- Displays user's groups and role information
- Provides navigation to other sections
- **Properties**: `currentUser`, `userGroups`, `allUsers`
- **Methods**: `loadUserGroups()`, `loadUsers()`, `deleteUser()`, navigation methods

#### Groups Component (`groups.ts`)
- Comprehensive group management interface
- Create/delete groups (admins only)
- Add/remove members (admins only)
- Join/leave groups functionality
- **Properties**: `allGroups`, `allUsers`, `newGroupName`, `selectedGroupId`, `selectedUserId`
- **Methods**: `createGroup()`, `joinGroup()`, `leaveGroup()`, `addMemberToGroup()`, `removeMember()`, `deleteGroup()`

#### Users Component (`users.ts`)
- User administration (super admin only)
- Promote/demote user roles
- Delete users
- **Properties**: `allUsers`, `currentUser`
- **Methods**: `loadUsers()`, `deleteUser()`, `promoteUser()`

#### Channels Component (`channels.ts`)
- Channel management within specific groups
- Create/delete channels (group admins)
- Join/leave channels
- **Properties**: `channels`, `groupId`, `currentUser`, `newChannelName`
- **Methods**: `loadChannels()`, `createChannel()`, `deleteChannel()`, `joinChannel()`, `leaveChannel()`

#### Chat Component (`chat.ts`)
- Chat interface for specific channels
- Message display and sending (placeholder)
- **Properties**: `groupId`, `channelId`

### Services

#### API Service (`api.ts`)
- Centralized HTTP client for backend communication
- Authentication state management
- Role-based permission checking
- **Methods**: Authentication, User management, Group management, Channel management

### Routing Configuration

```typescript
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'users', component: Users },
  { path: 'groups', component: Groups },
  { path: 'channels/:groupId', component: Channels },
  { path: 'chat/:groupId/:channelId', component: Chat },
  { path: '**', redirectTo: 'login' }
];
```

---

## Node Server Architecture

### File Structure
```
chat-backend/
├── server.js          # Main server file with all routes and logic
├── data.json           # Persistent data storage
└── package.json        # Dependencies configuration
```

### Core Modules and Dependencies
- **Express.js**: Web application framework
- **CORS**: Cross-origin resource sharing middleware
- **body-parser**: Request body parsing middleware
- **fs**: File system operations for data persistence
- **path**: File path utilities

### Global Variables
- `app`: Express application instance
- `PORT`: Server port (3000)
- `DATA_FILE`: Path to data.json file
- `data`: In-memory data object containing users, groups, and channels
- `currentUser`: Currently authenticated user (session-like storage)

### Core Functions

#### Data Management
- `loadData()`: Loads data from data.json file on server start
- `saveData()`: Writes current data state to data.json file
- `initialiseDefaultData()`: Creates default super admin user

#### Authentication Middleware
- Simple session-based authentication using `currentUser` variable
- Role-based access control through user roles array

---

## Server-Side Routes

### Authentication Routes

#### POST `/api/auth/login`
- **Purpose**: User authentication
- **Parameters**: `{ username: string, password: string }`
- **Returns**: `{ success: boolean, user?: User, message?: string }`
- **Behavior**: Sets `currentUser` on success, returns user without password

#### POST `/api/auth/logout`
- **Purpose**: User logout
- **Parameters**: None
- **Returns**: `{ success: boolean, message: string }`
- **Behavior**: Clears `currentUser`

### User Management Routes

#### GET `/api/users`
- **Purpose**: Retrieve all users (without passwords)
- **Parameters**: None
- **Returns**: `User[]`
- **Behavior**: Returns all users with passwords removed

#### POST `/api/users`
- **Purpose**: Create new user (registration)
- **Parameters**: `{ username: string, email: string, password: string }`
- **Returns**: `{ success: boolean, user?: User, message?: string }`
- **Behavior**: Creates user with 'user' role, checks for duplicate usernames

#### DELETE `/api/users/:id`
- **Purpose**: Delete user account
- **Parameters**: `id` (URL parameter)
- **Returns**: `{ success: boolean, message: string }`
- **Behavior**: Removes user from all groups and channels, deletes user record

#### POST `/api/users/:id/promote`
- **Purpose**: Change user role/permissions
- **Parameters**: `{ role: string }` - 'user', 'group_admin', or 'super_admin'
- **Returns**: `{ success: boolean, user?: User }`
- **Behavior**: Updates user roles array based on specified role

### Group Management Routes

#### GET `/api/groups`
- **Purpose**: Retrieve all groups
- **Parameters**: None
- **Returns**: `Group[]`
- **Behavior**: Returns complete list of groups with membership info

#### POST `/api/groups`
- **Purpose**: Create new group
- **Parameters**: `{ name: string, adminId: string }`
- **Returns**: `{ success: boolean, group?: Group }`
- **Behavior**: Creates group with specified admin, adds admin as first member

#### DELETE `/api/groups/:id`
- **Purpose**: Delete group
- **Parameters**: `id` (URL parameter)
- **Returns**: `{ success: boolean }`
- **Behavior**: Removes group, associated channels, and updates user group lists

#### POST `/api/groups/:id/members`
- **Purpose**: Add user to group
- **Parameters**: `{ userId: string }`
- **Returns**: `{ success: boolean, message?: string }`
- **Behavior**: Adds user to group members and automatically to all group channels

#### DELETE `/api/groups/:id/members/:userId`
- **Purpose**: Remove user from group
- **Parameters**: `id` (group ID), `userId` (URL parameters)
- **Returns**: `{ success: boolean, message?: string }`
- **Behavior**: Removes user from group, admin list, and all group channels

### Channel Management Routes

#### GET `/api/groups/:groupId/channels`
- **Purpose**: Get channels for specific group
- **Parameters**: `groupId` (URL parameter)
- **Returns**: `Channel[]`
- **Behavior**: Returns channels filtered by group ID

#### POST `/api/channels`
- **Purpose**: Create new channel in group
- **Parameters**: `{ name: string, groupId: string }`
- **Returns**: `{ success: boolean, channel?: Channel }`
- **Behavior**: Creates channel with empty member list

#### DELETE `/api/channels/:id`
- **Purpose**: Delete channel
- **Parameters**: `id` (URL parameter)
- **Returns**: `{ success: boolean }`
- **Behavior**: Removes channel from data

#### POST `/api/channels/:id/join`
- **Purpose**: Join channel
- **Parameters**: `{ userId: string }`
- **Returns**: `{ success: boolean, message: string }`
- **Behavior**: Adds user to channel if they're group member

#### POST `/api/channels/:id/leave`
- **Purpose**: Leave channel
- **Parameters**: `{ userId: string }`
- **Returns**: `{ success: boolean, message: string }`
- **Behavior**: Removes user from channel members

---

## Client-Server Interactions

### Authentication Flow

1. **Login Process**:
   - User enters credentials in Login component
   - `api.login()` sends POST to `/api/auth/login`
   - Server validates credentials, sets `currentUser`
   - Client stores user in localStorage and navigates to Dashboard

2. **Session Management**:
   - API service checks localStorage for stored user on initialization
   - `getCurrentUser()` returns cached user information
   - Logout clears both server `currentUser` and client localStorage

### Data Synchronization Patterns

#### Groups Management
1. **Loading Groups**:
   - Component calls `api.getGroups()`
   - Server returns complete groups array
   - Component filters/displays based on user permissions

2. **Creating Group**:
   - User submits group name in Groups component
   - `api.createGroup()` sends POST to `/api/groups`
   - Server creates group, adds user as admin and member
   - Server saves data to file
   - Component reloads data and updates display

3. **Joining/Leaving Groups**:
   - User clicks join/leave button
   - API calls appropriate endpoint
   - Server updates group membership arrays
   - Server automatically adds/removes user from all group channels
   - Component refreshes data and updates UI

#### Member Management
1. **Adding Members**:
   - Admin selects group and user in Groups component
   - `api.addUserToGroup()` sends POST request
   - Server adds user to group members and all channels
   - Server updates user's groups array
   - Component shows success message and refreshes

2. **Removing Members**:
   - Admin clicks remove button next to member
   - Confirmation dialog appears
   - `api.removeUserFromGroup()` sends DELETE request
   - Server removes from group, channels, and user's group list
   - Component updates display with success message

### Permission-Based UI Updates

1. **Role-Based Display**:
   - Components check user roles via `api.isSuperAdmin()`, `api.isGroupAdmin()`
   - UI elements conditionally rendered based on permissions
   - Admin functions hidden from regular users

2. **Dynamic Permission Checking**:
   - `canManageGroup()` method checks if user is group admin or super admin
   - Remove/delete buttons only shown for authorized users
   - Server-side validation prevents unauthorized actions

### Error Handling and User Feedback

1. **API Error Responses**:
   - Server returns `{ success: false, message: string }` for errors
   - Client displays error messages in component UI
   - Loading states prevent duplicate requests

2. **Optimistic Updates**:
   - UI shows loading indicators during API calls
   - Success/error messages appear after server response
   - Data refresh occurs after successful operations

### Channel and Chat Flow

1. **Channel Navigation**:
   - User clicks "View Channels" from Groups component
   - Router navigates to `/channels/:groupId`
   - Channels component loads group-specific channels

2. **Channel Operations**:
   - Create/delete channels (group admins only)
   - Join/leave channels (group members only)
   - Server maintains channel membership separately from group membership

3. **Chat Navigation**:
   - User clicks channel to navigate to `/chat/:groupId/:channelId`
   - Chat component displays channel-specific interface

This architecture provides a clear separation between client-side state management, server-side data persistence, and real-time synchronization through HTTP API calls.
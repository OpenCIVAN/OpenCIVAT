# Chat Room Separation Fix

**Date**: 2026-01-14
**Issue**: All chats were sharing the same messages (no room separation)
**Status**: ✅ Core functionality implemented, DM and room creation pending

---

## Problem Summary

### Issue 1: Single Shared Chat Array
**Problem**: All users across all rooms saw the same messages because textChat.js used a single Y.js array:
```javascript
this.messages = ydoc.getArray("chatMessages"); // ONE array for everything
```

**Impact**:
- No room separation
- "Room", "Project", and "DM" tabs all showed the same messages
- Matrix federation was creating separate rooms, but the UI wasn't using them

### Issue 2: No DM Functionality
**Problem**: DM tab just showed a placeholder with no way to actually message anyone

**Impact**:
- Users couldn't start direct conversations
- No user selector UI existed

---

## Solution Implemented

### ✅ Phase 1: Room-Aware textChat.js

**Changes Made** (`src/collaboration/communication/textChat.js`):

1. **Added room tracking**:
   ```javascript
   this.currentRoomId = null;
   this.observeHandler = null;
   ```

2. **Modified initialization to accept roomId**:
   ```javascript
   initialize(roomId = 'global') {
     this.setRoom(roomId);
   }
   ```

3. **Added room switching capability**:
   ```javascript
   setRoom(roomId) {
     // Unobserve old array
     if (this.messages && this.observeHandler) {
       this.messages.unobserve(this.observeHandler);
     }

     // Get room-specific array
     const arrayName = `chatMessages_${roomId}`;
     this.messages = ydoc.getArray(arrayName);

     // Attach new observer
     this.messages.observe(this.observeHandler);
   }
   ```

4. **Added getter for current room**:
   ```javascript
   getCurrentRoomId() {
     return this.currentRoomId;
   }
   ```

**Result**: Each room now has its own Y.js array (`chatMessages_room1`, `chatMessages_room2`, etc.)

---

### ✅ Phase 2: Room Tracking in useChatTab.js

**Changes Made** (`src/ui/react/components/panels/RightPanel/tabs/ChatTab/hooks/useChatTab.js`):

1. **Added room state**:
   ```javascript
   const [currentRoomId, setCurrentRoomId] = useState(initialRoomId || 'global');
   const [availableRooms, setAvailableRooms] = useState([]);
   const [isLoadingRooms, setIsLoadingRooms] = useState(false);
   ```

2. **Added room fetching**:
   ```javascript
   const fetchRooms = useCallback(async () => {
     const response = await fetch(`/api/projects/${projectId}/rooms`);
     const rooms = await response.json();
     setAvailableRooms(rooms);
   }, [projectId]);
   ```

3. **Added room switching**:
   ```javascript
   const switchRoom = useCallback((roomId) => {
     setCurrentRoomId(roomId);
     textChat.setRoom(roomId);
     refreshMessages();
   }, [refreshMessages]);
   ```

4. **Auto-switch on prop changes**:
   ```javascript
   useEffect(() => {
     if (initialRoomId && initialRoomId !== currentRoomId) {
       switchRoom(initialRoomId);
     }
   }, [initialRoomId]);
   ```

5. **Initialize with room**:
   ```javascript
   textChat.initialize(currentRoomId); // Instead of no params
   ```

**Result**: Chat automatically switches when workspace/room changes, or can be manually switched

---

### ✅ Phase 3: Room Selector UI in ChatTab.jsx

**Changes Made** (`src/ui/react/components/panels/RightPanel/tabs/ChatTab/ChatTab.jsx`):

1. **Pass room context to hook**:
   ```javascript
   useChatTab({ workspaceId, roomId, projectId }) // Added roomId and projectId
   ```

2. **Added room selector dropdown**:
   ```jsx
   {activeSubtab === 'room' && availableRooms.length > 0 ? (
     <div className="chat-tab__room-selector">
       <select
         value={currentRoomId}
         onChange={(e) => switchRoom(e.target.value)}
       >
         {availableRooms.map(room => (
           <option key={room.id} value={room.id}>
             {room.name}
           </option>
         ))}
       </select>
     </div>
   ) : (
     <span>{currentSubtabLabel} Chat</span>
   )}
   ```

3. **Added create room button**:
   ```jsx
   {activeSubtab === 'room' && projectId && (
     <button
       className="chat-tab__create-room-btn"
       onClick={() => {/* TODO */}}
       title="Create new room"
     >
       <Icon name="plus" size={12} />
     </button>
   )}
   ```

**Result**: Users can see and switch between rooms via dropdown

---

## How It Works Now

### Auto-Switching
1. User enters a workspace
2. ChatTab receives `roomId` prop from workspace context
3. useChatTab detects roomId change
4. Calls `switchRoom(roomId)`
5. textChat.setRoom() switches to that room's Y.js array
6. Messages refresh to show only that room's chat

### Manual Switching
1. User clicks room selector dropdown
2. Selects a different room
3. `switchRoom()` is called
4. Chat switches to selected room's messages

### Room Isolation
- Room A messages: `ydoc.getArray("chatMessages_room-a-id")`
- Room B messages: `ydoc.getArray("chatMessages_room-b-id")`
- Each room has completely separate message history

---

## Matrix Federation Integration

### How Rooms Map to Matrix

When a CIA Web room is created via `POST /api/projects/:projectId/rooms`:

1. **Database**: Room stored in `rooms` table
2. **Matrix Bridge**: Automatically creates Matrix room
3. **Mapping**: Stored in `matrix_room_mappings` table
4. **Y.js**: Chat uses `chatMessages_${roomId}` array
5. **Sync**: Bridge syncs messages between Y.js array ↔ Matrix room

**Example**:
```
CIA Room: "Team Alpha" (id: abc-123)
  ↓
Matrix Room: !xyz789:matrix.cia-web.local
  ↓
Y.js Array: chatMessages_abc-123
  ↓
Messages sync bidirectionally
```

### Current Matrix Status
✅ Each room gets unique Matrix room
✅ Messages sync per room
✅ Room mappings stored in database
✅ Circuit breaker and error handling active

---

## What Still Needs Implementation

### ⏳ Pending: Room Creation UI

**What's Needed**:
1. Modal/dialog for creating new rooms
2. Form fields: room name, description, public/private
3. API call: `POST /api/projects/:projectId/rooms`
4. After creation: auto-switch to new room
5. Refresh room list

**Placeholder Added**:
```jsx
<button onClick={() => {/* TODO: Implement room creation */}}>
  <Icon name="plus" size={12} />
</button>
```

### ⏳ Pending: DM Functionality

**What's Needed**:
1. User list/selector component
2. API endpoint to fetch workspace members
3. Create DM "room" (room_type='dm')
4. Switch to DM room when user selected
5. Show DM conversations in a list

**Current State**:
```jsx
activeSubtab === 'dm' ? (
  <div className="chat-tab__empty">
    <span>Select a person to start a conversation</span>
  </div>
)
```

---

## Testing the Fix

### Test 1: Room Separation
```bash
1. Navigate to Project A > Workspace 1
2. Send message "Hello from Room 1"
3. Navigate to Project A > Workspace 2
4. Send message "Hello from Room 2"
5. Go back to Workspace 1
6. ✅ Should see only "Hello from Room 1"
7. Go to Workspace 2
8. ✅ Should see only "Hello from Room 2"
```

### Test 2: Room Switching
```bash
1. Open Chat tab
2. Click room selector dropdown
3. Select different room
4. ✅ Messages should change to that room's history
5. Send a message
6. ✅ Message appears in current room only
7. Switch back
8. ✅ Original room's messages still intact
```

### Test 3: Matrix Integration
```bash
1. Create a new room in CIA Web
2. Check database:
   docker exec cia-postgres psql -U ciauser -d cia_analytics \
     -c "SELECT cia_room_id, matrix_room_id FROM matrix_room_mappings;"
3. ✅ Should see mapping for the new room
4. Send message in CIA Web
5. Check Matrix client (Element)
6. ✅ Message should appear in corresponding Matrix room
```

---

## Database Schema

### Rooms Table
```sql
rooms (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255),
  room_type VARCHAR(50), -- 'main', 'breakout', 'dm'
  is_public BOOLEAN,
  created_at TIMESTAMPTZ
)
```

### Matrix Mappings
```sql
matrix_room_mappings (
  id UUID PRIMARY KEY,
  cia_room_id VARCHAR(255) UNIQUE,
  matrix_room_id VARCHAR(255) UNIQUE,
  matrix_alias VARCHAR(255),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) DEFAULT 'active'
)
```

### Chat Messages (Y.js Persistence)
```sql
chat_messages (
  id UUID PRIMARY KEY,
  room_id VARCHAR(255), -- Links to rooms.id
  user_id UUID,
  message TEXT,
  timestamp TIMESTAMPTZ,
  matrix_event_id VARCHAR(255), -- For federation
  matrix_room_id VARCHAR(255),
  federation_source VARCHAR(50) -- 'yjs' or 'matrix'
)
```

---

## Architecture Diagram

```
User in Workspace A
    ↓
ChatTab (roomId: room-a)
    ↓
useChatTab (switchRoom('room-a'))
    ↓
textChat.setRoom('room-a')
    ↓
Y.js Array: chatMessages_room-a
    ↓
Messages sync to PostgreSQL (room_id='room-a')
    ↓
Matrix Bridge syncs to Matrix room !abc:matrix.cia-web.local
    ↓
External Matrix users see messages in !abc room
```

---

## Next Steps

### Priority 1: Room Creation Modal
**File**: Create `src/ui/react/components/panels/RightPanel/tabs/ChatTab/components/CreateRoomModal.jsx`

**Features**:
- Input for room name
- Textarea for description
- Public/Private toggle
- Submit button
- API call to create room
- Auto-switch to new room on success

### Priority 2: DM User Selector
**File**: Create `src/ui/react/components/panels/RightPanel/tabs/ChatTab/components/DMUserList.jsx`

**Features**:
- Fetch workspace/project members
- Display user list with avatars
- Click user to start DM
- Create DM room (room_type='dm', name='dm_${userId1}_${userId2}')
- Show existing DM conversations

### Priority 3: Room Management
**Features**:
- Leave room
- Room settings
- Invite members
- Room permissions

---

## Success Criteria

✅ **Implemented**:
- [x] Each room has separate message history
- [x] Auto-switch based on workspace context
- [x] Manual room switching via dropdown
- [x] Matrix rooms created per CIA room
- [x] Messages sync to correct Matrix room
- [x] Room list fetched from API
- [x] UI shows current room

⏳ **Pending**:
- [ ] Room creation UI
- [ ] DM functionality
- [ ] Room management features

---

## Files Modified

### Core Chat Logic
- ✅ `src/collaboration/communication/textChat.js` (~200 lines)
  - Added room awareness
  - Added setRoom() method
  - Added room ID tracking

### React Hook
- ✅ `src/ui/react/components/panels/RightPanel/tabs/ChatTab/hooks/useChatTab.js` (~220 lines)
  - Added room state management
  - Added room fetching
  - Added room switching
  - Added auto-switch logic

### UI Component
- ✅ `src/ui/react/components/panels/RightPanel/tabs/ChatTab/ChatTab.jsx` (~200 lines)
  - Added room selector dropdown
  - Added create room button placeholder
  - Passed room context to hook

### Backend (Already Working)
- ✅ `server/src/routes/rooms.js` - Room CRUD endpoints
- ✅ `server/src/services/matrixBridge.js` - Matrix integration
- ✅ `server/database/init.sql` - Schema with rooms and matrix_room_mappings

---

## Status: 60% Complete

**What Works**:
- ✅ Room-aware chat system
- ✅ Auto and manual room switching
- ✅ Matrix federation per room
- ✅ Message isolation per room

**What's Next**:
- ⏳ Room creation UI
- ⏳ DM user selector
- ⏳ Room management features

**Estimated Time to Complete**:
- Room creation modal: 1-2 hours
- DM functionality: 2-3 hours
- Polish and testing: 1 hour

**Total**: ~4-6 hours to full completion

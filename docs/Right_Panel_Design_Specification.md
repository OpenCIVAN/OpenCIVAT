# Right Panel Design Specification
## CIA Web - Collaborative Immersive Analytics

**Version:** 1.0  
**Date:** December 19, 2024  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Tab Structure](#tab-structure)
3. [People Tab](#people-tab)
4. [Voice Tab](#voice-tab)
5. [Rooms Tab](#rooms-tab)
6. [Chat Tab](#chat-tab)
7. [Activity Tab](#activity-tab)
8. [Notes Tab](#notes-tab)
9. [Recording Tab](#recording-tab)
10. [Settings Tab](#settings-tab)
11. [Cross-Cutting Concerns](#cross-cutting-concerns)
12. [Implementation Notes](#implementation-notes)

---

## Overview

### Purpose

The Right Panel is the **collaboration hub** of CIA Web, providing tools for communication, presence awareness, documentation, and project management. It complements the Left Panel (which focuses on data and visualization) by handling all interpersonal and organizational aspects of collaborative research.

### Design Philosophy

- **Project-Scoped**: All content is scoped to the current project
- **User-Centric**: Shows information relevant to the current user
- **Collaboration-First**: Enables real-time teamwork across desktop and VR
- **Research-Compliant**: Supports audit trails, recording, and documentation
- **Flexible**: Allows users to customize their workflow

### Settings Scope Split

| Location | Scope | Examples |
|----------|-------|----------|
| **Header** | Global / User | Account, theme, keyboard shortcuts, app preferences |
| **Right Panel Settings** | Project-specific | Project notifications, cursor settings, permissions |

---

## Tab Structure

### Tab Order and Groupings

```
┌─────────────────────────────────────┐
│  PRESENCE & LOCATION                │
│  ─────────────────────────────      │
│  👥 People     (pink)               │
│  🎤 Voice      (green)              │
│  🚪 Rooms      (purple)             │
│  ───────── divider ─────────        │
│  COMMUNICATION                      │
│  ─────────────────────────────      │
│  💬 Chat       (blue)               │
│  📊 Activity   (amber)              │
│  ───────── divider ─────────        │
│  DOCUMENTATION                      │
│  ─────────────────────────────      │
│  📝 Notes      (teal)               │
│  🎬 Recording  (red)                │
│  ───────── divider ─────────        │
│  ☰  Settings   (gray)               │  ← SlidersHorizontal icon
└─────────────────────────────────────┘
```

### Tab Configuration

```javascript
const RIGHT_PANEL_TABS = [
  { id: 'people', icon: 'users', label: 'People', color: 'pink' },
  { id: 'voice', icon: 'mic2', label: 'Voice', color: 'green' },
  { id: 'rooms', icon: 'doorOpen', label: 'Rooms', color: 'purple' },
  { id: 'chat', icon: 'messageSquare', label: 'Chat', color: 'blue' },
  { id: 'activity', icon: 'activity', label: 'Activity', color: 'amber' },
  { id: 'notes', icon: 'fileText', label: 'Notes', color: 'teal' },
  { id: 'recording', icon: 'video', label: 'Recording', color: 'red' },
  { id: 'settings', icon: 'slidersHorizontal', label: 'Settings', color: 'gray' },
];

const DIVIDERS_AFTER = ['rooms', 'activity', 'recording'];
```

### Badge Behavior

| Tab | Badge Shows |
|-----|-------------|
| People | Count of people in current room |
| Voice | Speaking indicator when in voice |
| Rooms | None |
| Chat | Unread message count (red for mentions) |
| Activity | Unread notification count (red for urgent) |
| Notes | None |
| Recording | 🔴 indicator when recording active |
| Settings | None |

---

## People Tab

### Purpose
Show who's in the project/room with presence status and enable quick actions.

### Sub-Tabs

| Sub-Tab | Shows | Use Case |
|---------|-------|----------|
| **Room** | People in current room only | Focus on immediate collaborators |
| **Breakout** | People across all breakout rooms | See where everyone is scattered |
| **Project** | All project members (online + offline) | Full roster, invite, manage |

### Presence Statuses

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| **In VR** | Purple | 🟣 | User is in a VR session |
| **In Voice** | Green | 🟢 | In voice chat (with speaking/muted indicator) |
| **Online** | Blue | 🔵 | In room, not in voice |
| **Presenting** | Yellow/Gold | 🟡 | Screen sharing or presenting mode |
| **Do Not Disturb** | Red | 🔴 | Online but blocking notifications |
| **Away** | Gray | ⚫ | Idle or offline (shows last seen) |

### Section Groupings

1. **In VR** - Users in VR sessions (with session info and join options)
2. **In Voice** - Users currently in voice chat
3. **In Room** - Users online but not in voice
4. **Away / DND** - Offline or Do Not Disturb users

### Member Row Components

```
┌──────────────────────────────────────────────────┐
│ [Status] [Avatar] [Name]              [Actions]  │
│          [Viewing: Dataset/View name]            │
│          [VR Session info if applicable]         │
└──────────────────────────────────────────────────┘
```

### Quick Actions (Hover)

| Action | Icon | Behavior |
|--------|------|----------|
| **Go to View** | MapPin | Single click = highlight, Double click = follow |
| **Message** | MessageSquare | Opens Chat tab with DM to this person |
| **Toggle Cursor** | Eye/EyeOff | Show/hide this person's cursor on your view |

### More Menu (⋮)

| Action | Visibility | Description |
|--------|------------|-------------|
| View Profile | Always | Opens profile modal |
| Copy Username | Always | Copies to clipboard |
| Invite to Voice | When not in voice | Sends voice invite |
| Invite to VR | When you're in VR | Invites them to your VR session |
| Make Presenter | Admin only | Gives them presenter status |
| Remove from Room | Admin only | Kicks from current room |
| Remove from Project | Owner only | Opens confirmation modal |

### VR Session Types

| Type | Who Can Join | UI |
|------|--------------|-----|
| **Open** | Anyone in room with dataset permissions | "Join VR" button visible |
| **Invite Only** | Only invited users | "Request Invite" button visible |
| **Closed/Solo** | No one | Shows "Private Session" label |

### People Settings (⚙️ gear)

- Show offline members toggle
- Show cursor badges toggle
- Show "viewing" status toggle
- Compact member rows toggle
- Your Status dropdown (Online, Away, DND, Presenting)

### Project Sub-Tab Additions

- **Offline section** with last seen times
- **Pending Invites section** with resend/cancel options
- **[+ Invite to Project]** button

---

## Voice Tab

### Purpose
Audio control center - manage voice settings, channels, and per-person volume.

### Key Differentiation

| Tab | Focus |
|-----|-------|
| **People** | WHO is here (presence-focused) |
| **Voice** | Audio controls (control-focused) |
| **Rooms** | WHERE to go (navigation-focused) |

### Structure

1. **Channel Selector** - Dropdown at top with current channel
2. **Your Controls** - Mute, Deafen, Leave/Join buttons + volume sliders
3. **Channel Participants** - List with per-person volume control
4. **Other Channels** - Quick navigation with participant preview
5. **Audio Devices** - Input/Output device selection

### Your Controls Section

```
┌─────────────────────────────────────────────────┐
│              YOUR CONTROLS                       │
│                                                  │
│   ┌───────┐    ┌────────┐    ┌───────┐         │
│   │  🎤   │    │   🎧   │    │  📞   │         │
│   │ Mute  │    │ Deafen │    │ Leave │         │
│   │  (M)  │    │  (D)   │    │       │         │
│   └───────┘    └────────┘    └───────┘         │
│                                                  │
│   🔊 Output ━━━━━━━━━━━●━━━━  85%               │
│   🎤 Input  ━━━━━━━●━━━━━━━━  60%               │
│                                                  │
│   [||||||||    ] ← Live input level meter       │
└─────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| M | Toggle mute |
| D | Toggle deafen |
| V | Toggle voice (join/leave) - optional |

### Voice States

1. **Disconnected** - Channel selection list with Join button
2. **Connecting** - Loading state with cancel option
3. **Connected** - Full controls visible
4. **Error** - Error message with retry and troubleshoot options

### Push-to-Talk

- **Prominent feature** in settings
- Desktop: Configurable key (default: Space)
- VR: Controller trigger/grip or wrist button
- Toggle between PTT and Voice Activity modes

### Voice Activity Indicator

- Discord-style green ring around avatar when speaking
- Live input level meter for self

### Per-Participant Controls

- Volume slider (adjust how loud they are to you)
- Speaking indicator (animated when talking)
- VR badge if they're in VR
- Right-click menu: Mute for me, View profile, Message

### Voice-Only Channels

- Can create voice channels without full breakout rooms
- Types: Temporary (auto-delete when empty) or Persistent
- Created from Voice tab dropdown or Rooms tab

### Voice Settings (⚙️)

**Behavior:**
- Mute on join
- Push-to-talk mode + key selection
- Auto-join last channel

**Audio Processing:**
- Echo cancellation
- Noise suppression
- Auto gain control

**Notifications:**
- Sound when someone joins/leaves
- Sound for speaking start

**VR Audio:**
- Enable spatial audio
- Voice distance falloff
- Positional audio in VR

### Bottom Bar Integration

```
┌──────────────────────────────────────┐
│ 🎤 Main Room (3)  [🔇] [🎧] [📞]    │
└──────────────────────────────────────┘
```

Clicking channel name opens Voice tab.

---

## Rooms Tab

### Purpose
Spatial organization - manage where work happens (workspaces, breakout rooms, VR sessions).

### Room Types

| Type | Description | Voice |
|------|-------------|-------|
| **Main Room** | Default workspace, always exists | Has main voice channel |
| **Breakout Room** | Separate workspace with own canvas | Has dedicated voice channel |
| **Voice-Only Channel** | Audio channel without workspace | No workspace, just audio |
| **VR Session** | Created when someone enters VR | Has spatial voice |

### Structure

1. **Current Location Indicator** - Shows your room + voice channel
2. **Workspaces Section** - Main room + breakout rooms
3. **Voice Channels Section** - Voice-only channels
4. **VR Sessions Section** - Active VR sessions (tied to workspace visibility)
5. **Quick Create Buttons** - New Breakout, Voice Channel

### Room Row Information

- Room name + participant count
- Voice channel participant count
- Non-voice viewers
- Creator and last activity
- Permission indicator (🔒 for invite-only)

### Room Actions

| Action | Description |
|--------|-------------|
| **Join Room** | Switch workspace (canvas, views, voice) |
| **Join Voice Only** | Stay in current workspace, join room's voice |
| **Peek** | Preview room without joining |
| **Copy Link** | Get shareable link |

### Room Permissions

| Type | Description |
|------|-------------|
| **Public** | Anyone in project can join |
| **Invite Only** | Must be invited or request access |
| **Hidden** | Only visible to members |

### Voice Channel Types

| Type | Behavior |
|------|----------|
| **Temporary** | Auto-deletes when empty for 5+ minutes |
| **Persistent** | Stays until manually deleted |

### VR Session Display

- Shows in Rooms tab for visibility
- Tied to workspace - only visible to those in same workspace
- Shows: Host, Dataset, Mode (Isolation/Subset), Access type
- Actions: Join VR, Watch Stream, Request to Join

### Create Breakout Room

Fields:
- Room Name
- Access (Public / Invite Only / Hidden)
- Options: Create voice channel, Copy current layout, Invite selected people

### Create Voice Channel

Fields:
- Channel Name
- Type (Temporary / Persistent)

### Peek Feature

- Opens preview of room's canvas without fully joining
- Shows: Thumbnail, participants, active views
- Actions: Join Room, Join Voice Only, Close Peek

### Room Switching Behavior

**Full Join:**
- Workspace canvas changes
- See room's shared views
- Voice switches to room's channel
- Presence moves to new room
- Cursor appears in new room

**Voice Only Join:**
- Voice moves to that channel
- Workspace stays the same
- Presence shows in current room
- Badge shows "Voice: [Other Room]"

### Cross-Room Awareness

- Subscribe to rooms for activity notifications
- Configurable notification types per subscription
- Feeds into Activity tab

### Room Data Persistence

- Rooms archive after configurable inactivity period
- Archived rooms preserve data, can be restored
- Never truly delete (research compliance)

### Room Settings (⚙️)

- Auto-join voice when entering room
- Show room previews on hover
- Confirm before switching rooms
- Notification preferences for rooms
- Auto-delete empty temp voice channels timing

---

## Chat Tab

### Purpose
Project/Room/DM messaging with mentions, file sharing, and annotation linking.

### Sub-Tabs

| Sub-Tab | Scope | Features |
|---------|-------|----------|
| **Project** | All project members | Pinned messages, announcements |
| **Room** | Current room only | System messages, contextual |
| **Messages** | DMs | 1:1 and group conversations |

### Message Scopes

| Scope | Visibility | Persistence |
|-------|------------|-------------|
| **Project Chat** | All project members | Forever (part of project record) |
| **Room Chat** | Room members only | Archived with room |
| **DMs** | Participants only | Independent, cross-room |

### Message Components

```
┌─────────────────────────────────────────────────┐
│ [Avatar] [Sender Name]                    [⋮]   │
│                                                  │
│ [Message content with @mentions]                │
│                                                  │
│ [📍 Linked annotation] (optional)               │
│ [📎 Attachment] (optional)                      │
│                                                  │
│ [Reactions] 😀 👍 (2)              [Timestamp]  │
└─────────────────────────────────────────────────┘
```

### Input Area

```
┌─────────────────────────────────────────────────┐
│ [📎] [@] [📍] Type a message...           [➤]  │
└─────────────────────────────────────────────────┘
```

- 📎 Attach file/image
- @ Mention someone
- 📍 Link to annotation

### Mentions

| Type | Behavior |
|------|----------|
| @person | Notify specific person |
| @everyone | Notify all in this chat |
| @here | Notify online members only |

### Annotation Linking (📍)

- Search recent annotations
- Select annotation to link
- Clicking linked annotation in chat navigates to it
- Can create new annotation from link dialog

### System Messages

**Session Events:**
- Session started/ended
- Recording started/stopped

**People:**
- Joined/left room
- Entered/exited VR

**Annotations:**
- Created, edited, deleted annotations

**Data:**
- Dataset loaded
- View created

**Verbosity:** Standard by default, user-configurable (Minimal/Standard/Verbose)

### File Sharing

- Upload from computer
- Attach from project files
- Quick actions: Screenshot (canvas), Current View link

### More Menu on Messages

| Action | Description |
|--------|-------------|
| Reply | Start thread (future/Matrix) |
| React | Add emoji reaction |
| Copy Text | Copy message content |
| Pin | Pin to top (Project chat, admins only) |
| Edit | Edit your own message |
| Delete | Delete your own message (soft delete) |
| Report | Flag inappropriate content |

### DM Features

- Conversation list with unread indicators
- Group DMs (up to 8 people)
- Shows online status and current location
- New Message flow with people selector

### Cross-Room Chat

- Room sub-tab has dropdown to view other rooms' chat
- Can SEND to rooms you're not currently in (async communication)

### Message Deletion

**Soft Delete (Compliance):**
- Users see "This message was deleted"
- Original message stored in DB with deletion metadata
- Admins can view in audit log
- Export includes deleted messages (marked as deleted)

### Chat Settings (⚙️)

**Notifications:**
- Project/Room/DM message notifications
- Mentions only option
- Sound and desktop notifications

**Display:**
- Show system messages
- System message verbosity
- Compact message view
- Show timestamps
- Show read receipts

**Behavior:**
- Enter sends message
- Show typing indicators

### Export

- Chat history exportable for compliance
- Includes: Messages, attachments, deleted messages (marked)

---

## Activity Tab

### Purpose
Personalized notification feed - catch up on what you missed, stay aware of important events.

### Sub-Tabs

| Sub-Tab | Shows |
|---------|-------|
| **All** | Complete feed of relevant activities |
| **Mentions** | Only @mentions and direct notifications |
| **Following** | Activity from subscribed rooms/people |

### Activity Event Categories

**💬 Mentions & Messages:**
- @mentioned in chat
- Direct message received
- Reply to your message
- Reaction to your message

**📍 Annotations:**
- New annotation in subscribed room
- Tagged in annotation
- Your annotation was edited/commented

**🚪 Rooms & Invitations:**
- Invited to room
- Room access request (if admin)
- New room created
- Room archived

**👥 People:**
- Someone joined/left subscribed room
- New project member
- Followed person came online

**🥽 VR Sessions:**
- Open VR session started
- Invited to VR session
- VR session ended

**📂 Data & Views:**
- New dataset added
- Dataset processed
- View shared with you

**🎬 Recordings:**
- Recording started in your room
- Recording you participated in is ready
- Recording shared with you

**🔔 System:**
- Project settings changed
- Your permissions changed
- Scheduled maintenance

### Activity Item Structure

```
┌─────────────────────────────────────────────────┐
│ [Icon] [Title]                            [•]   │  ← Unread indicator
│ [Subtitle / Context]                            │
│ [Preview / Quote] (optional)                    │
│ [Timestamp]                        [Actions]    │
└─────────────────────────────────────────────────┘
```

### Actions by Event Type

| Event Type | Primary Action | Secondary Actions |
|------------|---------------|-------------------|
| Mention in chat | View | Reply, Mark read |
| Direct message | View | Reply, Mark read |
| Room invitation | Accept | Decline, View room |
| VR session invite | Join VR | Watch stream, Decline |
| New annotation | View | Mark read |
| Recording ready | Play | Download, Share |

### Priority Levels

| Priority | Events | Badge Color |
|----------|--------|-------------|
| **Urgent** | Mentions, direct invitations | Red |
| **Normal** | Everything else | Default |

### Catch-Up Mode

When returning after being offline:
- Summary card showing count by type
- Quick filters: View Mentions First, Show All
- Priority filtering buttons

### Activity Grouping

- Similar events grouped (e.g., "5 new annotations")
- Configurable threshold (default: 3 items)
- Expandable to see individual items

### Subscription Management

**Rooms:**
- Select which rooms to follow
- Configure notification types per room

**People:**
- Follow specific people for online notifications

**Notification Types:**
- People joining/leaving
- New annotations
- Dataset changes
- Chat messages (summary or all)
- VR sessions
- Recordings

### Activity Settings (⚙️)

**What to Show:**
- Toggle each event category

**Grouping:**
- Enable/disable grouping
- Group threshold

**Retention:**
- Keep activity for X days

**Sounds:**
- Sound for mentions
- Sound for invitations
- Sound for other activities

### Export

- Activity logs exportable for compliance

---

## Notes Tab

### Purpose
Documentation, task tracking, and knowledge sharing with rich text, checklists, and collaboration.

### Sub-Tabs

| Sub-Tab | Scope |
|---------|-------|
| **Project** | Visible to all project members |
| **Room** | Visible to room members only |
| **Personal** | Only visible to you |

### Note Types

| Type | Description | Use Case |
|------|-------------|----------|
| **📝 Standard** | Rich text content | Observations, documentation |
| **☑ Checklist** | To-do items with checkboxes | Task lists, objectives |
| **📍 Anchored** | Linked to annotation/view | Contextual observations |
| **📋 Template** | Pre-defined structure | Standardized reports |

### Visibility Options

| Option | Description |
|--------|-------------|
| **Project** | All project members can see |
| **Room** | Room members only |
| **Personal** | Only you |
| **Specific People** | You choose who (with permission levels) |

### Sharing Permissions

| Level | Can Do |
|-------|--------|
| **View only** | Read the note |
| **View and edit** | Read and modify |
| **View, edit, and share** | Full access + reshare |

### Rich Text Toolbar

```
│B│I│U│S│ • │1.│ ─ │" │</>│📎│🔗│📍│
```

- Bold, Italic, Underline, Strikethrough
- Bullet list, Numbered list
- Horizontal rule, Quote, Code block
- Attach file, Insert link, Link to annotation

### Checklist Features

- Items with checkboxes
- Assignees per item (with @mention)
- Progress tracking (X/Y complete)
- Progress bar visualization
- Notifications when assigned
- Activity shows who completed what

### Anchored Notes

- Linked to specific annotation or view
- Shows thumbnail of linked location
- "Go to Location" button
- Spatial context preserved

### Note Card Display

- Title
- Author + timestamp
- Scope indicator (Project/Room/Personal/Shared)
- Linked indicator (📍) if anchored
- Checklist progress if checklist type

### Note Comments

- Threaded comments on notes
- Reply chains
- Real-time updates

### Real-Time Collaboration

- Google Docs style simultaneous editing
- Show who's currently editing
- Cursor positions of collaborators
- Conflict resolution via Y.js

### Templates

**Project Templates:**
- Created by admins for this project
- Examples: Analysis Report, Weekly Summary, Case Review

**Standard Templates:**
- Built-in templates
- Examples: Meeting Notes, Research Protocol, Experiment Log

**Custom Templates:**
- Users can create and save their own

### Note Filters

**Type Filter:**
- All Types, Standard Notes, Checklists, Anchored Notes, Pinned Only

**Author Filter:**
- Anyone, Me, [Specific person]

**Sort By:**
- Last Updated, Created Date, Alphabetical

### Version History

- Track all edits for compliance
- View any previous version
- Compare versions
- Restore selected version

### Note Actions (⋮ Menu)

| Action | Availability | Description |
|--------|--------------|-------------|
| Edit | Owner or edit permission | Edit content |
| Pin/Unpin | Owner or admin | Pin to top |
| Share | Owner | Change sharing |
| Duplicate | Always | Create copy |
| Link to Annotation | Always | Add spatial anchor |
| Export | Always | Download as PDF/Markdown |
| Copy Link | Always | Shareable link |
| View History | Owner or admin | See edits |
| Delete | Owner or admin | Soft delete |

### Search

- **Global search** across all scopes
- Search by title, content, author, tags

### Notes Settings (⚙️)

**Default Settings:**
- Default scope for new notes
- Default note type

**Display:**
- Show note previews
- Preview length
- Show timestamps
- Show author avatars

**Notifications:**
- Notify on comments
- Notify on checklist assignment
- Notify on note shared with me

**Editor:**
- Auto-save drafts
- Spell check
- Markdown shortcuts

### Export

**Formats:**
- PDF
- Markdown (.md)
- HTML
- JSON (for backup/import)

**Options:**
- Include comments
- Include version history
- Include linked annotations
- Include embedded images

---

## Recording Tab

### Purpose
Capture sessions for compliance, documentation, training, and review.

### Sub-Tabs

| Sub-Tab | Purpose |
|---------|---------|
| **Controls** | Start/stop recording, configure options |
| **Past Recordings** | Browse and playback recordings |

### Recording Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Full Session** | Entire workspace grid | Complete documentation |
| **Isolation** | Single focused instance | Presentations, training |
| **Subset** | Selected instances only | Specific comparisons |

### Capture Options

| Stream | Description |
|--------|-------------|
| **Video** | Viewport capture (configurable resolution/fps) |
| **Voice Audio** | All participants or individual |
| **Events (Y.js)** | View changes, annotations, cursors |
| **Chat** | Room chat messages |

### Recording States

1. **Not Recording** - Ready state with configuration options
2. **Recording Active** - Live status with pause/stop controls
3. **Paused** - Recording paused, can resume
4. **Processing** - After stop, preparing recording

### Recording Metadata

- Recording name (optional, auto-generated if blank)
- Description
- Tags

### Live Recording Display

- Duration counter
- Live status per stream (Video, Audio, Events, Chat)
- Total size estimate
- Participants list (with join times)
- Markers section

### Markers

- Timestamped notes during recording
- Types: General (📍), Key moment (⭐), Question (❓), Issue (⚠️)
- Keyboard shortcut: M
- Quick add with auto-timestamp

### Past Recordings List

- Search and filter (by room, time, tags)
- Date groupings
- Recording card shows: Name, duration, room, mode, participants, date, tags, marker count
- Actions: Play, View Details

### Recording Details View

- Video preview with playback controls
- Timeline with marker indicators
- Details: Duration, date, room, mode, size, owner
- Captured streams list
- Participants with join times
- Markers list with jump-to buttons
- Description
- Actions: Play, Share, Download, Delete

### Playback Options

| Option | Description |
|--------|-------------|
| **In-Panel Player** | Watch in the panel (small view) |
| **Full Player** | Dedicated player window |
| **Replay Mode** | Reconstruct session on canvas using Y.js events |

### Replay Mode Features

- Scrub through timeline
- Playback speed control (0.5x, 1x, 2x)
- Event log showing actions
- Toggle cursor visibility per participant
- Show annotations as created vs all from start

### Recording Comments/Annotations

- Viewers can add timestamped comments (like YouTube)
- Discussion on specific moments
- Visible during playback

### Share Recording

**Share With:**
- Project members (all)
- Specific people
- Anyone with link

**Permissions:**
- Can view
- Can download
- Can add markers/comments

**Options:**
- What to share: Video, Audio, Chat transcript, Event log
- Link expiration

### Export Recording

**Video Format:**
- MP4 (H.264) - Best compatibility
- WebM (VP9) - Smaller size
- Original (raw) - Highest quality

**Resolution:**
- Original, 720p, 480p

**Include:**
- Video with audio
- Separate audio track (.mp3)
- Chat transcript (.txt)
- Event log (.json)
- Markers (.srt subtitles)

### Storage Management

- Usage indicator (used / limit)
- Breakdown by type (video, audio, events)
- List recordings by size
- Select for delete/archive
- Auto-archive policy configuration

### Recording Consent

- Notification to all participants when recording starts
- Shows what will be recorded
- Options: Leave Room, OK Continue
- Configurable: require explicit consent (optional)

### Permissions

- Configurable per-project who can start recordings
- Allow simultaneous recordings from multiple users

### Recording Settings (⚙️)

**Default Capture Options:**
- Default mode
- Default resolution
- Default frame rate
- Always capture toggles

**Privacy:**
- Show recording indicator to all
- Notify participants when recording starts
- Allow recording without notification (admin only)

**Storage:**
- Auto-archive after X days
- Delete archived after X time
- Storage limit

**Keyboard Shortcuts:**
- Start/Stop recording
- Add marker
- Pause/Resume

### Header Indicator

When recording active, show in header/status bar:
```
🔴 Recording · 00:15:32  [⏹]
```

Visible to all in room. Click opens Recording tab.

---

## Settings Tab

### Purpose
Project-specific settings and preferences (complements global settings in header).

### Icon

**SlidersHorizontal** - Differentiates from global settings gear (⚙️)

### Sections

1. **Your Preferences** - Personal settings for this project
2. **Project Information** - View-only info (visible to all)
3. **Admin Settings** - Management options (admins only)
4. **Danger Zone** - Destructive actions (owner only)

### Your Preferences

#### Notifications for This Project

- Mentions, DMs, room invitations, VR invitations, checklist assignments
- Subscribed room notifications
- Delivery method: In-app, email digest, push, sound
- Quiet hours

#### Default Room on Join

- Start in: Main Room / Last room / Specific room
- Auto-join voice: Always / Ask / Never
- Remember state: Layout, view configurations, open panels

#### Cursor & Presence

**Your Cursor:**
- Show to others
- Color
- Show name with cursor

**Others' Cursors:**
- Show other cursors
- Size
- Fade distant
- Show trails

**Presence:**
- Show what you're viewing
- Show when typing
- Show status changes

**VR Presence:**
- Show avatar
- Avatar style
- Show controller positions

#### Display Preferences

- Default left/right panel tabs
- Remember panel sizes
- Canvas: grid lines, instance borders, animation speed
- Information density: Compact / Comfortable / Spacious

### Project Information (View-Only)

- Project details: Name, description, created date, owner, your role
- Members list with count
- Datasets list with count and sizes
- Storage usage breakdown

### Admin Settings

#### Member Management

- Search members
- Grouped by role: Owners, Admins, Members
- Pending invites with resend/cancel
- Add member via invite modal
- Member actions: Change role, view activity, message, remove

#### Invite Member Modal

- Email addresses (multiple)
- Role selection: Admin / Member / Viewer
- Optional message

#### Roles & Permissions

**Built-in Roles:**

| Role | Key Permissions |
|------|-----------------|
| **Owner** | Full control, delete project, transfer ownership |
| **Admin** | Manage members, roles, rooms, settings, recordings |
| **Member** | View/edit datasets, create content, join rooms |
| **Viewer** | View only, join rooms and voice |

**Custom Permissions:**
- Override defaults per role
- Content permissions (datasets, annotations, notes)
- Collaboration permissions (rooms, recordings, voice)
- VR permissions (sessions, hosting)

#### Recording Policy

- Who can record (Owner+Admins / Admins+Members / Anyone)
- Consent requirements
- Required capture types
- Retention periods (minimum, auto-archive, auto-delete)
- Storage limits

#### Room Defaults

- Default access for new rooms
- Auto-create voice channel
- Default canvas size
- Main room defaults (datasets, layout, welcome message)
- Room archival policy

#### Integrations

- Connected services (Slack, Google Drive, REDCap)
- Webhooks
- API access (project API key)

### Danger Zone (Owner Only)

#### Archive Project
- Members lose access
- Data preserved
- Can be restored

#### Transfer Ownership
- Transfer to another admin
- You become admin

#### Delete Project
- Permanent deletion
- Type project name to confirm
- Shows what will be deleted

### Link to Global Settings

- Button to open header settings
- Explains scope difference

---

## Cross-Cutting Concerns

### Soft Delete Policy

All deletable content uses soft delete for compliance:
- User sees "deleted" state
- Database retains full record with deletion metadata
- Admins can view in audit log
- Exports include deleted items (marked)
- Configurable purge after retention period

### Export for Compliance

Exportable content:
- Chat logs
- Activity logs
- Notes (all versions)
- Recordings
- Annotations
- Audit logs

### Real-Time Collaboration

- Y.js for collaborative state (notes, presence, cursors)
- PostgreSQL as source of truth for persistent data
- WebSocket for real-time updates

### Notification System

**Delivery Methods:**
- In-app (Activity tab + badges)
- Push notifications
- Email digests

**Priority Levels:**
- Urgent (mentions, invitations) - immediate
- Normal - batched/quiet

### VR Considerations

- VR sessions visible in People and Rooms tabs
- Spatial audio in voice for VR users
- Push-to-talk via controller/gesture
- Wrist menu for controls when in VR

### Accessibility

- Keyboard navigation
- Screen reader support
- Configurable information density
- Sound notifications with visual alternatives

---

## Implementation Notes

### File Structure

```
src/ui/react/components/panels/RightPanel/
├── index.jsx                    # Main panel component
├── RightPanel.scss              # Panel styles
├── RightPanelContext.jsx        # Shared state
├── RightActivityBar.jsx         # Activity bar icons
├── RightPanelContent.jsx        # Content renderer
├── tabs/
│   ├── PeopleTab/
│   │   ├── index.jsx
│   │   ├── PeopleTab.scss
│   │   ├── MemberRow.jsx
│   │   ├── PresenceStatus.jsx
│   │   └── VRSessionCard.jsx
│   ├── VoiceTab/
│   │   ├── index.jsx
│   │   ├── VoiceTab.scss
│   │   ├── VoiceControls.jsx
│   │   ├── ChannelSelector.jsx
│   │   └── ParticipantRow.jsx
│   ├── RoomsTab/
│   │   ├── index.jsx
│   │   ├── RoomsTab.scss
│   │   ├── RoomCard.jsx
│   │   ├── VoiceChannelCard.jsx
│   │   └── VRSessionCard.jsx
│   ├── ChatTab/
│   │   ├── index.jsx
│   │   ├── ChatTab.scss
│   │   ├── MessageBubble.jsx
│   │   ├── ChatInput.jsx
│   │   ├── ConversationList.jsx
│   │   └── SystemMessage.jsx
│   ├── ActivityTab/
│   │   ├── index.jsx
│   │   ├── ActivityTab.scss
│   │   ├── ActivityItem.jsx
│   │   ├── ActivityGroup.jsx
│   │   └── CatchUpCard.jsx
│   ├── NotesTab/
│   │   ├── index.jsx
│   │   ├── NotesTab.scss
│   │   ├── NoteCard.jsx
│   │   ├── NoteEditor.jsx
│   │   ├── ChecklistNote.jsx
│   │   └── TemplateSelector.jsx
│   ├── RecordingTab/
│   │   ├── index.jsx
│   │   ├── RecordingTab.scss
│   │   ├── RecordingControls.jsx
│   │   ├── RecordingCard.jsx
│   │   ├── RecordingPlayer.jsx
│   │   └── MarkerList.jsx
│   └── SettingsTab/
│       ├── index.jsx
│       ├── SettingsTab.scss
│       ├── YourPreferences.jsx
│       ├── ProjectInfo.jsx
│       ├── AdminSettings.jsx
│       ├── MemberManagement.jsx
│       ├── RolesPermissions.jsx
│       └── DangerZone.jsx
```

### Key Dependencies

- **lucide-react** - Icons
- **Y.js** - Real-time collaboration (notes, presence)
- **LiveKit** - Voice chat
- **React Hook Form** - Forms in settings
- **date-fns** - Date formatting

### State Management

- **RightPanelContext** - Active tab, panel open state
- **PresenceContext** - User presence, cursors
- **VoiceContext** - Voice state, participants
- **ChatContext** - Messages, unread counts
- **NotesContext** - Notes state, editing
- **RecordingContext** - Recording state

### CSS Architecture

- Follow existing SASS pattern with design tokens
- Co-located SCSS files per component
- BEM naming convention
- Import theme.scss for tokens
- Use ResizableSections for expandable sections

### Backend Endpoints Needed

**People:**
- GET /api/projects/:id/members
- GET /api/rooms/:id/presence
- POST /api/users/:id/follow

**Voice:**
- Existing LiveKit integration
- Voice-only channel CRUD

**Rooms:**
- GET/POST/PUT/DELETE /api/rooms
- POST /api/rooms/:id/peek
- POST /api/rooms/:id/archive

**Chat:**
- Existing Y.js chat
- GET /api/chat/conversations (DMs)
- POST /api/chat/messages

**Activity:**
- GET /api/activity
- POST /api/activity/read
- GET/POST /api/subscriptions

**Notes:**
- CRUD /api/notes
- GET /api/notes/:id/versions
- POST /api/notes/:id/comments
- GET /api/templates

**Recording:**
- Existing recording endpoints
- POST /api/recordings/:id/markers
- POST /api/recordings/:id/comments

**Settings:**
- GET/PUT /api/projects/:id/settings
- GET/PUT /api/projects/:id/permissions
- POST /api/projects/:id/invites

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 19, 2024 | Initial comprehensive specification |

---

*This document serves as the authoritative reference for Right Panel implementation. All new features must align with this specification.*

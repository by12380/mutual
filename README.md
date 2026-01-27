# Mutual - Modern Dating Web Application

A modern, mobile-first dating web application built with React, Tailwind CSS, and Supabase. Features real-time chat, swipe-based matching, and comprehensive privacy controls.

## Tech Stack

### Frontend
- **React 18** - Functional components with hooks
- **React Router v6** - Client-side routing
- **Tailwind CSS 3.4** - Utility-first styling
- **Vite 5** - Fast build tool and dev server

### Backend (Supabase)
- **PostgreSQL** - Database
- **Supabase Auth** - Email/password + OAuth authentication
- **Supabase Realtime** - Live chat and match notifications
- **Supabase Storage** - Profile photo uploads
- **Row Level Security (RLS)** - Data privacy and protection

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (or yarn/pnpm)
- **Supabase Account**: Free tier works

## Project Structure

```
mutual/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── discovery/       # Swipe/discovery components
│   │   │   ├── ProfileCard.jsx
│   │   │   └── MatchModal.jsx
│   │   └── layout/          # Layout components
│   │       ├── Layout.jsx
│   │       └── BottomNav.jsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx  # Authentication state
│   ├── hooks/               # Custom React hooks
│   │   ├── useChat.js       # Real-time chat logic
│   │   ├── useDiscovery.js  # Swipe/discovery logic
│   │   ├── useMatches.js    # Match management
│   │   └── useProfile.js    # Profile operations
│   ├── lib/                 # Utilities and clients
│   │   └── supabase.js      # Supabase client setup
│   ├── pages/               # Page components
│   │   ├── Chat.jsx         # 1-to-1 chat
│   │   ├── Discover.jsx     # Swipe interface
│   │   ├── Login.jsx        # Login page
│   │   ├── Matches.jsx      # Matches list
│   │   ├── Profile.jsx      # Profile editor
│   │   └── SignUp.jsx       # Registration
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── .env.example             # Environment variables template
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd mutual
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings > API** and copy your project URL and anon key

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Features

### Authentication
- Email/password signup and login
- OAuth ready (Google, etc.)
- Automatic profile creation on signup
- Protected routes

### Profile Management
- Name, age, gender, bio
- Up to 6 profile photos
- Interest tags (up to 10)
- Photo upload to Supabase Storage

### Discovery / Swiping
- Browse potential matches
- Like or pass on profiles
- Photo carousel navigation
- Swipe animations
- Automatic match detection

### Matching
- Mutual likes create matches
- Match notifications
- Match status tracking (pending, active, ended)

### Real-Time Chat
- 1-to-1 messaging between matches
- Real-time message delivery
- Read receipts
- Message history
- Typing indicators ready

### Privacy & Security
- Row Level Security on all tables
- Users can only see their own data
- Messages only visible to match participants
- Secure file uploads to user folders

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profile data (linked to auth.users) |
| `swipes` | Like/pass records between users |
| `matches` | Mutual likes (created automatically) |
| `messages` | Chat messages between matched users |

### Key Relationships

```
auth.users (1) ──── (1) profiles
profiles (1) ──── (*) swipes (as swiper)
profiles (1) ──── (*) swipes (as swiped)
profiles (1) ──── (*) matches (as user1 or user2)
matches (1) ──── (*) messages
```

## API Examples

### Supabase Client Setup

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication

```javascript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Profile Operations

```javascript
// Get profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update profile
const { data, error } = await supabase
  .from('profiles')
  .update({ name: 'New Name', bio: 'Updated bio' })
  .eq('id', userId);

// Upload photo
const { error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/${filename}`, file);
```

### Discovery / Swiping

```javascript
// Get profiles to swipe on (excluding already swiped)
const { data: swipedIds } = await supabase
  .from('swipes')
  .select('swiped_id')
  .eq('swiper_id', userId);

const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .not('id', 'in', `(${[userId, ...swipedIds].join(',')})`)
  .not('name', 'is', null)
  .limit(20);

// Record a swipe (match created automatically by trigger)
const { error } = await supabase
  .from('swipes')
  .insert({
    swiper_id: userId,
    swiped_id: targetUserId,
    direction: 'like', // or 'pass'
  });
```

### Matches

```javascript
// Get user's matches
const { data: matches } = await supabase
  .from('matches')
  .select('*')
  .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
  .order('updated_at', { ascending: false });

// Update match status
await supabase
  .from('matches')
  .update({ status: 'active' })
  .eq('id', matchId);
```

### Real-Time Chat

```javascript
// Send message
const { data, error } = await supabase
  .from('messages')
  .insert({
    match_id: matchId,
    sender_id: userId,
    content: 'Hello!',
  });

// Subscribe to new messages
const subscription = supabase
  .channel(`messages:${matchId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();

// Mark messages as read
await supabase
  .from('messages')
  .update({ read_at: new Date().toISOString() })
  .eq('match_id', matchId)
  .neq('sender_id', userId)
  .is('read_at', null);
```

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | All authenticated | Own only | Own only | Own only |
| swipes | Own swipes | As swiper | None | None |
| matches | Participant only | Participant | Participant | None |
| messages | Match participant | Match participant | Match participant | None |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## OAuth Setup (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
6. In Supabase Dashboard:
   - Go to Authentication > Providers > Google
   - Enable and add your Client ID and Secret

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Deploy dist/ folder
```

### Environment Variables

Set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` file exists with correct values
- Restart the dev server after changing `.env`

### "You are not part of this match"
- RLS policy is working correctly
- User is trying to access a match they're not part of

### Photos not uploading
- Check Supabase Storage bucket exists (`avatars`)
- Verify storage policies are applied
- Check file size (max 5MB enforced in code)

### Real-time not working
- Ensure tables are added to `supabase_realtime` publication
- Check browser console for WebSocket errors
- Verify Supabase project has Realtime enabled

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with React, Tailwind CSS, and Supabase

# Mutual

A modern dating web application where users can only chat with **one match at a time** — encouraging deeper, more intentional conversations.

## Features

- **User Authentication** — Email/password signup and login (OAuth-ready)
- **Profile Management** — Name, age, gender, bio, interests, and up to 6 photos
- **Swipe Discovery** — Like or pass on potential matches
- **Mutual Matching** — Match created when two users like each other
- **One Active Chat** — Users can only message one match at a time
- **Real-time Messaging** — Instant chat with read receipts via Supabase Realtime
- **Privacy by Default** — Row Level Security ensures users only see their own data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Routing | React Router v6 |

## Project Structure

```
mutual/
├── src/
│   ├── components/
│   │   ├── discovery/       # ProfileCard, MatchModal
│   │   └── layout/          # Layout, BottomNav
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication state
│   ├── hooks/
│   │   ├── useChat.js       # Real-time chat logic
│   │   ├── useDiscovery.js  # Swipe/discovery logic
│   │   ├── useMatches.js    # Match management
│   │   └── useProfile.js    # Profile CRUD
│   ├── lib/
│   │   └── supabase.js      # Supabase client
│   ├── pages/
│   │   ├── Chat.jsx         # 1-to-1 messaging
│   │   ├── Discover.jsx     # Swipe interface
│   │   ├── Login.jsx        # Sign in
│   │   ├── Matches.jsx      # Match list
│   │   ├── Profile.jsx      # Edit profile
│   │   └── SignUp.jsx       # Create account
│   ├── App.jsx              # Routes & auth guards
│   ├── index.css            # Tailwind + custom styles
│   └── main.jsx             # Entry point
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **Supabase account** (free tier works)

## Setup Instructions

### 1. Clone and Install

```bash
cd mutual
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned

### 3. Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Run the SQL to create tables, indexes, RLS policies, and triggers

### 4. Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `avatars`
3. Set it to **Public**
4. Add the storage policies (see comments at bottom of `schema.sql`)

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase project: **Settings → API**

### 6. (Optional) Enable OAuth

To enable Google sign-in:

1. Go to **Authentication → Providers** in Supabase
2. Enable Google and add your OAuth credentials
3. Set the redirect URL to `http://localhost:3000/discover`

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profile data (linked to auth.users) |
| `swipes` | Records of likes/passes |
| `matches` | Mutual likes between two users |
| `messages` | Chat messages within matches |

### Key Constraints

- **One active chat**: `profiles.active_match_id` tracks the user's current conversation
- **Match uniqueness**: `user1_id < user2_id` constraint prevents duplicate matches
- **Swipe uniqueness**: Users can only swipe once per person

### Row Level Security

All tables have RLS enabled:

- Users can only read/write their own profile
- Users can only see matches they're part of
- Messages are only visible within user's matches
- Swipes are private to the swiper

## API Examples

### Supabase Client Usage

```javascript
import { supabase } from './lib/supabase';

// Fetch user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Record a swipe
await supabase.from('swipes').insert({
  swiper_id: currentUserId,
  swiped_id: targetUserId,
  direction: 'like', // or 'pass'
});

// Send a message
await supabase.from('messages').insert({
  match_id: matchId,
  sender_id: currentUserId,
  content: 'Hello!',
});

// Subscribe to new messages (real-time)
supabase
  .channel(`messages:${matchId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `match_id=eq.${matchId}`,
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Production Deployment

1. Build the app: `npm run build`
2. Deploy the `dist/` folder to any static host (Vercel, Netlify, etc.)
3. Set environment variables on your hosting platform
4. Update Supabase Auth redirect URLs for your production domain

## License

MIT

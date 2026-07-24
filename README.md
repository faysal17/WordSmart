# WordSmart - Active Recall & Spaced Repetition (SM-2) Vocabulary Trainer

WordSmart is a modern web application for mastering vocabulary using **active recall** and the **SuperMemo-2 (SM-2)** spaced repetition algorithm. It parses vocabulary data directly from `wordsmart_vocabulary_chunks.csv` and syncs user learning progress with a cloud backend (Supabase).

---

## Features

- 🧠 **Active Recall Flashcards**: Modern glassmorphic 3D flip card displaying word, audio pronunciation (SpeechSynthesis), part of speech, definition, and chunk indicator.
- 📈 **SuperMemo-2 (SM-2) Engine**: Instant calculation of interval, ease factor, and repetition count based on **Hard** (Grade 2), **Good** (Grade 4), and **Easy** (Grade 5) responses.
- 🎯 **Chunk Filtering**: Filter cards by chunk (Chunk 1, Chunk 2, etc.) or study all 792 vocabulary words together.
- ☁️ **Cloud Synchronization & Auth (Supabase BaaS)**: Real-time progress database sync tied to user accounts with row-level security.
- 📊 **Progress Dashboard**: Track due cards today, mastered words count, learning queue, and active streaks.
- 🔊 **Text-To-Speech Pronunciation**: Built-in voice synthesis for native word audio playback.

---

## Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18 or later) installed on your system.

### 2. Installation
Open your terminal in the project folder and run:

```bash
npm install
```

### 3. CSV File Location
Ensure `wordsmart_vocabulary_chunks.csv` is located in the `public/` directory (or workspace root).

---

## Setting Up Supabase Backend (Cloud Sync & Auth)

To enable cloud authentication and sync across devices:

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and name it `WordSmart`.

### Step 2: Create the Database Table
In your Supabase project dashboard, navigate to the **SQL Editor** tab, paste the following SQL query, and click **Run**:

```sql
-- 1. Create table for storing user SRS flashcard progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  repetitions INT DEFAULT 0,
  interval INT DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  last_reviewed_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'new',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for authenticated user access
CREATE POLICY "Users can manage their own vocabulary progress" 
ON public.user_progress
FOR ALL 
USING (auth.uid() = user_id);
```

### Step 3: Add API Keys to `.env`
1. In your Supabase Dashboard, go to **Project Settings -> API**.
2. Copy your **Project URL** and **`anon` public API key**.
3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

---

## Running the Application Locally

Start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deploying to Hosting (Vercel or Netlify)

### Option A: Deploy to Vercel
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

### Option B: Deploy to Netlify
1. Log in to [Netlify](https://netlify.com) and select **Add new site -> Import an existing project**.
2. Connect your Git repository.
3. Set build command to `npm run build` and publish directory to `dist`.
4. In **Site Configuration -> Environment Variables**, add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy Site**.

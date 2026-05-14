# Studymate AI — Smart Learning Platform

An AI-powered study assistant that helps students learn faster by transforming study materials into summaries, quizzes, and interactive chat.

## Features

- 📄 **Document Upload** — Upload PDFs, Word docs, and images
- 🤖 **AI Chat** — Ask questions about your study material
- 📝 **Quiz Generator** — Auto-generate quizzes from your notes
- 📊 **Summarizer** — Get comprehensive summaries instantly
- 🎙️ **Voice Mode** — Study hands-free with voice interaction
- 🖼️ **Image OCR** — Extract text from images and screenshots
- 🌙 **Dark Mode** — Easy on the eyes during late night study sessions

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI:** Google Gemini 2.0 Flash + Imagen 3
- **TTS:** ElevenLabs + Kokoro
- **Hosting:** Vercel

## Getting Started

### Prerequisites
- Node.js & npm installed
- Supabase project set up
- Google Gemini API key

### Installation

```sh
# Step 1: Clone the repository
git clone https://github.com/Mutalib627/Studymate-AI-.git

# Step 2: Navigate to the project directory
cd Studymate-AI-

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Supabase Edge Function Secrets

Add these secrets in your Supabase dashboard under Edge Functions → Secrets:

```
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key (optional)
```

## Deployment

This app is deployed on **Vercel**. Any push to the main branch triggers an automatic redeployment.

## Created By

Built by **Abdulmutalib Salisu**

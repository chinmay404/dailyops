# Daily Ops — Your Daily System

A brutal, no-fluff daily tracker. Deploy once, use forever.

## Features
- ✅ Daily task ticks with auto-reset at midnight
- ❌ Yesterday's failures shown at the top (brutal honesty)
- 📝 Notes per task — log what actually happened
- 📊 Weekly score bar chart
- 🔥 30-day heatmap calendar
- ✏️ Custom tasks — add/edit/delete anything
- 🔔 Browser push notifications (set your reminder time)
- 📱 PWA — installs on your phone like a native app

## Deploy to Vercel (5 minutes)

### Option 1: GitHub → Vercel (recommended)
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Vercel auto-detects Next.js — just hit Deploy
4. Done. You get a URL like `https://dailyops-xyz.vercel.app`

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel
```
Follow the prompts. Done in 2 mins.

## Install on Phone
1. Open your Vercel URL in Chrome (Android) or Safari (iOS)
2. Android: Menu → "Add to Home Screen"
3. iOS: Share → "Add to Home Screen"
4. It opens like a native app, no browser chrome

## Notifications
- Go to Settings tab in the app
- Set your daily reminder time
- Hit "Enable Notifications"
- Works only in Chrome/Edge (not Safari on iOS — Apple limitation)

## Local Dev
```bash
npm install
npm run dev
```
Open http://localhost:3000

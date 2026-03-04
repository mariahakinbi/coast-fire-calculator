# 🔥 Coast FIRE Calculator

A compass for your retirement journey. Find out when you can stop contributing to retirement and let compound growth do the rest.

All values in today's dollars. Uses real (inflation-adjusted) returns for realistic projections.

## Features

- **Coast FIRE Age** — when you can stop contributing
- **Two projection paths** — coast vs keep investing
- **Drawdown simulation** — how long your money lasts to age 100
- **Interactive chart** — full portfolio lifecycle visualization
- **Year-by-year table** — detailed breakdown with status indicators
- **Shortfall guidance** — tells you exactly how much more to save

## Deploy to Vercel (Recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign up (free)
3. Click "New Project" → Import your GitHub repo
4. Vercel auto-detects Vite — just click "Deploy"
5. You'll get a URL like `coast-fire-calculator.vercel.app`

**Or use the Vercel CLI:**
```bash
npm install -g vercel
cd coast-fire-app
vercel
```

## Deploy to Netlify

1. Push this folder to a GitHub repository
2. Go to [netlify.com](https://netlify.com) and sign up (free)
3. Click "Add new site" → Import from Git → Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Click "Deploy"

## Run Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Custom Domain

Both Vercel and Netlify support custom domains for free:
- Vercel: Settings → Domains → Add your domain
- Netlify: Domain settings → Add custom domain

## Analytics Setup (Google Analytics 4)

1. Go to [analytics.google.com](https://analytics.google.com)
2. Create a new GA4 property
3. Get your Measurement ID (looks like `G-XXXXXXXXXX`)
4. Replace `G-XXXXXXXXXX` in `index.html` (two places) with your ID
5. Deploy — analytics will start tracking immediately

### Events you'll see in GA4:

| Event | What it captures |
|-------|-----------------|
| `calc_inputs` | User's final inputs after 5s idle (age, balance range, retire age, spending, return %, etc.) |
| `calc_inputs_tab` | Inputs captured when user switches tabs (high-intent signal) |
| `tab_view` | Which tab they viewed (Results / Chart / Table) |
| `feedback_vote` | Thumbs up/down rating |
| `feedback_suggestion` | Feature suggestions from users |
| `toggle_whatis` | Opened "What is Coast FIRE?" |
| `toggle_howitworks` | Opened "How it works" section |

### Viewing the data:

- **Real-time**: GA4 → Reports → Realtime (see live users)
- **User inputs**: GA4 → Explore → Create exploration → Add `calc_inputs` event parameters
- **Audience profile**: GA4 → Reports → User attributes (device, location, etc.)
- **Feedback**: GA4 → Explore → Filter by `feedback_vote` and `feedback_suggestion` events

Each user gets an anonymous `client_id` cookie, so you can see individual sessions and their inputs without any personal data.

## Tech Stack

- React 18
- Vite 5
- Recharts (charts)
- No CSS framework — custom inline styles

## Disclaimer

🧭 This calculator is a compass, not a GPS. It provides directional guidance for retirement planning. It does not model taxes, Social Security, pensions, or portfolio allocation changes over time. For precise financial planning, consult a certified financial planner (CFP).

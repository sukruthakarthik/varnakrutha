# Testing locally

How to run the site on your own computer and check changes before deploying. For hosting, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 1. One-time setup

1. **Install Node.js.** Get the **LTS** version from [nodejs.org](https://nodejs.org), then close and reopen VS Code. Check it worked:

   ```bash
   node -v
   ```

2. **Install the project's packages.** Run this again whenever `package.json` changes:

   ```bash
   npm install
   ```

3. **Create `.env.local`** (skip if it already exists):

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local`:

   | Variable | Set it to |
   | --- | --- |
   | `NEXT_PUBLIC_DATA_SOURCE` | `mock` |
   | `ADMIN_PASSWORD` | Any password, 8 or more characters, used to sign in to `/admin` |
   | `ADMIN_SESSION_SECRET` | A random string; generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

   > Real passwords and keys go in `.env.local` only. Git ignores it. Never put them in `.env.example`, which is committed and pushed.

4. **Generate the sample artwork images:**

   ```bash
   npm run placeholders
   ```

---

## 2. Start the site

```bash
npm run dev
```

Open <http://localhost:3000>. Pages reload by themselves when code changes. Press `Ctrl+C` in the terminal to stop.

### Mock mode vs. Supabase mode

| | Mock mode (`mock`) | Supabase mode (`supabase`) |
| --- | --- | --- |
| Data | Sample data from `src/data/seed.ts`, saved to `.data/db.json` | Your live database |
| Images | Saved to `public/artworks/` | Your live Supabase storage |
| Admin sign-in | `ADMIN_PASSWORD` | Your Supabase email and password |
| Safe to experiment? | Yes, nothing leaves your computer | **No**, edits change the live site |

Use mock mode for everyday testing. To start over with fresh sample data, stop the server, run `npm run reset-mock-db`, then start it again.

---

## 3. What to check

### Public pages

| Page | Check |
| --- | --- |
| `/` | Hero layout on a wide window, then narrow the window to phone width; featured, categories and recent works |
| `/gallery` | Category filters, search, grid and masonry views |
| `/artworks/<slug>` | Image gallery, details, enquiry button |
| `/about` | Photo, bio, journey, inspiration, skills, techniques |
| `/contact` | Send a test message |
| `/join` | Send a test artist application |

### Admin (`/admin`)

| Page | Check |
| --- | --- |
| Dashboard | Stats add up |
| Artworks | Add, edit and delete an artwork; upload images; set the cover; mark as sold |
| Inquiries | Your test message from `/contact` appears |
| Profile | Edit the tagline (watch the 80-character counter), photo, bio and techniques; save, then check `/` and `/about` |
| Applications | Your test application from `/join` appears; try Shortlist, Accept, a note and Email |
| Reviews | Empty in mock mode (see below) |

**Mock mode limitation:** the mock admin counts as a platform admin, so profile changes publish immediately and never reach Reviews. Testing the review flow needs Supabase and a second, non-platform-admin login.

### Phone layout

In Chrome or Edge, press `F12`, then `Ctrl+Shift+M` to switch to a phone-sized view. To test on a real phone on the same Wi-Fi, open `http://<your-computer's-IP>:3000`. Find the IP with `ipconfig` (look for "IPv4 Address").

---

## 4. Before deploying

Run these and fix anything they report:

```bash
npm run typecheck   # TypeScript errors
npm run lint        # Code problems
npm run build       # Full production build; catches errors `npm run dev` misses
```

If you changed anything in `supabase/migrations/`, run the new migration files in the Supabase **SQL Editor**, oldest first, **before** deploying. Otherwise the live site will expect database columns that don't exist yet.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node` or `npm` is "not recognized" | Install Node.js LTS, then restart VS Code |
| `Port 3000 is in use` | Another `npm run dev` is still running; stop it, or open the URL the terminal shows (e.g. `:3001`) |
| Can't sign in to `/admin` | Check `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (32+ characters) in `.env.local`, then restart `npm run dev` |
| Changes to `.env.local` have no effect | Restart `npm run dev`; env files are only read at start-up |
| Sample images are missing | Run `npm run placeholders` |
| Strange or outdated data | Stop the server, run `npm run reset-mock-db`, start again |

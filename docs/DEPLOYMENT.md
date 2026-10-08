# Deployment Guide — Art By Sukrutha

Hosting stack: **Supabase** (database, image storage, admin login) + **Vercel** (website hosting).

---

## 0. Prerequisites

- A Supabase account: <https://supabase.com>
- A Vercel account: <https://vercel.com>
- Node.js. It is installed in WSL through nvm, not on Windows, so run every command below in a WSL terminal. In each new terminal, run:

  ```bash
  cd "/mnt/c/Users/sukrutha.karthik/Projects/websites/varnakrutha"
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  ```

---

## 1. Supabase setup

### 1.1 Create the project
1. On supabase.com, click **New project**.
2. Fill in the details:
   - **Name:** `artbysukrutha`
   - **Region:** Mumbai (South Asia)
   - **Database password:** create one and store it somewhere safe.
3. Wait until the project finishes provisioning.

### 1.2 Create the database schema
1. Open **SQL Editor → New query**.
2. Paste the full contents of `supabase/migrations/20260925000000_initial_schema.sql`.
3. Click **Run**. It should report **Success**.

This creates:
- the tables: `artists`, `artworks`, `artwork_images`, `inquiries` and `artist_admins`
- the security rules (Row Level Security)
- the public `artworks` storage bucket

### 1.3 Load the starting data
1. Open **SQL Editor → New query**.
2. Paste the full contents of `supabase/seed.sql`.
3. Click **Run**.

### 1.4 Create the admin user
1. Go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a strong password.
3. Tick **Auto Confirm User**.
4. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Only you need an account. Strangers who sign up can't reach admin, but there's no reason to let them create accounts.

### 1.5 Give that user admin rights for Sukrutha's gallery
In the **SQL Editor**, run this with your own email:

```sql
insert into public.artist_admins (artist_id, user_id)
select '00000000-0000-4000-8000-000000000001', id
from auth.users
where email = 'YOUR_EMAIL';
```

It should report **1 row**.

### 1.6 Copy the API details
Go to **Project Settings → API Keys** and copy:

| Value | Used as |
| --- | --- |
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> ⚠️ Never use the `service_role` or secret key in this app. It bypasses all security rules.

---

## 2. Vercel deployment (CLI, no GitHub needed)

### 2.1 Log in and link the project
```bash
npx vercel login
npx vercel link
```

Answer the prompts:

| Prompt | Answer |
| --- | --- |
| Set up? | `Y` |
| Scope | your account |
| Link to existing project? | `N` |
| Project name | `artbysukrutha` |
| Directory | `./` |
| Modify settings? | `N` |

### 2.2 Add the environment variables
Add them **before** the first deploy, because the build reads them. Each command prompts for a value.

```bash
npx vercel env add NEXT_PUBLIC_DATA_SOURCE production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add NEXT_PUBLIC_DEFAULT_ARTIST_SLUG production
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_CONTACT_EMAIL production
npx vercel env add NEXT_PUBLIC_WHATSAPP_NUMBER production
npx vercel env add CRON_SECRET production
```

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_DATA_SOURCE` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1.6 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon or publishable key from step 1.6 |
| `NEXT_PUBLIC_DEFAULT_ARTIST_SLUG` | `sukrutha` |
| `NEXT_PUBLIC_SITE_URL` | `https://artbysukrutha.vercel.app` (or your custom domain) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | An address you actually read, e.g. your Gmail. Optional: leave it out to hide the email link. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Your WhatsApp number with country code, digits only, e.g. `919876543210`. Optional: leave it out to hide the WhatsApp link. |
| `CRON_SECRET` | A random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. It protects the daily keep-alive job. |

`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are only for local mock mode. They are **not** needed on Vercel.

### 2.3 Deploy
```bash
npx vercel --prod
```

The command prints the live URL at the end.

If the URL differs from what you set in `NEXT_PUBLIC_SITE_URL`, update the variable and redeploy:

```bash
npx vercel env rm NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel --prod
```

`vercel.json` schedules a daily call to `/api/keep-alive` so the free Supabase project isn't paused for inactivity. Vercel sends `CRON_SECRET` with the call automatically.

`.vercelignore` stops local secrets (`.env.local`), mock data (`.data/`) and build folders from being uploaded.

---

## 3. Post-deployment checklist

- [ ] Home, Gallery, About and Contact pages load on desktop and mobile
- [ ] An artwork page (e.g. `/artworks/lepakshi-temple-watercolor`) loads with its images
- [ ] Gallery filters, search and the grid/masonry toggle work
- [ ] Submitting the contact form shows the success message
- [ ] `/admin/login` works with the Supabase user from step 1.4
- [ ] The test enquiry appears in **Admin → Inquiries**
- [ ] **Admin → Artworks → Add artwork** with a real image upload succeeds
- [ ] Marking an artwork Sold or Available shows up on the public site straight away
- [ ] `/sitemap.xml`, `/robots.txt` and `/privacy` load
- [ ] The WhatsApp link on the Contact page opens a chat with the artwork name pre-filled
- [ ] **Vercel → Settings → Cron Jobs** lists `/api/keep-alive`; clicking **Run** succeeds
- [ ] A link shared on WhatsApp shows a preview image and title

---

## 4. Updating the live site

After making code changes:

```bash
npx vercel --prod
```

You do **not** need to redeploy for content changes (artworks, images, availability). Admin changes appear on the live site immediately.

---

## 5. Custom domain (optional)

1. Buy the domain (e.g. `artbysukrutha.com`) from any registrar.
2. In Vercel, go to **Project → Settings → Domains → Add** and follow the DNS instructions.
3. Update the site URL and redeploy:
   ```bash
   npx vercel env rm NEXT_PUBLIC_SITE_URL production
   npx vercel env add NEXT_PUBLIC_SITE_URL production   # https://artbysukrutha.com
   npx vercel --prod
   ```

---

## 6. Troubleshooting

| Problem | Fix |
| --- | --- |
| Build fails with "NEXT_PUBLIC_SUPABASE_URL … required" | Environment variables are missing. Repeat step 2.2, then redeploy. |
| Build fails with `Artist "sukrutha" not found` | `seed.sql` wasn't run. Repeat step 1.3. |
| Page shows "Something went wrong" | Open Vercel **Deployments → latest → Logs** and check the red errors. |
| Admin shows "This account does not have admin access" | Step 1.5 didn't insert a row. Check the email and run it again. |
| Login shows "Invalid email or password" | Check that the user exists and **Auto Confirm User** was ticked (step 1.4). |
| Image upload fails | Check that the bucket `artworks` exists in **Storage** (created by step 1.2). Images are compressed in the browser before upload; if one still fails, the error names the file. HEIC photos only work in Safari, so export them as JPEG elsewhere. |
| Contact form and admin fail; Supabase dashboard shows the project as **Paused** | The free project paused after about a week with no database activity. Click **Restore project** in the dashboard. Then check that the keep-alive cron job is running (Vercel → Settings → Cron Jobs) and that `CRON_SECRET` is set. |

---

## 7. Capacity and scaling

Public pages (Home, Gallery, About, artwork pages) are **pre-built and served from Vercel's CDN**. Visitors usually don't touch the database. Supabase is only used when:
- a cached page is revalidated (at most hourly, or right after an admin change)
- someone opens the Contact page or submits an enquiry
- the admin is in use

The limits that matter are **monthly data transfer and storage**, not how many people visit at once.

> These are approximate free-tier limits and they change. Check <https://vercel.com/pricing> and <https://supabase.com/pricing>.

| Limit | Free tier (approx.) | Practical meaning |
| --- | --- | --- |
| Vercel data transfer | ~100 GB / month | At about 2 MB per visit, **~50,000 visits/month**. This is the main traffic limit. |
| Vercel image optimization | ~5,000 transformations / month | Each image is resized once per size and then cached. Fine for about 100–200 artworks. |
| Supabase storage | 1 GB | About **300–500 uploaded images** at 2–3 MB each. Likely the first limit you reach. |
| Supabase database | 500 MB | Hundreds of thousands of enquiries and artworks. |
| Supabase data transfer | ~5 GB / month | Low, because images are cached by Vercel after the first request. |
| Supabase inactivity pause | ~1 week idle | Prevented by the daily keep-alive cron. Without it, the contact form and admin stop working until you restore the project. |
| Supabase auth | 50,000 monthly users | Not a concern (one admin). |

The admin compresses every image in the browser before uploading: it is resized to 2400 px on the long edge and saved as WebP, usually 0.3–1.5 MB. That keeps uploads under Vercel's 4.5 MB request limit and fits roughly **1,000+ images** in the 1 GB free storage.

| Stage | Plan | Rough capacity |
| --- | --- | --- |
| Testing / launch | Vercel Hobby + Supabase Free ($0) | ~30k–50k visits/month, ~300–500 images |
| Selling / growing | Vercel Pro ($20/mo) + Supabase Pro ($25/mo) | 500k+ visits/month, 100 GB storage, no pausing, daily backups |
| Multi-artist platform | Pro plans + usage-based extras | Millions of visits/month; consider a dedicated image CDN |

Monitor usage in **Vercel → Usage** and **Supabase → Reports**.

---

## 8. Before going commercial

- **Vercel Hobby (free)** is for non-commercial use only. Upgrade to **Vercel Pro** once you sell through the site.
- **Supabase Free** pauses inactive projects. Consider **Supabase Pro** for a production shop.
- **Backups:** Supabase Pro includes daily backups. On Free, export periodically from **Database → Backups**, or use `pg_dump`.
- **Source control:** this folder isn't a git repository yet. Run `git init`, push to GitHub and connect it in Vercel (**Settings → Git**). Every push then deploys automatically, and you have a history to roll back to.

For multi-artist and monetization plans, see [ROADMAP.md](ROADMAP.md).

## 9. Corner cases (Instagram link-in-bio launch)

Most visitors will arrive from Instagram on a phone, inside Instagram's in-app browser.

### Before you put the link in your bio
- [ ] Delete or replace the **sample artworks** from `seed.sql`. They have made-up prices and placeholder SVG images.
- [ ] Replace the placeholder social links (`https://www.instagram.com/` etc.) in the `artists` row with your real profile URLs.
- [ ] Set `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` (step 2.2). Use an email you actually receive; a domain address such as `hello@artbysukrutha.com` only works once you own the domain and have set up mail for it.
- [ ] Replace `profile.svg` and the About text in `src/features/artists/content.ts`.
- [ ] Turn off public sign-ups in Supabase (step 1.4).
- [ ] Read the Privacy Policy (`src/app/(public)/privacy/page.tsx`) and adjust it if anything doesn't match how you handle enquiries.

### Link previews (Instagram DMs, WhatsApp)
- Artwork pages use the uploaded cover image as the preview image. Uploads are compressed automatically, but WhatsApp and Instagram can still skip previews for images over roughly 300–600 KB, so test with a real share.
- Preview images are cached by Meta and WhatsApp. If you change an image, the old preview may keep showing for days. Use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to refresh it.
- `NEXT_PUBLIC_SITE_URL` must be the exact live URL. A wrong value gives broken preview images and canonical links.

### In-app browser behaviour
- Test the whole flow (gallery → artwork → Enquire → submit) **inside the Instagram app** on Android and iPhone, not only in Chrome or Safari.
- `mailto:` links may not open a mail app from the in-app browser. The contact form and the **WhatsApp** link (shown when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set) both work there. From an artwork's Enquire button, the WhatsApp message is pre-filled with the artwork's title.
- Do the admin work in a normal browser, not inside Instagram.

### Traffic spikes (a reel takes off)
- Public pages come from Vercel's CDN, so a spike won't take the site down. The limits that matter are bandwidth and image optimisation (section 7). Watch **Vercel → Usage** after a big post.
- The contact form's rate limit is held in memory per server instance, so on Vercel it is best-effort only. The anon key is public, so a bot can also insert enquiries straight into Supabase, skipping the form. If spam starts, add a CAPTCHA (Cloudflare Turnstile is free) or a database-level limit.

### You won't be notified of enquiries
- Enquiries are only saved to **Admin → Inquiries**. Nothing emails you. Check it daily, or add email alerts (ROADMAP §2.2) before promoting the link heavily. A buyer who waits days for a reply is usually lost.

### Supabase free-tier pause
- After about 7 days without database activity, Supabase **pauses** the project. It does not wake up by itself; you must click **Restore** in the dashboard.
- While paused, cached pages still show, but the contact form, admin and any new artwork page fail.
- The daily Vercel Cron job in `vercel.json` prevents this by calling `/api/keep-alive`, which runs one read query. It needs `CRON_SECRET` set (step 2.2).

### Image uploads on Vercel
- Vercel limits a function request body to **4.5 MB**. The admin compresses each photo in your browser before uploading (resized to 2400 px, WebP, under 4 MB), so you can upload photos straight from your phone or camera.
- Compression also strips hidden metadata, including the **GPS location** that phone cameras store in photos.
- iPhone **HEIC** photos can be compressed in Safari only. In other browsers, export them as JPEG first (or set the iPhone camera to **Most Compatible**).

### Links and URLs
- Changing an artwork's **slug** breaks old links already posted in captions, stories and DMs. Keep slugs stable once shared.
- Deleting an artwork breaks its link too. Prefer marking it **Sold**.
- Use one stable link in the bio (the home page or `/gallery`). Add `?utm_source=instagram` if you later add analytics.
- A custom domain looks more trustworthy than `*.vercel.app` to buyers paying for originals.

### Privacy and legal
- The contact form stores names, emails and phone numbers, which brings it under India's DPDP Act. The site has a **Privacy Policy** at `/privacy`, linked from the form and the footer. It is a plain-language starting point, not legal advice.
- Taking sales through the site counts as commercial use, which Vercel Hobby doesn't allow (section 8).

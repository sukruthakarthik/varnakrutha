# Art By Sukrutha

An online art gallery and artist portfolio for **Sukrutha Karthik**. The architecture supports multiple artists in the future.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · ShadCN UI · TanStack Query · React Hook Form + Zod · Supabase (Postgres, Storage, Auth) · Vercel

---

## Features

| Area | What's included |
| --- | --- |
| **Home** | Hero, featured artworks, about the artist, categories, recent works, contact CTA |
| **Gallery** | Category filters, search by title/category/medium, grid and masonry views; filters are stored in the URL |
| **Artwork details** | `/artworks/[slug]`: image gallery, full details, story, purchase enquiry, related works, JSON-LD |
| **About** | Portrait, biography, journey, inspiration, skills, techniques, social links |
| **Contact** | Validated form (RHF + Zod on the client and server), honeypot, rate limiting, saved to the database; optional email and WhatsApp click-to-chat links |
| **Privacy** | `/privacy` policy page (India's DPDP Act), linked from the contact form and footer |
| **Admin** (`/admin`) | Dashboard stats; add, edit and delete artworks; set available, reserved or sold; image upload, reorder and cover selection; inquiry management |
| **SEO** | Per-page metadata, Open Graph and Twitter cards, generated OG image, `robots.txt`, `sitemap.xml` |
| **Quality** | Error boundaries, loading skeletons, empty states, WCAG-minded markup (skip link, focus rings, aria labels, AA contrast, reduced motion) |

---

## Quick start (mock data, no Supabase needed)

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and ADMIN_SESSION_SECRET
npm run placeholders         # generates sample SVG artwork images
npm run dev
```

Open <http://localhost:3000>. The admin is at <http://localhost:3000/admin/login> and uses the password from `ADMIN_PASSWORD`.

In **mock mode**:

- Data comes from `src/data/seed.ts` and is copied to `.data/db.json` on the first write. Admin edits and inquiries are saved there.
- Uploaded images go to `public/artworks/<artist>/<category>/`.
- `npm run reset-mock-db` restores the seed data.

> Mock mode is meant for local development. On Vercel the filesystem is read-only, so admin changes are lost when the server restarts. Use Supabase in production.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Public base URL, e.g. `https://artbysukrutha.com`. Used for canonical URLs, the sitemap and Open Graph |
| `NEXT_PUBLIC_DEFAULT_ARTIST_SLUG` | yes | Artist shown at the site root (`sukrutha`) |
| `NEXT_PUBLIC_DATA_SOURCE` | yes | `mock` or `supabase` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | Email shown on the Contact page and footer. Hidden when empty |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no | WhatsApp number, digits only with country code (e.g. `919876543210`). Adds a click-to-chat link; hidden when empty |
| `CRON_SECRET` | production | Random string that protects `/api/keep-alive`, the daily job that stops the free Supabase project from pausing |
| `ADMIN_PASSWORD` | mock only | Admin password, 8 or more characters |
| `ADMIN_SESSION_SECRET` | mock only | 32 or more random characters that sign the admin cookie. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase only | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase only | Anonymous public key. Row Level Security enforces access, so no service-role key is used |

---

## Adding your artworks

1. Name image files as `category-artwork-slug-main.jpg`, plus `-detail-1.jpg` and so on (e.g. `heritage-lepakshi-temple-watercolor-main.jpg`).
2. Put them in `public/artworks/sukrutha/<folder>/`. The folders are `heritage`, `temple-art`, `landscapes`, `watercolor`, `acrylic`, `sketches` and `other`.
3. Then do one of the following:
   - **Edit the seed:** update the entries in `src/data/seed.ts`, change the `.svg` extension in `seedImagePath` to `.jpg`, and run `npm run reset-mock-db`.
   - **Use the admin:** go to `/admin/artworks/new`, fill in the details and upload the images. Files are named automatically.
4. Replace `public/artists/sukrutha/profile.svg` with a real portrait and update `profileImage` in the seed.
5. Update the social links in the seed and the About page text in `src/features/artists/content.ts`.

For the best results, use JPEG or WebP images about 2000px on the long edge and under 4 MB (the upload limit, set by Vercel's 4.5 MB request cap). `next/image` generates responsive sizes and thumbnails for you.

---

## Switching to Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema by pasting `supabase/migrations/20260925000000_initial_schema.sql` into the SQL editor, or run:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. Seed the data by running `supabase/seed.sql` in the SQL editor.
4. Create an admin user under **Authentication → Users → Add user**, using email and password. Then grant that user admin rights for the artist:
   ```sql
   insert into public.artist_admins (artist_id, user_id)
   select '00000000-0000-4000-8000-000000000001', id from auth.users where email = 'you@example.com';
   ```
5. Set the environment variables:
   ```env
   NEXT_PUBLIC_DATA_SOURCE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
6. Restart the app. The admin login now asks for an email and password.

The migration creates:

- The tables `artists`, `artworks`, `artwork_images`, `inquiries` and `artist_admins`.
- Enums for category, availability and inquiry status.
- Indexes and an `updated_at` trigger.
- A public `artworks` storage bucket for JPEG, PNG and WebP files. The bucket allows 10 MB, but the app limits uploads to 4 MB.
- Row Level Security policies:
  - Anyone can read artists, artworks and images, and anyone can submit an inquiry.
  - Only admins of an artist can manage that artist's artworks and inquiries, and upload to that artist's storage folder.

---

## Deploying to Vercel

Follow [DEPLOYMENT.md](DEPLOYMENT.md). It deploys with the Vercel CLI, so GitHub isn't required. Once the project is in a GitHub repository, you can connect it in Vercel instead and every push deploys automatically.

`vercel.json` schedules a daily Vercel Cron call to `/api/keep-alive` so the free Supabase project isn't paused for inactivity.

Public pages are statically generated and revalidated every hour. Admin changes trigger on-demand revalidation, so updates appear right away.

---

## Project structure

```
src/
  app/
    (public)/            Public site: home, gallery, artworks/[slug], about, contact
    admin/               /admin/login and (dashboard)/ for protected pages
    api/keep-alive/      Daily cron route that keeps the Supabase project awake
    sitemap.ts robots.ts opengraph-image.tsx layout.tsx globals.css
  components/
    ui/                  ShadCN-style primitives (button, input, dialog, card, …)
    layout/              Site header and footer
    common/              Empty, error and section heading components, social links
  features/
    artworks/            Schemas, server actions, gallery and card components
    inquiries/           Schemas, public and admin actions, contact form
    artists/             Long-form profile content
    admin/               Admin components, auth actions, TanStack Query hooks
  services/
    types.ts             Repository interfaces (the data contract)
    mock/                JSON-file implementation
    supabase/            Supabase implementation
    index.ts             Picks the data source from NEXT_PUBLIC_DATA_SOURCE
  lib/                   env, auth, site config, constants, rate limiting, Supabase clients
  data/seed.ts           Sample artist and artworks
  types/                 Domain types
  utils/                 Formatting helpers
  middleware.ts          First-line /admin guard
supabase/                Migrations and seed SQL
scripts/                 Placeholder image generator
```

### Architecture notes

- **Swappable data layer.** Pages and actions only use the `DataSource` interfaces in `src/services/types.ts`. Switching between mock data and Supabase is a single environment variable.
- **Security.**
  - Authorisation is checked twice: middleware guards `/admin`, and every admin page and server action calls `requireAdminPage()` or `requireAdminAction()` and verifies that the record belongs to the artist.
  - Inputs are validated with Zod on the server.
  - Uploads are checked for MIME type, size and magic bytes, and file names are generated on the server.
  - Contact and login forms are rate-limited.
  - Security headers are set in `next.config.ts`.
- **Multi-artist ready.**
  - Every artwork and inquiry has an `artist_id`.
  - Admin access is granted per artist through `artist_admins`.
  - The current artist is resolved in one place, `getCurrentArtist()`.
  - To add `/artists/[slug]` pages or subdomains, resolve the artist from the route or host instead of `NEXT_PUBLIC_DEFAULT_ARTIST_SLUG`. The repositories already filter by `artistId`.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Build for production and serve the build |
| `npm run lint` / `npm run typecheck` | Run ESLint and strict TypeScript checks |
| `npm run placeholders` | Regenerate the sample SVG images |
| `npm run reset-mock-db` | Discard mock edits and return to the seed data |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the multi-artist platform plan, monetization, and paid alerts. Hosting steps are in [DEPLOYMENT.md](DEPLOYMENT.md).

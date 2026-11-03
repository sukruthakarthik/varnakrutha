# Handling spam and unwanted accounts — Varnakrutha

How to deal with spam applications, spam enquiries and unwanted artist accounts on varnakrutha.in, and the rules to follow. For admins.

**The principle: don't delete, mark as spam.** Spam is kept out of sight in a **Spam** tab, the sender's email is **blocked**, and anything is restorable with **Not spam**. Permanent deletion is the exception (see [section 6](#6-when-to-delete-permanently)).

> One-time setup: run `supabase/migrations/20261016000000_spam_and_blocklist.sql` in the Supabase SQL Editor. It adds the Spam status, the `blocked_emails` table and the automatic filing of blocked senders.

---

## 1. What "Mark as spam" does

| | Effect |
|---|---|
| The item | Moves to the **Spam** tab. It's no longer in the inbox, reply reminders or counts, but it's kept |
| The sender's email | Added to the **block list** (`blocked_emails`) |
| Future messages from that email | Filed straight into **Spam** by the database. The sender still sees the usual "thank you", so they aren't prompted to try another address |
| **Not spam** | Moves the item back to **New** and **unblocks** the email |

---

## 2. Spam application
1. **Admin → Applications** → find it → **Mark as spam** → confirm.
2. Don't email them; replying confirms the address works.

It now shows under the **Spam** filter. If they apply again with the same email, the new application lands in Spam too.

> Not a fit isn't spam. A genuine artist whose work isn't right for the site should be **declined**, with the polite decline sent via **Email**. See [Applications etiquette](#applications-etiquette).

## 3. Spam enquiry
1. **Admin → Inquiries** → find it → **Mark as spam** → confirm.

The **All** tab is your inbox and leaves spam out; spam is under **Spam**. Spam enquiries have no Reply button, on purpose.

## 4. Repeat senders
- **Same email:** handled automatically. Everything they send goes to Spam.
- **New email each time:** the block list can't catch this. These still help:
  - the hidden bot trap (honeypot) silently drops most automated spam;
  - rate limits per internet connection: 3 applications an hour, 5 enquiries every 10 minutes;
  - one pending application per email, and none for existing artists.

  Mark each new one as spam; it takes seconds. If it becomes a daily problem, ask for a CAPTCHA to be added to the forms.

**Seeing the block list:** Supabase → **Table Editor → `blocked_emails`** (email, reason, date). To unblock without an item to restore, delete that row.

## 5. Unwanted artist account (already accepted)
Accepted artists have a login, so **Mark as spam** isn't offered for them. **Suspend** them instead. Every step can be reversed, and nothing is deleted.

1. **Hide their page.** Table Editor → **`artists`** → their row → set **`approved_at`** to `NULL` → Save. Their page and artworks disappear from the public site within an hour (redeploy with `npx vercel --prod` for instant removal). Their artworks also stop being publicly readable.
2. **Take away admin access.** Table Editor → **`artist_admins`** → find the row with their artist's `id` → delete **that row only**. They can still sign in, but are told "This account isn't linked to an artist", so they can't upload or edit anything.
3. **Block their email.** Table Editor → **`blocked_emails`** → **Insert row**: `email` = their address in lowercase, `reason` = e.g. "Suspended artist".

**To restore them:** set `approved_at` back to a date, re-add the `artist_admins` row (`artist_id` + their `user_id` from Authentication → Users), and delete the `blocked_emails` row.

> Their uploaded image files stay in Storage (`artworks/<slug>/`), reachable only by someone who already has the exact link. Delete them only if you delete the artist permanently (section 6).

---

## 6. When to delete permanently

Deleting can't be undone, and the free Supabase plan has no restore. Delete only when:

| Reason | What to delete | How |
|---|---|---|
| **Someone asks for their data to be deleted** (their legal right) | Everything about them | The matching steps below, within a few days; confirm by email when done |
| **A declined application has been answered** (the Privacy Policy promises this) | That application | Applications → **Declined** → **Delete permanently** |
| **Spam older than 12 months** (the Privacy Policy keeps spam up to 12 months) | Old spam items | **Spam** tab → **Delete permanently** on each |
| **A suspended artist is definitely not coming back** | The artist, images and login | [Deleting an artist](#deleting-an-artist) |

**Delete permanently** only appears for spam and declined applications, and for spam and archived enquiries. Anything else must be declined, archived or marked as spam first, which prevents deleting something by accident.

When you delete spam permanently, **the email stays on the block list.** That's deliberate: the block list is what keeps them out.

### Deleting an artist
> **Artists with orders can't be deleted.** Sales records must be kept for tax (about 8 years), so the database refuses. Suspend them instead (section 5).

Do it in this order, in Supabase:
1. **Check their enquiries** in Admin → Inquiries. **Deleting the artist deletes every enquiry about them**, so save any genuine buyer messages first. If unsure, export: Table Editor → `artists` / `artworks` → filter by their id → **Export → CSV**.
2. **Images:** Storage → `artworks` → the folder named after their **slug** → delete its contents. Check the folder name twice.
3. **Artist:** Table Editor → `artists` → their row → **Delete row**. This also removes their artworks, image records, enquiries, pending profile review and their `artist_admins` link.
4. **Login:** Authentication → Users → their email → **Delete user**.
5. **Application:** if it should go too, mark it as spam (or decline it), then **Delete permanently**.

---

## Rules to keep in mind
1. **Mark as spam, don't delete.** It's reversible and keeps the sender blocked.
2. **Not a fit isn't spam.** Decline real artists politely; never block them.
3. **Verify before acting.** Check the email, links and content. When unsure, wait a day.
4. **Never touch admins.** Never remove your own account or anyone in `platform_admins`, and never delete or edit rows in that table.
5. **Deleting is permanent,** and deleting an artist deletes their enquiries. Export first if in doubt.
6. **Only edit the tables named here,** one row at a time. Never run `delete` SQL against whole tables or `auth.users`.
7. **Don't reply to spam,** and don't click links in it.
8. **Respect the Privacy Policy:** delete declined applications once answered, clear spam after 12 months, unblock anyone blocked by mistake, and honour deletion requests promptly.
9. **Keep the service role key private** (`SUPABASE_SERVICE_ROLE_KEY`). None of this needs it to be shared.
10. **Allow for the cache.** Public pages update within an hour; redeploy when it can't wait.

### Applications etiquette
- **Genuine, not a fit:** Decline → send the decline via **Email** → once sent, **Delete permanently**. Add a private note first if you want to remember why.
- **Genuine, undecided:** Shortlist, and reply within the week you promised (the admin flags late replies).
- **Spam:** Mark as spam. No reply.

---

## Local testing (mock mode)
Everything above works in the local admin too: the Spam tab, Not spam and blocking. Mock data lives in `.data/db.json` (blocked emails under `blockedEmails`). Start fresh with `npm run reset-mock-db`.

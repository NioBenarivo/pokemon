# Pokemon Binder

A React app for browsing Pokemon cards organized by pack.

## Seeding the Database

Four scripts populate the Supabase database with data scraped from artofpkm.com. Each script is resumable — it saves progress to a JSON file and skips already-completed entries on re-run.

### Prerequisites

All scripts require these environment variables in `.env.local`:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API (service role key) |
| `VITE_WORKER_URL` | Your Cloudflare Worker URL |
| `VITE_UPLOAD_SECRET` | The secret configured on your Worker |
| `VITE_R2_BASE_URL` | Your R2 public bucket base URL |

### Run order

The scripts depend on each other — run them in this order:

**Step 1 — Seed Pokemon**

Scrapes all Pokemon from artofpkm.com, uploads each image to Cloudflare R2, and upserts rows into the `pokemon` table.

```bash
npm run seed:pokemon
# or directly:
node --env-file=.env.local seed_pokemon.js
```

**Step 2 — Seed Packs**

Scrapes all card packs (sets) from artofpkm.com/cards, uploads each pack logo to R2, and upserts rows into the `packs` table (includes card count and release date).

```bash
npm run seed:packs
# or directly:
node --env-file=.env.local seed_packs.js
```

**Step 3a — Seed Cards via Pokemon pages**

For every Pokemon in the database, scrapes their cards, uploads each card image to R2, and upserts rows into the `scraped_cards` table. Covers all Pokemon cards.

```bash
npm run seed:cards
# or directly:
node --env-file=.env.local seed_cards.js
```

**Step 3b — Seed Cards via Pack pages**

For every pack in the database, scrapes all cards in that pack and upserts into `scraped_cards`. Run this after step 3a — it picks up trainer, energy, and item cards that don't appear on any Pokemon page.

```bash
node --env-file=.env.local seed_cards_from_packs.js
```

### Progress files

Each script saves its progress locally so it can be safely interrupted and resumed:

- `seed_packs_progress.json` — completed/failed pack IDs
- `seed_cards_progress.json` — completed Pokemon IDs, failed card IDs
- `seed_cards_from_packs_progress.json` — completed pack IDs, failed card IDs

Delete a progress file to force a full re-run of that script.

### Supabase schema

Run these in the Supabase SQL editor before the first seed:

```sql
create table pokemon (
  id         integer primary key,
  name       text    not null,
  image_url  text    not null
);
alter table pokemon enable row level security;
create policy "Public read" on pokemon for select using (true);

create table packs (
  id           integer primary key,
  name         text    not null,
  image_url    text    not null,
  card_count   integer,
  release_date text
);
alter table packs enable row level security;
create policy "Public read" on packs for select using (true);

create table scraped_cards (
  id          text    primary key,  -- "{set_id}-{card_id}" e.g. "581-101"
  pokemon_id  integer references pokemon(id),
  pack_id     integer references packs(id),
  name        text    not null,
  pack        text    not null,
  image_url   text    not null
);
alter table scraped_cards enable row level security;
create policy "Public read" on scraped_cards for select using (true);
```

## Development

```bash
npm install
npm run dev
```

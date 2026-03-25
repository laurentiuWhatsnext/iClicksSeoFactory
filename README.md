# iClicks SEO Content Platform — Frontend

Internal SaaS tool for managing AI-generated SEO content across multiple clients. The team uses this to create page assignments, trigger AI content generation, and review/approve articles.

## Quick start

```bash
npm install
npm run dev
# opens http://localhost:3000
```

The frontend works standalone with mock data. No backend required for development.

When the backend is ready, set the API base URL:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Sonner for toast notifications

## Screens

| Screen | Route | Purpose |
|---|---|---|
| Assignment | `/import` | Create a page assignment (single form or CSV bulk) |
| Pipeline | `/pipeline` | View all pages, filter, select and trigger generation |
| Review | `/review/[pageId]` | Read generated article, see quality scores, approve or reject |

---

## API contract for backend

Base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)

All requests send/receive JSON. All error responses should return `{ "error": "message" }`.

---

### 1. `GET /get_clients`

Returns all clients. Used by the Assignment page dropdown.

**Response:**

```json
{
  "clients": [
    {
      "id": "C001",
      "name": "Stile Floors",
      "slug": "stile-floors",
      "domain": "https://stilefloors.nl/",
      "branche": "Flooring retail",
      "tone_of_voice": "modern, professional, warm",
      "notes": "",
      "business_model": "B2C",
      "market_model": "National",
      "cta_preferences": "View collection, Request a quote"
    }
  ]
}
```

---

### 2. `POST /add_client`

Creates a new client. Called from the "+" button on the Assignment page.

**Request body:**

```json
{
  "name": "King Laminaat",
  "slug": "king-laminaat",
  "domain": "https://kinglaminaat.nl/",
  "branche": "Flooring retail",
  "tone_of_voice": "approachable, persuasive, inviting",
  "notes": "Not 'showroom', use 'flooring store'",
  "business_model": "B2C",
  "market_model": "Regional",
  "cta_preferences": "Visit us in store, Order free samples"
}
```

**Response:** Return the created client object with a generated `id`.

```json
{
  "id": "C005",
  "name": "King Laminaat",
  "slug": "king-laminaat",
  ...
}
```

---

### 3. `POST /add_form`

Creates a new page assignment. This is the main form submission.

**Request body:**

```json
{
  "client_id": "C003",
  "content_type": "seo_dienstenpagina_b2c",
  "target_keyword": "wit klik pvc",
  "secondary_keywords": "pvc vloer wit, witte klikvloer, wit pvc kopen",
  "search_intent": "transactional",
  "target_url": "/pvc-vloeren/klik-pvc/wit-klik-pvc/",
  "page_goal": "Ranking + conversie richting aankoop",
  "priority": "high",
  "instructions": "Focus op voordelen van klik-PVC t.o.v. traditioneel PVC. Niet noemen: laminaat.",
  "internal_links": "https://kingvloeren.nl/pvc-vloeren/\nhttps://kingvloeren.nl/klik-pvc/",
  "reference_url": "https://competitor.nl/wit-klik-pvc/",
  "meta_title": "",
  "meta_description": "",
  "competitor_urls": "https://concurrent1.nl/wit-pvc/\nhttps://concurrent2.nl/pvc-wit/",
  "also_asked": "Is klik PVC waterdicht?\nKun je klik PVC zelf leggen?",
  "serp_notes": "Top 3 resultaten focussen op prijs en kleurenselectie",
  "page_cta": "Bekijk collectie",
  "target_word_count": 1100,
  "run": true
}
```

**Field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_id` | string | yes | FK to clients table |
| `content_type` | string | yes | One of 8 slugs (see below) |
| `target_keyword` | string | yes | Primary SEO keyword |
| `secondary_keywords` | string | no | Comma-separated |
| `search_intent` | string | no | `transactional` / `informational` / `local` |
| `target_url` | string | no | Relative URL |
| `page_goal` | string | no | Free text |
| `priority` | string | no | `high` / `medium` / `low` (default: `low`) |
| `instructions` | string | no | Passed VERBATIM to writer agent — no AI paraphrasing |
| `internal_links` | string | no | Newline-separated URLs |
| `reference_url` | string | no | Single competitor/inspiration URL |
| `meta_title` | string | no | Max 60 chars. Empty = auto-generated |
| `meta_description` | string | no | Max 155 chars. Empty = auto-generated |
| `competitor_urls` | string | no | Newline-separated URLs |
| `also_asked` | string | no | Newline-separated questions |
| `serp_notes` | string | no | Free text |
| `page_cta` | string | no | CTA text |
| `target_word_count` | number | no | Falls back to content type default |
| `run` | boolean | no | `true` = save + queue for generation. `false` = save as `new` only |

**Response:**

```json
{
  "id": "auto-generated-uuid",
  "status": "new",
  "created_at": "2026-03-25T14:30:00Z"
}
```

If `run: true`, status should be `"in_progress"`.

---

### 4. `GET /get_forms`

Returns all page assignments. Used by the Pipeline page.

**Query params (all optional):**

| Param | Example | Notes |
|---|---|---|
| `status` | `new` | Filter by status |
| `client_id` | `C003` | Filter by client |
| `priority` | `1` | Filter by priority number |
| `form_id` | `P003` | Return a single form (used by Review page) |

**Response (list):**

```json
{
  "pages": [
    {
      "id": "P001",
      "client_id": "C003",
      "content_type_id": "CT05",
      "target_keyword": "laminaat amsterdam",
      "secondary_keywords": ["laminaat kopen amsterdam", "goedkoop laminaat amsterdam"],
      "target_url": "/amsterdam",
      "priority": 1,
      "status": "new"
    }
  ],
  "total": 4
}
```

**Response (single form with `form_id` param):**

```json
{
  "page": {
    "id": "P003",
    "client_id": "C003",
    "content_type_id": "CT01",
    "target_keyword": "laminaat leggen service",
    "secondary_keywords": ["laminaat installatie"],
    "target_url": "/diensten/laminaat-leggen",
    "priority": 1,
    "status": "review"
  },
  "article": {
    "id": "A001",
    "page_id": "P003",
    "content": "# Article title\n\nFull article markdown content...",
    "score": 82,
    "score_details": {
      "keyword_usage": 90,
      "word_count": 85,
      "structure": 78,
      "meta_optimisation": 75,
      "readability": 80
    },
    "version": 1,
    "created_at": "2026-03-23T09:00:00Z"
  }
}
```

The `article` field is `null` if no article has been generated yet.

---

### 5. `POST /generate_forms`

Triggers AI generation for selected pages. Only processes forms with status `new` or `failed`.

**Request body:**

```json
{
  "ids": ["P001", "P003", "P005"]
}
```

**Response:**

```json
{
  "queued": 3,
  "job_ids": ["job-abc-123", "job-def-456", "job-ghi-789"]
}
```

**Validation:** The service should only accept forms in `new` or `failed` status. Silently skip any that are in other statuses.

---

### 6. `PATCH /evaluate_form`

Approves or rejects a generated article. Only works for forms in `review` status.

**Approve:**

```json
{
  "form_id": "P003",
  "approved": true
}
```

**Reject:**

```json
{
  "form_id": "P003",
  "approved": false
}
```

**Response:**

```json
{
  "form_id": "P003",
  "status": "approved"
}
```

---

### 7. `GET /api/progress` (SSE — optional for MVP)

Server-Sent Events stream for real-time generation progress. The frontend falls back to a simulated progress animation if this is not available.

**Response:** `Content-Type: text/event-stream`

Each event is a JSON object:

```json
{
  "page_id": "P001",
  "status": "in_progress",
  "stage": "writing_start",
  "writing_progress": 45
}
```

**Stages in order:** `briefing_start` → `briefing_done` → `writing_start` → `writing_progress` → `score_check` → `done`

---

## Status flow

```
new → in_progress → review → approved
                           → rejected → (can be re-run as new/failed)
                  → failed → (can be re-run)
```

- Only `new` and `failed` forms can be submitted to `/generate_forms`
- Only `review` forms can be submitted to `/evaluate_form`
- Failed jobs should be re-runnable by submitting them to `/generate_forms` again

---

## Valid content type slugs

The `content_type` field in `/add_form` must be one of these 8 values:

| Slug | Description |
|---|---|
| `seo_dienstenpagina_b2b` | Service page (B2B) |
| `seo_ecommerce_categorie` | E-commerce category |
| `seo_dienstenpagina_b2c` | Service page (B2C) |
| `seo_blogpost_klant` | Blog article |
| `seo_locatiepagina` | Location page |
| `seo_productpagina` | Product page |
| `seo_faq_pagina` | FAQ page |
| `seo_over_ons` | About page |

---

## Score details object

The `score_details` object in the article response has 5 fixed keys:

| Key | Description | Range |
|---|---|---|
| `keyword_usage` | Primary keyword density and placement | 0–100 |
| `word_count` | Whether word count matches content type target | 0–100 |
| `structure` | Heading hierarchy, paragraph length, lists | 0–100 |
| `meta_optimisation` | Meta title and description quality | 0–100 |
| `readability` | Sentence length, vocabulary level | 0–100 |

The overall `score` is the weighted average (frontend just displays it, doesn't calculate).

---

## File structure

```
src/
├── app/
│   ├── layout.tsx              # root layout + nav bar
│   ├── page.tsx                # redirects to /import
│   ├── globals.css             # design system
│   ├── import/page.tsx         # Screen 1 — Assignment form
│   ├── pipeline/page.tsx       # Screen 2 — Pipeline dashboard
│   └── review/[pageId]/page.tsx # Screen 3 — Article review
├── components/
│   ├── nav-bar.tsx             # top navigation
│   └── ui/                    # shadcn components (auto-generated)
└── lib/
    ├── api.ts                  # typed API client (all endpoints)
    ├── mock-data.ts            # mock data (used when API is unavailable)
    └── utils.ts                # cn() classname helper
```

---

## How mock fallback works

Every screen tries the real API first. If it fails (network error, backend not running), it falls back to `MOCK_CLIENTS`, `MOCK_PAGES`, etc. from `src/lib/mock-data.ts`. Console logs the payload with `[Mock mode]` prefix.

When Mihai's endpoints are live, just set `NEXT_PUBLIC_API_URL` and the frontend will use them automatically. No code changes needed.

---

## CORS

The frontend runs on `localhost:3000`. The backend needs to allow CORS from this origin:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Team

| Person | Role |
|---|---|
| Colin | Product owner |
| Patrick | Technical lead |
| Laurentiu | PM / QA |
| Mihai | Backend developer |

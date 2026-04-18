# CRAVE — Hook 'Em Hacks Build Plan

> **Event:** Hook 'Em Hacks @ UT Austin · 24-hour sprint
> **Tracks targeted:** Multimodal Search & Generation · Best Use of Supabase · Best Use of AWS · Most Startup Ready
> **One-liner:** "You crave it. We book it."

---

## 1. What CRAVE Is (and What It Isn't for This Hackathon)

CRAVE is an AI-powered dining concierge with two sides:

- **Consumer mobile app** — conversational voice agent that understands "I'm going out with the boys tonight," reconciles group preferences, and recommends restaurants.
- **Restaurant B2B dashboard** — an AI chatbot that answers analytics questions and generates Instagram ad creative (image + short-form video) from a single prompt.

For a 24-hour hackathon, we are **not** building a production booking system, a real two-tower retrieval model, or a nightly training pipeline. We are building a **credible, end-to-end demo** that hits all four tracks and can survive a judge asking "how does this actually work?"

---

## 2. What We're Building

Five features make the MVP. Everything else is either cut or parked (see §13).

1. **Conversational voice agent** — the headline moment. User says "I'm going out with the boys tonight," the agent resolves the group from contacts, reconciles preferences, and speaks back the top 3 recommendations with reasoning.

2. **Group preference reconciliation** — the defensible idea. Weighted average of group member preference vectors, filtered by hard dietary constraints, biased by the context tag ("date night" vs "with the boys" vs "family dinner").

3. **B2B chatbot ("Just ask Crave!")** — natural-language Q&A over restaurant analytics, embedded on the dashboard home page. "How did my margherita pizza perform last week?" → answer with a generated chart.

4. **AI ad campaign generation** — single prompt → Instagram-ready ad image. If ahead of schedule, a Ken-Burns-style short video ad with AI voiceover.

5. **Voice-Driven In-App Ordering** — for CRAVE partner restaurants, users can browse the visual menu while the voice agent runs overlaid in the background. The user simply tells the agent what they want to order, the agent verbally confirms and places the order via a tool call, and the app automatically transitions to a confirmation screen. The order instantly appears on the restaurant's B2B Live Orders Feed.

6. **Bill splitting + post-meal feedback loop** — the hook is bill splitting; the payoff is data. After dinner, one person in the group taps "Split the bill," snaps the receipt, and drags each line item onto the face of a group member (the group is already in Supabase from the booking). CRAVE computes each person's share with proportional tax and a tip slider, then fires a one-tap Venmo/CashApp deep link to every member. Immediately after the split is sent, a 5-second _"were these a hit for you?"_ swipe card asks each user about the items they were assigned. That signal feeds their preference vector **and** the restaurant's item-level analytics. This is the only place CRAVE captures ground-truth outcome data — and users actually show up for it because splitting a bill with friends is a real, painful problem solved in seven seconds.

**Supporting UX (not features, but required for the six above to work):**

- Phone-OTP onboarding with 5–6 cuisine swipe cards to seed the preference vector.
- Group creation from device contacts; SMS invite for non-CRAVE contacts with a stripped-down web onboarding page.
- A single restaurant detail screen. For non-partners: name, photos, reasoning, a book CTA. For partners: includes visual menu browsing with an active background voice agent overlay so users can order naturally.
- **Booking flow** splits on partner status:
  - **CRAVE partner restaurant** (has a B2B dashboard account): tap to book in-app → writes a `bookings` row in Supabase → appears instantly on the restaurant's B2B dashboard via Supabase Realtime (see §4.3). This is the two-sided network moment we want judges to see.
  - **Non-partner restaurant**: confirmation screen shows the restaurant's phone number with a tap-to-call button and a pre-filled script card (party size, requested time, user's name, any dietary notes). User places the call themselves. After the call they tap "we're confirmed" to log the booking locally. Zero stubs, zero pre-recorded audio.

**Stretch — only if voice agent is stable by Hour 12:**

- **Image Playground-style group builder UI** — Apple-inspired animated orbit where tapping a contact pulls them in around a central pulsing blur. Framer Motion + SVG. Pure visual polish, no logic.

---

## 3. AI Systems & Data Sources

### 3.1 Where the recommendations come from (data sources)

| Source                                    | What we extract                                                            | How we get it in 24 hours                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Google Places API**                     | Restaurant name, location, cuisine tags, price tier, rating, photos, hours | Free tier is generous enough for Austin. Seed ~200 restaurants at the start of the hackathon into Supabase.                          |
| **Yelp Fusion API**                       | Review snippets, more granular category tags, menu hints                   | Supplement Places. Free tier: 5K calls/day.                                                                                          |
| **Group context tag**                     | "Date night" / "With the boys" / "Family dinner"                           | LLM extracts this from the voice transcript. Each tag has a preset ambiance weight profile.                                          |
| **Past bookings**                         | Behavioral signal                                                          | Seed fake history for demo users so the group reconciliation has something to blend.                                                 |
| **User location**                         | Distance fairness                                                          | Device GPS → Supabase.                                                                                                               |
| **Restaurant menu descriptions + photos** | Embeddings for multimodal search                                           | Scrape/seed 5–10 menu items per restaurant. Run through OpenAI `text-embedding-3-small` + CLIP (via Replicate) for image embeddings. |

### 3.2 AI model stack

| Layer                                    | Model / Service                                                                                               | Used For                                                                                              | Why this one                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real-time voice I/O**                  | **ElevenLabs Conversational AI** (primary) _or_ **OpenAI Realtime API** (fallback)                            | Full-duplex voice interaction on the mobile app                                                       | ElevenLabs gives us a configurable agent with tool-calling, natural voice, and low latency. OpenAI Realtime is the backup if ElevenLabs trips us up. |
| **Reasoning LLM**                        | **Claude Sonnet 4.5** via Anthropic API (primary); **Amazon Bedrock (Claude)** as the AWS-credit-earning path | Intent parsing, group resolution from contact names, tool orchestration, B2B chatbot, ad copywriting  | Claude handles tool use cleanly and is the best at not hallucinating restaurant names. Routing through Bedrock ticks the AWS track box.              |
| **Text embeddings**                      | **OpenAI `text-embedding-3-small`** (1536-dim)                                                                | Restaurant descriptions, menu items, user preference vectors, cuisine semantics                       | Cheap, fast, plays nicely with pgvector.                                                                                                             |
| **Image embeddings (multimodal search)** | **OpenAI CLIP** via Replicate _or_ **Amazon Titan Multimodal Embeddings** (Bedrock)                           | "Find me somewhere that looks like this photo" + menu image search + cross-modal restaurant discovery | Titan keeps us in AWS-land for the track. CLIP is a safe fallback.                                                                                   |
| **Speech-to-text**                       | **Amazon Transcribe** (free tier: 60 min/month) _or_ Deepgram                                                 | When not using a full-duplex voice model, for recorded clips in demo                                  | Free tier plus AWS track credit.                                                                                                                     |
| **Text-to-speech**                       | **ElevenLabs** (voice quality) _or_ **Amazon Polly** (free tier: 5M chars/month)                              | Agent replies, ad voiceover                                                                           | ElevenLabs for the product voice, Polly for the ad voiceover (saves budget and hits AWS track).                                                      |
| **Image generation (ads)**               | **Amazon Bedrock: Stable Diffusion 3 / Titan Image Generator** (primary); **OpenAI `gpt-image-1`** (fallback) | Instagram ad creative from a text prompt + brand context                                              | Bedrock earns AWS track points and produces ad-ready stills.                                                                                         |
| **Video generation (ads)**               | **Remotion** rendering a Ken-Burns animation over 3–4 generated stills + Polly voiceover                      | "Video" ad that renders in ~10 seconds instead of waiting on Sora/Runway                              | Actual text-to-video models are too slow and flaky for a live demo. This fakes the result convincingly and is deterministic.                         |
| **Vector search**                        | **Supabase pgvector (HNSW index)**                                                                            | Restaurant similarity search, menu item search, user↔restaurant matching                              | Headline Supabase feature. Anchors the Supabase track submission.                                                                                    |
| **OCR (menu / receipts)**                | **Amazon Bedrock** — **Claude** (multimodal / vision) _or_ **Amazon Nova** multimodal via `Converse` / `InvokeModel` | Core pipeline for receipt-based post-meal feedback (§3.3)                                             | Model reads the receipt image and returns **constrained JSON** (line items, prices, quantities, merchant, tax, total) via prompt + schema / tool use. Consolidates AI on Bedrock with reasoning + image gen for the AWS track. |

### 3.3 Bill splitting + post-meal feedback loop (how it feeds the pipeline)

This is the only place CRAVE captures **ground-truth outcome data** — who ordered what and whether they liked it. But "scan your receipt to help us improve recommendations" is a weak ask at the end of a meal when people are full and ready to leave. So the user-facing product here is **bill splitting**, which solves a real post-meal problem in seven seconds. Preference feedback is a lightweight ask that piggybacks on an action the user already wanted to take.

Item attribution from bill splitting is actually a _stronger_ signal than generic receipt feedback would be — because items are dragged to specific members, we know **this specific user** had **this specific item**, not just "someone at the table ate it." That's the ground truth that makes the preference embedding update meaningful.

**The flow, step by step:**

1. **Trigger.** Someone in the group taps "Split the bill" in the app. No push notification needed — the user opens CRAVE because they have an actual problem to solve.

2. **Capture.** Camera opens in a receipt-framed mode → user snaps the receipt → image uploads to S3 under `receipts/{user_id}/{booking_id}.jpg`.

3. **OCR.** S3 upload triggers a Lambda (S3 event notification). Lambda loads the receipt image from S3 and calls **Amazon Bedrock** (`Converse` or `InvokeModel`) with a **multimodal model** (Claude with vision or Amazon Nova) — image as a content block plus a short prompt requiring **strict JSON**: line items with `Description`, `Price`, `Quantity`, plus merchant name, subtotal, tax, and total. Raw model output is stored in `receipt_captures.ocr_raw` for auditability.

4. **Item matching (runs async while user is in step 5).** A Supabase Edge Function fuzzy-matches each extracted line item against the `menu_items` table for that `restaurant_id`. Three-stage matcher:
   - **Stage 1 — exact match:** case-insensitive string equality on item name.
   - **Stage 2 — trigram similarity** via Postgres `pg_trgm` (`similarity(name, raw_text) > 0.4`). Handles typos and abbreviations.
   - **Stage 3 — embedding similarity:** cosine distance between the OpenAI embedding of the raw receipt text and each menu item's stored embedding. Handles weird receipt abbreviations like `MARG PZZ` → Margherita Pizza.

   Each match records its `match_method` and `match_confidence`. Items that can't be matched still work for the bill split (the receipt gives us the price) — they just don't participate in the preference feedback loop.

5. **Assignment UI.** The receipt items appear as draggable chips at the top of the screen. Group member avatars (pulled from the `bookings`/`group_members` context) line up at the bottom. User drags each item onto a member. Items left in the "shared" zone split evenly among everyone. This is the marquee visual moment of the feature — fast, tactile, satisfying.

6. **Split compute.** App calculates per-person subtotal (items assigned + pro-rata share of shared items), distributes tax proportionally to each person's subtotal, and adds tip from a slider (default 20%). Totals update live as the user drags items around.

7. **Payment deep links.** User taps "Send." For each member, CRAVE composes a payment deep link using their stored `venmo_handle` or `cashapp_handle` (prompted once on first use). Venmo URL scheme: `venmo://paycharge?txn=charge&recipients=<handle>&amount=<amount>&note=<restaurant_name>`. Each member receives an SMS with the link — tap it, Venmo/CashApp opens with the amount pre-filled, they confirm. Members without either handle get an in-app IOU they can settle however. **No payment API integration required — these are public URL schemes.**

8. **Feedback ask (the piggyback).** Immediately after the split is sent, each member who had items assigned to them sees a single swipe-card screen: _"How were these?"_ — 2–4 cards for the items they personally had, swipe right (liked) or left (didn't). Skippable with one tap. Because the user is already engaged in the action of splitting the bill with friends, this conversion is going to be dramatically higher than a cold "scan to help us" ask.

9. **Pipeline injection — two writes per piece of feedback:**
   - **`item_feedback` insert** — the raw thumbs-up/down signal, attributed to the specific user who had the item. Powers restaurant-side menu analytics ("your Wagyu is the #1 re-ordered item among groups in the 'with the boys' context; your tiramisu skews negative among date-night diners").
   - **Preference embedding update** — a row lands in `user_pref_updates` with a delta vector. A Supabase trigger recomputes the user's `pref_embedding` as a weighted blend:
     ```
     new = normalize( 0.85 * old
                    + 0.15 * mean(liked_menu_item_embeddings)
                    - 0.10 * mean(disliked_menu_item_embeddings) )
     ```
     This nudges the vector toward what the user actually enjoys, not just what they swiped on during onboarding.

10. **Restaurant-side benefit.** Aggregated item feedback rolls up into the B2B dashboard's Menu Performance page and is queryable through "Just ask Crave!". Because items are attributed to specific (anonymized) user segments, the restaurant can ask _"which items do 'with the boys' groups love that 'date night' groups don't?"_ and get a real answer.

**Why this works as a hackathon feature AND as a real product:** the user incentive is bill splitting, not helping CRAVE. The data pipeline is the same one we were going to build anyway. Bill splitting is a demo moment that lands — judges will remember "oh, and then it splits the bill with Venmo links" far better than they'll remember "oh, and then it has a feedback loop."

**Demo sequence:** Booking completes on the consumer app → Alex (the host) taps "Split the bill" → snaps a prepared demo receipt → five items appear, four group-member avatars line up below → drag pizza to Sarah, salad to Mike, margarita to themselves, appetizers stay shared → tip slider to 20% → hit Send → SMS previews pop up on a second phone with the Venmo link → back on Alex's screen, "how was your margarita?" swipe cards appear → swipe → cut to Supabase dashboard showing the preference vector numerically shifting. Land with: _"The app just solved a real problem, and the system just learned."_

### 3.4 Side note — DoorDash / Uber Eats integration (parking lot, not MVP)

We considered pulling order history from DoorDash or Uber Eats as another preference signal source. **Not in scope for the hackathon** — neither exposes a public user-order-history API, and unofficial scraping is legally murky and brittle.

Parking it here because the pipeline designed for bill-splitting receipts makes this trivial to add later: if either ever ships an OAuth-style history export (or a post-launch partnership makes sense), the ingestion pipeline is identical — extract items + implicit "paid for this, probably liked it" signal → write to `item_feedback` with `source='doordash'` → run the same embedding-update trigger. **Same pipeline, different source.** The bill-splitting UI doesn't apply (delivery orders are usually one person paying), but the preference capture does.

### 3.5 How a recommendation is actually produced (simplified for 24 hours)

1. **Voice input** → ElevenLabs agent transcribes to text.
2. **LLM intent parse** (Claude via Bedrock): extract `{intent: "group_dining", group_ref: "the boys", vibe: "casual", budget: "$$"}`. Output constrained to JSON schema.
3. **Group resolution tool call**: LLM calls a Supabase function `resolve_group(user_id, "the boys")` → returns member IDs and their stored preference vectors.
4. **Candidate filter (SQL)**: Supabase query filters restaurants by location radius (15 min drive), dietary hard constraints (any member vegan, halal, etc.), and open-right-now hours.
5. **Vector rank (pgvector)**: compute a group preference vector as the element-wise mean of member vectors, weighted by the context-tag ambiance profile. Run `embedding <=> group_vec` ORDER BY against filtered candidates. Take top 20.
6. **LLM re-rank**: Claude re-ranks the top 20 with the full context (group composition, time, weather, any stated vibe) and produces a top 3 with one-sentence reasons.
7. **Voice response**: agent speaks the top 3 with reasoning.

Total latency target: ~2–3 seconds from end-of-speech to start-of-response. Achievable because the heaviest step (vector search) runs on <1000 restaurants and the LLM re-rank is over 20 rows.

---

## 4. B2B Dashboard — Features, Chatbot, and Data Sources

The B2B dashboard is where restaurants get value in exchange for partner status. It's also where two of our targeted tracks (Multimodal Search & Generation, Most Startup Ready) earn the most points — the chatbot and the ad studio live here.

### 4.1 Dashboard pages (what ships for the demo)

1. **Home / "Ask Crave!"** — Dashboard landing page. Top half: a prominent search-style input — _"Ask Crave anything about your restaurant…"_ Below it, a live KPI strip (today's bookings, covers this week, average party size, item feedback sentiment score). Recent bookings and recent receipt feedback are shown as two side-by-side activity feeds.

2. **Live Bookings Feed** — Real-time stream of bookings coming in from the CRAVE consumer app. Each row shows party size, group context tag (date night / with the boys / family / business), dietary notes, and scheduled time. New rows animate in via Supabase Realtime within ~500ms of the consumer tapping book.

3. **Live Orders Feed** — A separate real-time feed powered by Supabase Realtime that displays incoming food orders directly placed through the voice agent from the mobile app.

4. **Live Menu Management** — A CRUD interface where partners can add, edit, price, and disable menu items in real-time, syncing instantly to the voice agent's context and the mobile visual menu.

5. **Menu Performance** — Per-item analytics driven primarily by receipt OCR feedback (§3.3). For each menu item: impression count (from consumer recommendation sessions), order rate (from receipts), thumbs-up rate, thumbs-down rate, sentiment trajectory over time. Sortable table with an inline sparkline per row. Items with mixed feedback surface a "what customers said" preview when expanded.

6. **Ad Campaign Studio** — Creative generation workspace (Multimodal track bait). Prompt box + optional reference image upload → Bedrock image gen → generated Instagram-ready carousel (3 variants) + generated caption + suggested hashtags + "what this'd look like in the feed" preview. Short video variant renders via Remotion + Polly voiceover. Saved campaigns go to `ad_campaigns`; assets land in S3 and serve through CloudFront.

7. **Trend Radar** — City-level and neighborhood-level food trends actively populated by an AI (Claude via Bedrock) that aggregates intelligence from context in our Supabase database about the restaurant. _"'Birria' is up 40% in search intent this month in East Austin."_ Read-only for MVP; valuable content for the restaurant marketing story.

### 4.2 "Just ask Crave!" — Chatbot data sources and architecture

The chatbot is Claude (via Bedrock) with **constrained tool calling**. It does NOT have open SQL access or write permissions. Every tool is a predefined, parametrized SQL query scoped to the caller's `restaurant_id` and enforced by Supabase Row-Level Security.

**Data sources the chatbot draws from (all Supabase Postgres):**

| Source table(s)                           | What it answers                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `bookings`                                | Booking volume, trends, cancellations, party sizes, peak times                         |
| `item_feedback` + `receipt_line_items`    | Which menu items customers actually liked/disliked, based on ground-truth receipt data |
| `menu_items` + `impressions`              | How often each menu item was viewed in-app vs actually ordered                         |
| `impressions` (cross-restaurant)          | Competitive view graph — who customers considered alongside you                        |
| `bookings` + `group_members` + `contacts` | Customer segments, group compositions, repeat-visit behavior                           |
| `ad_campaigns` + `ad_assets`              | Your own ad history, generation prompts, asset URLs                                    |
| AI-aggregated trend intelligence          | Neighborhood cuisine trends, anonymized across all users and populated by AI           |

**Available tools (LLM picks and parameterizes):**

| Tool                                         | Returns                                                  | SQL backing                                    |
| -------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `get_booking_summary(time_range, group_by?)` | Counts + trends                                          | `bookings`                                     |
| `get_menu_performance(item?, time_range)`    | Views, orders, thumbs-up rate per item                   | `menu_items` ⋈ `impressions` ⋈ `item_feedback` |
| `get_item_feedback(item?, sentiment?)`       | Positive/negative signal breakdown                       | `item_feedback`                                |
| `get_customer_segments()`                    | Anonymized persona breakdown                             | `users` ⋈ `bookings` with context tags         |
| `get_competitive_view_graph(time_range)`     | "Also viewed" edges and win rates                        | `impressions`                                  |
| `get_campaign_performance(campaign?)`        | Impressions, CTR, attributed bookings                    | `ad_campaigns` ⋈ `ad_assets`                   |
| `render_chart(type, data)`                   | Triggers dashboard to render a Recharts component inline | — (UI side-effect)                             |

**Request flow:**

1. User types _"How did my pasta do last week?"_
2. Edge Function wraps the message with the restaurant's scoped JWT and forwards to Bedrock Claude.
3. Claude picks `get_menu_performance(item="pasta", time_range="last_7_days")` and calls it.
4. The tool runs a parametrized SQL query; RLS transparently filters to `restaurant_id = <caller>`.
5. Structured JSON returns to Claude.
6. Claude composes a natural-language answer and — for anything numeric or comparative — calls `render_chart` to draw a Recharts bar/line inline in the chat bubble.

**Why constrained tools over free-form SQL generation:**

- Deterministic — no LLM-hallucinated column names, no "that query failed, try again" loops on stage.
- Safe — a prompt-injected message like "drop the bookings table" literally cannot be executed because there is no `run_sql` tool.
- Demoable — the tool list doubles as the product's API surface. If a judge asks "what can it actually do," we show the list.

### 4.3 Partner booking flow — how bookings reach the dashboard

When a consumer taps "book" on a restaurant:

- **If `restaurants.is_crave_partner = true`**: the app writes a `bookings` row with `source='partner_app'` and `status='confirmed'`. Supabase Realtime broadcasts the row to every dashboard client subscribed to `restaurant_id = X`. The Live Bookings Feed animates the new entry in within half a second. The restaurant doesn't need to do anything — the booking just shows up, with party size, context tag, dietary notes, and requested time.
- **If `is_crave_partner = false`**: the app shows the phone number and a script card; no `bookings` row is written until the user taps "we're confirmed" (which writes `source='phone_call_logged'`).

This is the partner value proposition made concrete in the demo: _"Sign up for CRAVE B2B and bookings start arriving in this feed automatically, with richer context than any reservation platform gives you."_ The demo moment is strong — during the pitch, we book from the consumer app on one screen and the dashboard on the adjacent laptop pings with the new entry in real time. Two-sided network, live on stage.

---

## 5. Tech Stack

### 5.1 Supabase — what we use it for (Best Use of Supabase track)

Supabase is the backbone. Every major feature touches it, which is exactly what the track rewards.

| Supabase feature              | CRAVE use                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Postgres**                  | Primary data store: users, groups, restaurants, menu items, preference vectors, bookings, ad campaigns, analytics events.                                                            |
| **pgvector extension (HNSW)** | Embeddings for restaurants, menu items, users. Powers semantic search, group recommendation ranking, and the "restaurants like this one" feature.                                    |
| **Auth (phone OTP)**          | Phone-number login matches the product vision and enables the group SMS invite flow.                                                                                                 |
| **Realtime**                  | Live group voting — when a group member votes, other members see the count update instantly. Also powers the "your friend just joined the group" notification during SMS onboarding. |
| **Storage**                   | Restaurant photos, generated ad creative (images + rendered videos), user-uploaded receipts if we get to it.                                                                         |
| **Edge Functions (Deno)**     | The `resolve_group`, `recommend`, and `generate_ad` functions. Keeps the LLM/tool orchestration close to the data and avoids a separate backend server.                              |
| **Row-Level Security**        | Restaurant accounts can only see their own analytics. User data is scoped per-user. Demonstrable security story for judges.                                                          |

**Demo-worthy Supabase moment:** Open the Supabase dashboard live during the pitch and show the HNSW index, the realtime group vote firing, and the RLS policies. Judges love this.

### 5.2 AWS — free-tier-only usage (Best Use of AWS track)

Strict rule: **free tier only, or services that have per-request pricing low enough that 24 hours of demo traffic costs pennies.** We use Bedrock on pay-as-you-go because its per-request cost is negligible at demo volume and it's the thing that actually earns the track.

| AWS service                         | Free tier limit                                           | CRAVE use                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Amazon Bedrock**                  | Pay-as-you-go (not free tier, but ~pennies at demo scale) | Claude for reasoning; **Claude or Nova vision** for receipt/menu images → structured JSON; Titan Multimodal Embeddings; Stable Diffusion / Titan Image Generator for ad images. **This is the headline AWS integration.** Textract is intentionally not used — everything multimodal stays on Bedrock. |
| **AWS Lambda**                      | 1M requests/month forever free                            | Wrapper functions that proxy Bedrock calls from the mobile app and dashboard. Avoids putting AWS credentials in the client.                          |
| **Amazon API Gateway**              | 1M requests/month free (12 months)                        | Public endpoint for the Lambdas.                                                                                                                     |
| **Amazon S3**                       | 5 GB free (12 months)                                     | Generated ad creative, menu photos, demo video assets. Served via signed URLs.                                                                       |
| **Amazon Polly**                    | 5M characters/month free (12 months)                      | Voiceover on generated video ads.                                                                                                                    |
| **Amazon Transcribe**               | 60 min/month free (12 months)                             | Backup STT path if ElevenLabs flakes.                                                                                                                |
| **Amazon CloudFront**               | 1 TB/month free (12 months)                               | CDN in front of S3 for ad creative delivery. Small but demo-realistic.                                                                               |
| **Amazon Rekognition** _(optional)_ | 5K images/month free (12 months)                          | If we wire up "find restaurants that look like this vibe" from a user-uploaded photo.                                                                |

**Architecture note:** Keeping Supabase as the DB and putting AWS in front of the AI layer gives us a clean story — "Supabase for data + realtime, AWS for AI compute and media." Both tracks stay defensible.

### 5.3 Everything else

- **Mobile app:** React Native + Expo (one codebase, works in simulator for demo, hot reload saves hours).
- **B2B Dashboard:** Next.js 15 + Tailwind + shadcn/ui, deployed to Vercel.
- **Voice UI:** ElevenLabs Conversational AI SDK in React Native.
- **Animations (Image Playground-style UI):** Framer Motion + SVG. The "orbit" is a parent SVG with child avatar nodes animated on circular paths, plus a central gradient blur that pulses when the agent is listening.
- **Video rendering (ads):** Remotion running in a Lambda, outputs MP4 to S3.
- **Dev environment:** Single monorepo (pnpm workspaces) — `/apps/mobile`, `/apps/dashboard`, `/apps/api`, `/packages/shared`. GitHub with branch protection off (speed > safety for 24 hours).

---

## 6. Architecture Diagram

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│   CRAVE Mobile (React Native)│     │  B2B Dashboard (Next.js)     │
│   + ElevenLabs voice SDK     │     │  + "Ask Crave" chatbot       │
│   + Image Playground UI      │     │  + Ad Campaign Studio        │
└──────────────┬───────────────┘     └───────────────┬──────────────┘
               │                                      │
               │       HTTPS / WebSocket              │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│        API Gateway  →  Lambda (Node.js) orchestration layer      │
│        (proxies to Bedrock, calls Supabase, signs S3 URLs)       │
└───────┬───────────────────┬─────────────────────────┬───────────┘
        │                   │                         │
        ▼                   ▼                         ▼
┌──────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  Supabase    │   │   Amazon Bedrock   │   │       AWS S3       │
│              │   │                    │   │   + CloudFront     │
│ • Postgres   │   │ • Claude (reason)  │   │                    │
│ • pgvector   │   │ • Receipt JSON OCR │   │ • Ad creative      │
│ • Auth (SMS) │   │ • Titan Multimodal │   │ • Menu photos      │
│ • Realtime   │   │ • SD3 / Titan Img  │   │ • Rendered videos  │
│ • Storage    │   └────────────────────┘   └────────────────────┘
│ • Edge Fns   │   ┌────────────────────┐
│ • RLS        │   │   ElevenLabs       │   ┌────────────────────┐
└──────────────┘   │ Conversational AI  │   │    Amazon Polly    │
                   │ (voice I/O + tools)│   │  (ad voiceover)    │
                   └────────────────────┘   └────────────────────┘
```

---

## 7. Data Model (Postgres / Supabase)

Condensed schema, enough to build against.

```sql
-- Extensions
CREATE EXTENSION vector;      -- pgvector
CREATE EXTENSION pg_trgm;     -- trigram similarity for receipt item matching
CREATE EXTENSION postgis;     -- geospatial queries

-- Core tables
users (id, phone, name, location_geog, pref_embedding vector(1536), created_at,
       venmo_handle,                 -- optional, for bill-split deep links
       cashapp_handle)               -- optional
contacts (user_id, contact_user_id, label)
groups (id, name, owner_id, context_tag, created_at)
group_members (group_id, user_id, joined_at)
restaurants (id, name, cuisine_tags[], price_tier, location_geog, embedding vector(1536),
             image_embedding vector(1024), hours jsonb, photo_urls[], yelp_id, google_place_id,
             phone_e164, is_crave_partner boolean default false)
menu_items (id, restaurant_id, name, description, price, image_url,
            embedding vector(1536), image_embedding vector(1024), is_available boolean default true)
orders (id, user_id, restaurant_id, status, total_cents, created_at)
order_items (id, order_id, menu_item_id, quantity, price_cents)
bookings (id, user_id, group_id, restaurant_id, party_size, scheduled_at, status,
          source text,                  -- 'partner_app' | 'phone_call_logged'
          voice_transcript, created_at)
dietary_constraints (user_id, constraint_type, hard boolean)

-- Bill splitting + post-meal feedback pipeline
receipt_captures (
  id, user_id, booking_id,
  image_s3_url,
  ocr_raw jsonb,
  merchant_matched_restaurant_id,
  subtotal_cents, tax_cents, total_cents,   -- parsed from Bedrock vision OCR
  status text,                -- 'uploaded' | 'ocr_done' | 'split_sent' | 'feedback_collected'
  created_at
)
receipt_line_items (
  id, receipt_id,
  raw_text, raw_price_cents, quantity,
  matched_menu_item_id,       -- nullable
  match_confidence float,
  match_method text,          -- 'exact' | 'trigram' | 'embedding' | 'manual'
  assigned_to_user_id         -- nullable; NULL = shared (split evenly among group)
)
bill_splits (
  id, receipt_id, user_id,
  subtotal_cents,             -- items assigned + pro-rata share of shared items
  tax_share_cents,
  tip_share_cents,
  total_cents,
  payment_link,               -- 'venmo://...' or 'https://cash.app/...'
  payment_method text,        -- 'venmo' | 'cashapp' | 'iou'
  marked_paid boolean default false,
  created_at
)
item_feedback (
  id, user_id, restaurant_id,
  menu_item_id,               -- nullable when unmatched
  raw_item_text,              -- fallback label for unmatched items
  liked boolean,
  source text,                -- 'bill_split' today; 'doordash' / 'uber_eats' if ever added
  created_at
)
user_pref_updates (
  id, user_id,
  delta_embedding vector(1536),
  source text,                -- 'bill_split_feedback' | 'booking' | 'swipe'
  applied boolean,
  created_at
)

-- Analytics / B2B
impressions (restaurant_id, user_id, source, context_tag, created_at)
menu_interactions (menu_item_id, user_id, action, created_at)

-- Ad campaigns
ad_campaigns (id, restaurant_id, prompt, status, created_at)
ad_assets (id, campaign_id, type, s3_url, generation_meta jsonb, created_at)

-- Indexes that matter
CREATE INDEX ON restaurants USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON restaurants USING hnsw (image_embedding vector_cosine_ops);
CREATE INDEX ON menu_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON menu_items USING gin (name gin_trgm_ops);  -- for trigram receipt matching
CREATE INDEX ON restaurants USING gist (location_geog);
CREATE INDEX ON item_feedback (restaurant_id, menu_item_id);
```

---

## 8. 24-Hour Build Timeline

Six founders, parallel tracks, one hard integration checkpoint at Hour 12 and a freeze at Hour 20.

| Block                                   | Owners                                                          | Deliverables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hour 0–2: Setup**                     | All                                                             | Monorepo live. Supabase project created, schema applied, pgvector enabled. AWS accounts linked, Bedrock model access requested, Lambda skeletons deployed. Expo mobile shell builds. Next.js dashboard shell builds. Seed script loads 200 Austin restaurants from Google Places + Yelp.                                                                                                                                                                                                                                                             |
| **Hour 2–12: Parallel vertical slices** |                                                                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ↳ Voice agent                           | Founder 6 + Founder 3                                           | ElevenLabs agent configured with 4 tools: `resolve_group`, `recommend_restaurants`, `confirm_booking`, `place_order`. Wired into mobile app. Tool calls hit Lambda → Supabase Edge Functions.                                                                                                                                                                                                                                                                                        |
| ↳ Recommendation engine                 | Founder 3                                                       | Edge Function that takes a group_id + context tag, builds weighted group vector, runs pgvector query, LLM re-ranks top 20 → top 3 with reasons.                                                                                                                                                                                                                                                                                                                                                                                                      |
| ↳ Mobile app                            | Founder 5 + Founder 2                                           | Onboarding (phone auth + 6 swipe cards), home screen with big voice button, recommendation result screen, group creation from contacts. Plus visual menu screen and voice order confirmation.                                                                                                                                                                                              |
| ↳ B2B dashboard                         | Founder 4                                                       | Login (restaurant account), home page with "Ask Crave" input, mock analytics charts (real schema, seeded data), campaign studio page skeleton. Menu management CRUD + live orders feed real-time display.                                                                                                                                              |
| ↳ Ad generation pipeline                | Founder 6 (after voice agent stable)                            | Lambda that takes a prompt + restaurant brand → Bedrock image gen → S3 upload → signed URL back. Video path: generate 4 images, send to Remotion Lambda with Polly voiceover, MP4 to S3.                                                                                                                                                                                                                                                                                                                                                             |
| ↳ Receipt OCR + bill split backend      | Founder 4 (after dashboard shell is up, parallel with RLS work) | Camera flow in mobile app → S3 upload → Lambda trigger → **Bedrock vision** receipt parse (structured JSON) → Edge Function item matcher (exact → trigram → embedding) → `receipt_line_items` rows written. Split compute function (subtotal + pro-rata tax + tip). Venmo/CashApp deep-link generator.                                                                                                                                                                                                                                                                        |
| ↳ Bill split UI + feedback piggyback    | Founder 5 (mobile) + Founder 3 (trigger)                        | Drag-and-drop item-to-avatar UI with live split totals. Tip slider. "Send" button that posts deep links to each member (SMS via Supabase Auth SMS or just in-app modal). After send, quick swipe-rate cards for each user's assigned items. Supabase trigger on `item_feedback` insert recomputes and writes the updated `pref_embedding`.                                                                                                                                                                                                           |
| ↳ Supabase RLS + realtime               | Founder 4                                                       | RLS policies on all B2B tables. Realtime channel for live bookings feed and group voting.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Hour 12 — INTEGRATION CHECKPOINT**    | All                                                             | Every track demos independently. End-to-end tests: (1) two users log in, create a group, third user says "dinner with the boys" to voice agent, gets 3 recommendations spoken back; (2) restaurant user types "make me an Instagram ad for our margherita pizza" and sees an image appear; (3) user taps "Split the bill," snaps a test receipt, drags items to member avatars, hits Send, confirms a Venmo deep link fires, then sees feedback swipe cards for items they assigned to themselves. Any failing track triggers its fallback (see §9). |
| **Hour 12–18: Integration + polish**    | All                                                             | Stitch flows. Fix the 20 small bugs that always appear at integration. Wire up the B2B chatbot to actually query Supabase for analytics (simple SQL via LLM tool-calling, read-only).                                                                                                                                                                                                                                                                                                                                                                |
| **Hour 18–20: Image Playground UI**     | Founder 5                                                       | If and only if voice agent is reliable: build the animated group-builder orbit. SVG + Framer Motion, avatars orbit the central blur, clicking a contact pulls them in with a spring animation. Otherwise, cut.                                                                                                                                                                                                                                                                                                                                       |
| **Hour 20: FEATURE FREEZE**             | All                                                             | No new features. Only bug fixes, demo data seeding, and rehearsal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Hour 20–23: Demo prep**               | Founder 1 + Founder 5                                           | Record backup demo video of every critical flow (in case live demo fails on-stage Wi-Fi). Devpost writeup. GitHub README with architecture diagram and setup instructions. Pitch deck: 5 slides max — problem, demo, how it works (architecture), tracks hit, ask.                                                                                                                                                                                                                                                                                   |
| **Hour 23–24: Rehearse**                | All                                                             | Two full pitch runs. Time it. Cut anything that makes the demo >3 minutes. Submit on Devpost with 15 minutes to spare.                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## 9. Fallbacks for Each Critical Path

| Component                                    | If broken by Hour 12                                                                                                                                                                                  | If broken by Hour 20                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **ElevenLabs voice agent**                   | Switch to OpenAI Realtime API (already researched, similar tool-calling API).                                                                                                                         | Pre-record the voice interaction; play it over the demo with the real UI responding.                                              |
| **Bedrock image gen**                        | Fall back to OpenAI `gpt-image-1`.                                                                                                                                                                    | Use 3–4 pre-generated demo ads loaded from S3; the "generation" is a 2-second spinner + reveal.                                   |
| **Video ad rendering**                       | Cut video; ship image-only ads for the demo.                                                                                                                                                          | Show a pre-rendered MP4 from S3 instead of rendering live.                                                                        |
| **Bedrock receipt vision parse**             | Use a pre-parsed JSON blob for the demo receipt (**canonical `ReceiptParse` schema** — same shape the matcher expects, so bill-split + feedback pipeline is unchanged).                              | Same pre-parsed JSON fallback — the split compute, deep links, and embedding update still run live.                               |
| **Receipt item matching**                    | If embedding-based matching is flaky, ship with just exact + trigram and accept lower recall on weird abbreviations. Unmatched items still work for the bill split; they just skip the feedback card. | Skip matching entirely for unmatched items; the split still works (we have prices), feedback cards only appear for matched items. |
| **Venmo/CashApp deep links**                 | If one SDK-style URL scheme misbehaves on the demo device, fall back to the other.                                                                                                                    | Copy-paste the link from an in-app modal; the demo still shows the right amounts and notes per person.                            |
| **Group resolution from voice ("the boys")** | LLM tool-call returns a hardcoded demo group.                                                                                                                                                         | Tap the group on-screen instead of speaking the name.                                                                             |
| **Realtime group voting**                    | In-app state only, no cross-device sync.                                                                                                                                                              | Demo from a single device, narrate the multi-device experience.                                                                   |
| **Image Playground UI**                      | Ship the plain contact-list group builder.                                                                                                                                                            | —                                                                                                                                 |
| **Live Wi-Fi at the venue**                  | Tether off a phone hotspot.                                                                                                                                                                           | Play the pre-recorded backup demo video.                                                                                          |

---

## 10. Track Strategy — How We Win Each

### Multimodal Search & Generation

The submission explicitly exercises four modalities:

1. **Voice in** (user speech) → **text** (intent) → **voice out** (agent reply).
2. **Text query** → **image embedding search** (optional: "find restaurants that look cozy").
3. **Text prompt** → **image generation** (ad creative).
4. **Text prompt** → **video generation** (Remotion + Polly voiceover on generated stills).

Call this out explicitly in the Devpost writeup as "four modalities, one coherent product."

### Best Use of Supabase

Show, don't tell. In the demo, open the Supabase dashboard and walk through:

- The HNSW index on `restaurants.embedding`.
- A live Realtime channel firing as group members vote.
- RLS policies preventing cross-account analytics leaks.
- Auth handling phone OTP.
- Edge Functions doing the recommendation orchestration.

This is "using every Supabase primitive for something load-bearing," which is exactly what the track rewards.

### Best Use of AWS

Bedrock is the anchor — Claude reasoning, **Claude/Nova vision** for receipt → structured JSON, Titan multimodal embeddings, SD3 for images. Wrapped by Lambda + API Gateway + S3 + CloudFront + Polly. Explicit AWS architecture diagram on a pitch slide. Cost footprint during the demo is quantifiable (a few dollars in Bedrock calls), which shows we understand production economics.

### Most Startup Ready

This is where the (now slimmed-down) business story matters. Keep it to: problem, TAM, moat (group preference graph), monetization (restaurant SaaS + sponsored placements + data licensing), 6-month plan (Austin → 3 cities). One slide, maybe two. The product demo itself has to carry the "this could be a company" case.

---

## 11. Risks for the 24 Hours

| Risk                                                                | Mitigation                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ElevenLabs agent tool-calling behaves differently than docs suggest | Build the OpenAI Realtime fallback path behind the same tool interface from Hour 0. Swap providers at a single config line.        |
| Bedrock model access not granted in time                            | Request access immediately at Hour 0. Fallback chain: Bedrock → Anthropic direct → OpenAI. All three behind one abstraction layer. |
| pgvector performance on day-one data                                | Non-issue at 200 restaurants. If it somehow matters, the HNSW index builds in <1 second.                                           |
| Group voice resolution hallucinates group members                   | Constrain the tool-call output to an enum of the user's actual groups. No freeform matching from the LLM.                          |
| Demo Wi-Fi dies on-stage                                            | Phone hotspot + pre-recorded backup video on laptop.                                                                               |
| Everyone tries to integrate at once at Hour 12                      | That's what the integration checkpoint is for. Each track demos its own slice before anyone stitches.                              |
| We build the Image Playground UI instead of fixing voice bugs       | Hard rule: nobody touches the orbit UI until voice is green.                                                                       |
| Bedrock vision mis-reads a noisy receipt (folded paper, glare)      | Validate JSON against schema; one retry with a stricter prompt; fall back to pre-parsed demo JSON (§9).                            |

---

## 12. Submission Checklist

- [ ] Devpost project created with tracks selected: Multimodal Search & Generation, Best Use of Supabase, Best Use of AWS, Most Startup Ready
- [ ] GitHub repo public, README with architecture diagram + setup steps
- [ ] Demo video (2–3 min): problem → voice agent demo → bill split + feedback loop → B2B chatbot + ad gen → architecture slide
- [ ] Live demo setup tested on venue Wi-Fi (or hotspot)
- [ ] Backup demo video recorded and on a local drive
- [ ] Pitch deck: 5 slides
- [ ] Supabase project: pgvector enabled, pg_trgm enabled, RLS on, realtime channels configured
- [ ] AWS: Bedrock model access approved, Lambdas deployed, S3 bucket public-read through CloudFront for demo assets, Bedrock vision OCR tested on a sample receipt (JSON validates against schema)
- [ ] Mascot name submitted (free $25 Starbucks card, why not)

---

## 13. Parking Lot — Ideas We're Not Building Now

Keeping these here so we don't lose them when we revisit the product post-hackathon. None of these are in scope for the 24 hours.

- **DoorDash / Uber Eats order history import** — no public API, unofficial scraping is brittle and legally iffy. If either ever ships an OAuth history export, the pipeline already designed for receipt OCR drops it in with one field change (`source='doordash'`). Same `item_feedback` writes, same embedding update trigger.
- **Menu swipe-to-order browsing** — not track-aligned for this hackathon.
- **Actual outbound voice booking to restaurants** — stubbed in the demo. Real outbound telephony (TwiML/Vonage) is a multi-week engineering effort with restaurant acceptance risk on top. Post-hackathon track, not now.
- **Google Maps Timeline import** — another preference-seeding source. Nice to have, but onboarding swipes + receipt feedback is enough signal for a demo.
- **One-tap / "Just Book It" mode** — depends on a mature preference model, which we don't have after 24 hours.
- **Return visit intelligence** ("last time you had the Wagyu — want it again?") — elegant UX, but needs multiple completed visits per user to be interesting. Post-launch.
- **Sophisticated recommendation stack** (two-tower retrieval, LightGBM re-ranker, nightly Spark training, Kafka event pipeline, blue-green HNSW swaps) — all cut in favor of pgvector + LLM re-ranking. Revisit when data volume justifies it; until then, simpler is better and faster.


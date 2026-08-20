# AI for Civic & Legal Empowerment — 36-Hour Build Blueprint
### Team of 3 · 100% Free-Tier Stack · Zero Hardcoded Outputs

---

## 0. Ground Rule Before You Start

Free-tier rate limits for LLM APIs move every few months and vary by region/account. The numbers below are current best estimates (August 2026) — **verify live limits in Google AI Studio / Groq Console in the first 30 minutes of the hackathon** and hardcode whichever number you actually see into your backend's rate-limiter. Don't trust old blog posts (including this one) over the live dashboard.

---

## 1. Minimal Viable Architecture

### 1.1 Architecture Diagram (no overengineering — 4 moving parts, one direction of data flow)

```
┌──────────────────────────┐
│   STITCH → REACT UI      │
│  (Vite + Tailwind, SPA)  │
│                           │
│  Triage Wizard            │
│  Chat + Citation Panel    │
│  Document/Notice Editor   │
└─────────────┬─────────────┘
              │ REST (fetch/axios), JSON only
              ▼
┌──────────────────────────────────────────┐
│           FASTAPI BACKEND                 │
│  /api/auth      (JWT validation via Clerk)│
│  /api/triage    (classify query)          │
│  /api/ask       (RAG answer + citations)  │
│  /api/notice    (generate legal doc)      │
│  /api/upload    (evidence → Cloudinary)   │
│  /api/pdf       (render + store PDF)      │
└───────┬───────────────────┬───────────────┘
        │                   │
        ▼                   ▼
┌────────────────┐   ┌─────────────────────┐
│  RAG PIPELINE    │   │   MCP TOOLS          │
│  (in backend or  │   │  Mongo MCP: vector   │
│  as its own       │   │  search + chat log   │
│  module)          │   │  Cloudinary MCP:     │
│  Chunk store →     │   │  upload/fetch PDFs  │
│  MongoDB Atlas      │   │  + evidence files    │
│  Vector Search      │   └─────────────────────┘
└────────────────┘
```

One request path, one response shape, no message queues, no microservices. For authentication, use a drop-in provider like Clerk to avoid building login from scratch. Resist the urge to add Redis, Celery, or a separate notification service. You don't need them in 36 hours.

### 1.2 Free-Tier Tech Stack Table

| Layer | Tool | Free Tier Ceiling (verify live) | Notes |
|---|---|---|---|
| LLM inference (primary) | Google Gemini API (AI Studio), `gemini-flash` family | ~10–15 RPM, ~250K–1M TPM, ~1,000–1,500 RPD depending on exact model/date | Free tier data may be used for training — fine for a hackathon demo, mention to judges as a known limitation for production |
| LLM inference (fallback) | Groq, `llama-3.3-70b-versatile` or `llama-3.1-8b-instant` | ~30 RPM, ~1,000 RPD (70B) / ~14,400 RPD (8B), 6K–12K TPM | Use 8B for triage classification (fast, high volume), 70B or Gemini for the citation-grounded explainer (needs quality) |
| Embeddings | HuggingFace Inference API `BAAI/bge-small-en-v1.5`, or Gemini `text-embedding-004` | Rate-limited but generous for a one-time ingestion job | Ingestion happens once at hackathon setup — batch it, cache vectors, don't re-embed on every query |
| Vector + metadata store | MongoDB Atlas M0 (free forever, 512MB) with Atlas Vector Search | 512MB storage, shared RAM | Enough for a few thousand chunked legal-act sections. Also store chat/session history and generated-notice metadata here |
| File storage | Cloudinary free tier | 25 GB storage/bandwidth pooled monthly credit | Store generated notice PDFs and uploaded evidence images/PDFs |
| Backend | FastAPI + Uvicorn | n/a (self-hosted / free hosting) | Deploy on Render free tier or just run locally + ngrok for the demo if hosting is flaky |
| Auth | Clerk (or Firebase Auth) | 10k monthly active users | Provides pre-built React UI components (`<SignIn />`) for fast hackathon integration |
| Frontend | React (exported from Google Stitch) + Tailwind CSS | n/a | Static hosting via Vercel/Netlify free tier |
| PDF generation | `WeasyPrint` or `reportlab` (Python) or `pdf-lib` (JS) | n/a, self-hosted | Generate PDF server-side, then push to Cloudinary, return URL to frontend |
| Dev environment | Antigravity IDE + MCP connectors | n/a | Used to scaffold MCP tool calls to Mongo + Cloudinary without hand-writing SDK boilerplate |

**Zero-cost guardrail:** every external call (Gemini, Groq, HF, Mongo Atlas, Cloudinary) must go through one central `services/` wrapper module in the backend so you can swap providers or add a fallback in one place if you hit a wall mid-demo.

---

## 2. Zero-Cost RAG Pipeline

### 2.1 Source Strategy — Indian Law & Civic Data

Use these openly licensed / government-published sources so you're not scraping paywalled content:

- **RTI Act 2005** — full text is on the [Central Information Commission site](https://cic.gov.in) and mirrored in plain text on GitHub repos tagged `rti-act-india`. Search GitHub for `"Right to Information Act 2005" filetype:txt` and `opennyai`/`indianlegalbert` for pre-cleaned corpora.
- **Consumer Protection Act 2019** — bare act text is public domain (Government of India legislation), available via [India Code](https://www.indiacode.nic.in) (search "Consumer Protection Act, 2019") and re-published on GitHub under repos like `nyaaya/indian-consumer-protection-act` (check whichever mirror is live at hackathon time).
- **Model Tenancy Act 2021** — published by the Ministry of Housing and Urban Affairs, plain text available via India Code and state housing department sites; several state Rent Control Acts (Maharashtra, Delhi, Karnataka) are also public domain and worth chunking if you have time.
- **OpenNyAI** (github.com/OpenNyAI) — has pre-processed Indian legal NER models, judgment datasets, and section-extraction tooling; even if you don't use their models, their preprocessing scripts save hours.
- **Government scheme data** — [MyScheme.gov.in](https://myscheme.gov.in) has an eligibility API/portal you can scrape responsibly for scheme names, eligibility criteria, and application links (no auth wall on public scheme listings). Cache a curated subset (30–50 major central + your target state's schemes) rather than trying to cover everything.
- **RTI application templates** — the CIC website and several NGOs (e.g., Satark Nagrik Sangathan, snsindia.co.in) publish free RTI drafting templates in the public domain — use these as few-shot examples in your notice-generation prompt, not as literal text to copy verbatim into user output.

### 2.2 Ingestion Pipeline (lightweight, one-time job)

```
1. Collect raw texts → /data/raw/{act_name}.txt
2. Recursive character text-split (LangChain's RecursiveCharacterTextSplitter
   or a simple regex-based splitter):
   - chunk_size ≈ 500–800 tokens
   - chunk_overlap ≈ 100 tokens
   - Split first on section boundaries ("Section 4", "Article 19", etc.)
     using regex, THEN recursively split any oversized section
3. Tag each chunk with metadata:
   {
     "act_name": "Consumer Protection Act 2019",
     "section": "Section 2(47)",
     "domain": "consumer",       // consumer | rti | tenant | scheme
     "department": "Dept. of Consumer Affairs",
     "source_url": "...",
     "chunk_id": "cpa2019-s247-01"
   }
4. Embed each chunk (HF bge-small or Gemini text-embedding-004)
5. Upsert into MongoDB Atlas collection `legal_chunks` with a
   `vectorSearch` index on the embedding field, plus a normal
   index on `domain` for pre-filtering before vector search
6. Store an ingestion log so you can re-run idempotently
```

Run this once at hour 0–4 as a standalone script, not inside the request path. Total corpus target: 300–800 chunks is plenty for a working demo — don't try to ingest entire bare acts word-for-word if time is short; prioritize the sections a citizen actually needs (rights, timelines, penalties, filing procedure).

### 2.3 Prompt Templates

**(1) Citizen Query Classifier / Triage Agent** — cheap, fast model (Groq 8B or Gemini Flash-Lite), low temperature:

```
SYSTEM:
You are a triage classifier for an Indian civic-legal assistant.
Classify the citizen's query into exactly one category:
CONSUMER, TENANT, RTI, SCHEME, or UNCLEAR.

Rules:
- If the query mentions a purchase, defective product, refund,
  service deficiency, or e-commerce dispute → CONSUMER
- If it mentions rent, landlord, tenant, eviction, security deposit,
  lease → TENANT
- If it asks how to get information from a government body, or
  mentions delays/silence from a public authority → RTI
- If it asks about eligibility for a government scheme, subsidy,
  pension, or welfare program → SCHEME
- If none clearly apply, return UNCLEAR and a one-line clarifying
  question to ask the citizen.

Respond ONLY as JSON:
{"category": "...", "confidence": 0-1, "clarifying_question": "..." or null}

USER QUERY: {{citizen_query}}
```

**(2) Plain-Language Rights Explainer** (grounded, cites retrieved chunks only):

```
SYSTEM:
You are a plain-language legal-rights explainer for Indian citizens.
You will be given the citizen's situation and a set of retrieved
legal-text chunks with their Act name and Section number.

STRICT RULES:
- Only make legal claims that are directly supported by the
  retrieved chunks below. Do not invent section numbers or acts.
- If the retrieved chunks don't fully answer the question, say so
  explicitly and tell the citizen what additional information or
  professional help they should seek.
- Write at a plain-language, 8th-grade reading level. No legal jargon
  without a one-line explanation.
- After every substantive claim, cite the source in the format
  (Act Name, Section X).
- End with a short "What you can do next" action list.

RETRIEVED CONTEXT:
{{retrieved_chunks_with_metadata}}

CITIZEN SITUATION:
{{citizen_query}}

OUTPUT FORMAT (JSON):
{
  "plain_explanation": "...",
  "citations": [{"act": "...", "section": "...", "quote_summary": "..."}],
  "next_steps": ["...", "..."],
  "confidence_note": "..."   // e.g. "Based on limited retrieved sections; consult a lawyer for X"
}
```

**(3) Official RTI / Legal Notice Generator** (formatted, deterministic structure):

```
SYSTEM:
You are drafting a formal document for an Indian citizen to submit
to a public authority or opposing party. Two possible document types:
"RTI_APPLICATION" or "LEGAL_NOTICE" (consumer/tenant).

Use the correct formal structure:

RTI_APPLICATION fields:
- To: [Public Information Officer, {{department_name}}]
- Subject line
- Body citing Right to Information Act, 2005, Section 6(1)
- Specific, numbered information requests (derived from citizen's
  situation — be concrete, not vague)
- Applicant details placeholder fields: [NAME], [ADDRESS], [DATE]
- Fee statement per RTI Rules (₹10 application fee, BPL exemption note)

LEGAL_NOTICE fields (consumer/tenant):
- To: [Opposing Party / Company Name]
- Subject: Notice under [relevant Act/Section]
- Facts of the case (derived from citizen's situation, chronological)
- Legal basis (cite the retrieved Act/Section — do not invent)
- Specific relief sought (refund/repair/replacement/deposit return
  with amount if known)
- Timeline for response (typically 15-30 days, per act/context)
- Applicant details placeholder fields

RULES:
- Never fabricate a section number not present in retrieved context.
- Leave any fact you don't have as a clearly marked placeholder
  like [AMOUNT], [DATE OF PURCHASE] rather than guessing.
- Output must be ready to render into a PDF template — return
  structured JSON with named fields, not a single paragraph blob.

RETRIEVED CONTEXT:
{{retrieved_chunks_with_metadata}}

CITIZEN SITUATION + ANY FORM ANSWERS:
{{citizen_query_and_form_data}}

OUTPUT FORMAT: JSON matching the DOCUMENT_TYPE schema above.
```

Route (2) and (3) through the same retrieval step — retrieve once, reuse the same chunks for both the explainer and the notice generator so the citations stay consistent between what you tell the citizen and what you put in their document.

---

## 3. Antigravity IDE & MCP Configuration

### 3.1 MCP Config

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/civic_legal_db"
      }
    },
    "cloudinary": {
      "command": "npx",
      "args": ["-y", "@cloudinary/mcp-server"],
      "env": {
        "CLOUDINARY_CLOUD_NAME": "<your_cloud_name>",
        "CLOUDINARY_API_KEY": "<your_api_key>",
        "CLOUDINARY_API_SECRET": "<your_api_secret>"
      }
    }
  }
}
```

> Package names for MCP servers change quickly — before the hackathon, run `npx -y mongodb-mcp-server --help` and check the official MongoDB and Cloudinary MCP docs/repos to confirm the current package name and required env vars are still correct. If no official Cloudinary MCP server exists at hackathon time, skip MCP for Cloudinary and just call their REST upload API directly from FastAPI — it's a 10-line function either way.

### 3.2 Antigravity Mega-Prompt (paste at project init)

```
You are scaffolding the backend for a hackathon project: an AI civic
& legal empowerment assistant for Indian citizens.

Build a FastAPI backend with this structure:

/backend
  main.py                 # FastAPI app, CORS enabled for the frontend origin
  /routers
    auth.py                # POST /api/auth -> validates Clerk JWT token and establishes session
    triage.py               # POST /api/triage -> calls the LLM classifier prompt
    ask.py                   # POST /api/ask -> retrieval + grounded explainer prompt
    notice.py                 # POST /api/notice -> retrieval + notice generator prompt
    upload.py                  # POST /api/upload -> uploads file via Cloudinary MCP tool
    pdf.py                       # POST /api/pdf -> renders notice JSON to PDF, uploads, returns URL
  /services
    llm_service.py           # wraps Gemini + Groq calls with a single interface + fallback logic
    embedding_service.py       # wraps HF/Gemini embedding calls
    retrieval_service.py         # queries MongoDB Atlas Vector Search, pre-filtered by domain
    mongo_service.py               # uses the mongodb MCP tool for CRUD + vector search
    cloudinary_service.py            # uses the cloudinary MCP tool (or REST fallback) for uploads
  /prompts
    triage_prompt.txt
    explainer_prompt.txt
    notice_prompt.txt
  /schemas
    models.py                # Pydantic models for every request/response

Requirements:
- Every LLM call must go through llm_service.py so provider swaps are
  a one-line change.
- Every response from /api/ask and /api/notice must include citations
  (act name + section) sourced only from retrieved chunks — never let
  the LLM invent a section number.
- Add a simple in-memory or Mongo-backed rate limiter that falls back
  from Gemini to Groq automatically on a 429.
- Implement Clerk JWT validation middleware for protected API routes.
- Write a /health endpoint that checks Mongo connectivity for demo-day
  peace of mind.

Register the mongodb and cloudinary MCP tools from mcp_config.json and
wire mongo_service.py / cloudinary_service.py to call them.
```

---

## 4. Google Stitch UI Prompts

**Prompt 1 — Citizen Discovery & Triage Dashboard**

```
Design a clean, accessible, mobile-first web dashboard for an Indian
civic-legal assistant app. Header: app name + a simple language
selector (English / Hindi / one regional language). Below the header,
a friendly one-line prompt: "What's going on? Tell us or pick a
category." Include a single open text input (chat-style) at the top
for free-form queries, and below it a 2x2 grid of large, tappable
quick-action cards with icons: "File an RTI", "Solve a Rental
Dispute", "Consumer Complaint", "Check Scheme Eligibility". Each card
has a short one-line description. Use a calm, trustworthy color
palette (blues/greens, not alarming reds), generous whitespace,
large touch targets for low-literacy/older users, and a persistent
"How this works" info link. Include a user profile avatar in the header
and a clean Login/Signup modal (using Clerk's pre-built UI components)
that appears if an unauthenticated user tries to save or export a document.
```

**Prompt 2 — Conversational Rights Navigator & Evidence Uploader**

```
Design a split-screen web interface. Left panel (60% width on
desktop, full width with a tab switch on mobile): a chat interface
with a guided conversational assistant — user messages right-aligned,
assistant messages left-aligned with small citation chips (e.g.
"Consumer Protection Act 2019, Sec 2(47)") that expand on tap to show
the quoted legal text. Include a file-upload dropzone above the chat
input for evidence (receipts, photos, screenshots) with thumbnail
previews. Right panel (40% width): a live "Your Rights & Sources"
sidebar that updates as the conversation progresses, showing a running
list of cited sections with expandable detail cards, plus a persistent
"Generate Document" button that becomes enabled once enough
information is gathered. Use a clean two-tone panel divider, subtle
loading skeletons while the assistant is "typing", and clear visual
distinction between AI-generated guidance and verified legal citations.
```

**Prompt 3 — Auto-Populated Document & Notice Editor**

```
Design a document editor screen for a generated RTI application or
legal notice. Left/main area: a live formatted preview of the
document styled like an official Indian government/legal letter
(formal header block, "To:", subject line, numbered body paragraphs,
signature block) with editable inline fields highlighted in a soft
yellow background (e.g. [AMOUNT], [DATE]) that the user can click and
fill directly in the preview. Right sidebar: a compact form with the
same fields as dropdowns/inputs for users who prefer form-filling
over inline editing, plus a "Sources used" collapsible panel listing
the Act/Section citations backing this document. Bottom action bar:
"Save Draft", "Download PDF", and a primary "Export & Get PDF Link"
button that triggers upload to storage and shows a shareable link
with a QR code. Use a professional, document-like aesthetic (serif
font for the letter preview, sans-serif for UI chrome) to visually
signal "this is a real, submittable document."
```

---

## 5. 36-Hour Execution Roadmap

| Hours | Dev 1 (Frontend/Stitch) | Dev 2 (Backend/MCP) | Dev 3 (RAG/Legal) |
|---|---|---|---|
| **0–6** | Run the 3 Stitch prompts, export to React, set up Vite + Tailwind project, stub routing between 3 screens with dummy data | Scaffold FastAPI via Antigravity mega-prompt, set up Mongo Atlas M0 cluster + Cloudinary account, confirm MCP servers connect, build `/health` | Collect the 4 legal source corpora (Section 2.1), write the chunking script, get MongoDB Atlas Vector Search index created and confirmed queryable |
| **6–18** | Wire triage dashboard to real `/api/triage`, build the chat UI streaming/polling against `/api/ask`, render citation chips from real API responses | Build `/api/triage`, `/api/ask`, `/api/session` fully; implement Gemini→Groq fallback in `llm_service.py`; wire Mongo MCP for chat history persistence | Finish ingestion run (embed + upsert all chunks), tune retrieval (top-k, domain pre-filter), write and test the explainer + notice prompts against 5+ real sample queries per domain |
| **18–30** | Build the document editor screen, wire it to `/api/notice` and `/api/pdf`, add evidence upload UI wired to `/api/upload`, add loading/error states for every API call | Build `/api/notice`, `/api/pdf` (WeasyPrint/reportlab render → Cloudinary upload → return URL), build `/api/upload`, add rate-limit fallback handling and graceful error JSON on LLM failures | Stress-test retrieval against edge-case queries (vague, multi-domain, non-legal), add a "low confidence / consult a lawyer" fallback path so the system never confidently hallucinates a citation, expand scheme dataset if time allows |
| **30–36** | Responsive pass (mobile especially — most citizens will demo on phone), polish loading states, add the 3 demo scripts' happy paths, rehearse click-through | Add caching for repeated queries to conserve rate limit during judging, double-check `/health` and fallback logic live, prep a local backup (ngrok/localhost) in case hosted free tier is down | Prepare the 3 demo inputs precisely (security deposit deduction, defective e-commerce item, RTI for municipal road repair) and pre-verify each produces a correctly cited, non-hallucinated output — rehearse narrating the citations to judges |

---

## 6. Anti-Failure Checklist for Judges

**Fallback strategies if free API limits are hit during judging:**

- [ ] `llm_service.py` automatically retries on Groq if Gemini returns 429, and vice versa — test this failover *before* demo day, not during it
- [ ] Pre-generate and cache the exact responses for your 3 rehearsed demo inputs in Mongo, keyed by query hash, so a live API hiccup falls back to a cached (but real, previously-generated) response instead of an error screen
- [ ] Have a local `.env.demo` with a second, fresh API key for each provider, untouched until judging starts, so your dev-testing usage doesn't eat into demo-day quota
- [ ] Show the rate-limit dashboard/counter briefly in your pitch as a transparency move ("here's how we handle scale beyond the free tier") — turns a limitation into a design-maturity signal

**Judge-pleasing features to prioritize if time allows:**

- [ ] Multi-lingual language selector (even just English + Hindi output for the explainer, using the same LLM with a `target_language` field in the prompt)
- [ ] Visible, clickable "Sources" on every AI claim — this is the single strongest trust signal for a legal-tech judge panel
- [ ] One-click downloadable PDF that actually looks like a real, submittable Indian government/legal document — visual polish here reads as "production-ready" far more than backend sophistication does
- [ ] A visible "confidence" or "we couldn't fully verify this — here's what to do next" state for out-of-scope queries — proves you designed for the zero-hallucination requirement rather than just hoping it doesn't come up
- [ ] A short "How this stays accurate" one-pager or modal explaining the RAG grounding approach in plain language, for judges who ask "how do you prevent hallucination?"

---

### Final note
Cut scope aggressively if you're behind schedule: a system that correctly and honestly handles **one** domain (say, Consumer + RTI) end-to-end with real citations beats a system that half-covers all four domains with shaky grounding. Judges notice confident correctness more than breadth.
# Zero-Cost RAG Pipeline Details

This document outlines the RAG pipeline strategy and implementation details for the AI Civic & Legal Empowerment app.

## 1. Source Strategy — Indian Law & Civic Data

Use these openly licensed / government-published sources so you're not scraping paywalled content:

- **RTI Act 2005** — full text is on the [Central Information Commission site](https://cic.gov.in) and mirrored in plain text on GitHub repos tagged `rti-act-india`. Search GitHub for `"Right to Information Act 2005" filetype:txt` and `opennyai`/`indianlegalbert` for pre-cleaned corpora.
- **Consumer Protection Act 2019** — bare act text is public domain (Government of India legislation), available via [India Code](https://www.indiacode.nic.in) (search "Consumer Protection Act, 2019") and re-published on GitHub under repos like `nyaaya/indian-consumer-protection-act` (check whichever mirror is live at hackathon time).
- **Model Tenancy Act 2021** — published by the Ministry of Housing and Urban Affairs, plain text available via India Code and state housing department sites; several state Rent Control Acts (Maharashtra, Delhi, Karnataka) are also public domain and worth chunking if you have time.
- **OpenNyAI** (github.com/OpenNyAI) — has pre-processed Indian legal NER models, judgment datasets, and section-extraction tooling; even if you don't use their models, their preprocessing scripts save hours.
- **Government scheme data** — [MyScheme.gov.in](https://myscheme.gov.in) has an eligibility API/portal you can scrape responsibly for scheme names, eligibility criteria, and application links (no auth wall on public scheme listings). Cache a curated subset (30–50 major central + your target state's schemes) rather than trying to cover everything.
- **RTI application templates** — the CIC website and several NGOs (e.g., Satark Nagrik Sangathan, snsindia.co.in) publish free RTI drafting templates in the public domain — use these as few-shot examples in your notice-generation prompt, not as literal text to copy verbatim into user output.

## 2. Ingestion Pipeline (lightweight, one-time job)

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

## 3. Prompt Templates

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

**Note:** Route the Explainer and Notice Generator through the same retrieval step — retrieve once, reuse the same chunks for both so the citations stay consistent between what you tell the citizen and what you put in their document.

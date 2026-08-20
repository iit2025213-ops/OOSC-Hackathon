# Integration Guide: Connecting the Legal Brain

This guide provides the exact specifications your friend (the frontend/backend developer) needs to connect the UI to your newly upgraded Conversational Legal AI Engine.

## 1. The API Endpoint

All traffic should now be routed to the new chat endpoint:
*   **URL:** `POST http://<your-server-ip>:8000/api/v1/legal/chat`
*   **Headers:** `Content-Type: application/json`

### The Request Payload
Your friend's backend needs to send a JSON payload matching this structure:

```json
{
  "query": "The user's latest message here (can be null if they just uploaded a doc)",
  "history": [
    {"role": "user", "content": "My brother was murdered."},
    {"role": "ai", "content": "I am so sorry to hear that. To help you, where and when did this happen, and has an FIR been filed?"}
  ],
  "document_text": "RAW EXTRACTED TEXT FROM PDF OR IMAGE GOES HERE (Optional)"
}
```

> [!IMPORTANT]  
> **Document Handling:** Your friend's code must handle the file upload (e.g., using `pdfplumber` or OCR for images) and extract the raw text. They simply pass that extracted string into the `document_text` field. The AI Brain will handle reading and summarizing it automatically.

---

## 2. Handling the Response
The AI will now intelligently decide if it needs to ask a question or if it is ready to give a full legal analysis. Your friend needs to check the `response_type` field.

### Scenario A: The AI asks a question (or summarizes a document)
```json
{
  "request_id": "req_1234abcd",
  "response_type": "question",
  "ai_message": "I see you uploaded an employment contract. What specific clause do you need help understanding?",
  "analysis": null
}
```
**Frontend Action:** Display `ai_message` in the chat UI.

### Scenario B: The AI provides the Full Legal Analysis
```json
{
  "request_id": "req_5678efgh",
  "response_type": "analysis",
  "ai_message": null,
  "analysis": {
      "summary": "...",
      "legal_issues": [...],
      "possible_laws": [...],
      "sources": [...]
  }
}
```
**Frontend Action:** Display the structured legal JSON beautifully on the screen (render the summary, the laws, the next steps, and the exact retrieved sources).

---

## 3. How You Can Upgrade the AI Later (Post-Integration)

Once this is linked up, you can make the AI "smarter" entirely on your own without your friend needing to change any frontend code!

### Adding New Legal Knowledge (Datasets)
1. Download a new dataset (e.g., Supreme Court Judgments).
2. Place it in `data/external/`.
3. Open your terminal and run:
   ```powershell
   .venv\Scripts\python scripts\ingest.py
   ```
4. *That's it!* ChromaDB will embed the new laws, and the AI will instantly start citing them in the chat.

### Upgrading the Brain (The LLM)
If Google releases a faster or smarter model (like Gemini Pro or Gemini 4), you do not need to touch the code.
1. Open your `.env` file.
2. Change the model name:
   `GEMINI_MODEL=gemini-1.5-pro` (for complex reasoning)
3. Restart your server. The entire system will instantly switch to the new brain.
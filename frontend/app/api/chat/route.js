import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

// ─── Session Helpers ─────────────────────────────────────────────────────────

async function loadSession(sessionId) {
  try {
    await connectToDatabase();
    const doc = await ChatSession.findOne({ session_id: sessionId }).lean();
    if (!doc) return { conversation: [], blogState: null };
    return { conversation: doc.conversation || [], blogState: doc.blog_state || null };
  } catch {
    return { conversation: [], blogState: null };
  }
}

async function saveSession(sessionId, conversation, blogState) {
  try {
    await connectToDatabase();
    await ChatSession.findOneAndUpdate(
      { session_id: sessionId },
      { $set: { conversation, blog_state: blogState, updatedAt: new Date() } },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

// ─── Mistral AI Helper ───────────────────────────────────────────────────────

function buildSystemPrompt(currentBlog, conversationContext) {
  return `You are an expert AI blog writing assistant for a technical blogging platform.
You help users create and edit professional technical blog posts.

BLOG JSON STRUCTURE:
{
  "title": string,
  "subtitle": string (optional),
  "excerpt": string (1-2 sentences summary),
  "category": string (e.g. "Python", "DevOps", "AI & LLMs"),
  "tags": string[],
  "content": {
    "introduction": string (2-3 paragraphs),
    "sections": [
      {
        "type": "text" | "code" | "bullets" | "note" | "table" | "flowchart" | "links",
        "title": string,
        // type=text: "content": string
        // type=code: "language": string, "content": string
        // type=bullets: "items": string[]
        // type=note: "content": string
        // type=table: "headers": string[], "rows": string[][]
        // type=flowchart: "steps": [{"id": string, "title": string, "description": string, "color": "blue"|"indigo"|"violet"|"purple"|"pink"}]
        // type=links: "links": [{"text": string, "url": string, "description": string}]
      }
    ],
    "conclusion": string (1-2 paragraphs)
  }
}

RESPOND WITH ONLY THIS JSON (no markdown, no extra text):
{
  "mode": "generate" | "edit_meta" | "edit_section" | "qna" | "chat",
  "blog_state": <full blog JSON or null>,
  "message": <friendly human-readable response>,
  "change_summary": { "summary": string, "changes": string[] } | null
}

MODE DETECTION:
- "generate": user wants a new blog post ("write about X", "create a blog on Y")
- "edit_meta": user changes title/subtitle/excerpt/category/tags only
- "edit_section": user modifies, rewrites, or adds specific sections
- "qna": user asks a question about the current blog content
- "chat": general conversation, tips, or requests unrelated to writing

GUIDELINES:
- For "generate": create a complete, comprehensive blog with 4-8 rich sections
- For code sections: use appropriate language, real working examples
- For "edit_section": preserve all unchanged sections exactly
- Keep existing blog_state unchanged for "qna" and "chat" modes
- Write in an engaging, expert technical style
- blog_state must be null for "chat" and "qna" modes (return unchanged state separately)

Current blog state:
${currentBlog ? JSON.stringify(currentBlog, null, 2) : 'null (no blog created yet)'}

Recent conversation:
${conversationContext || '(none)'}`;
}

function buildConversationContext(conversation, maxTurns = 6) {
  const recent = conversation.slice(-(maxTurns * 2));
  return recent.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
}

// ─── POST /api/chat ──────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Use POST /api/chat with JSON body: {"message": "hello"}',
    llm: { ok: !!process.env.MISTRAL_API_KEY, model: process.env.MISTRAL_CHAT_MODEL || 'mistral-large-latest' },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userMessage = body.message || '';
    const sessionId = body.session_id || uuidv4();

    if (!userMessage.trim()) {
      return NextResponse.json({ detail: 'Message is required' }, { status: 400 });
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ detail: 'AI features require MISTRAL_API_KEY to be configured' }, { status: 503 });
    }

    // Load session
    const { conversation, blogState: prevBlogState } = await loadSession(sessionId);
    conversation.push({ role: 'user', content: userMessage });

    // Build prompt
    const systemPrompt = buildSystemPrompt(prevBlogState, buildConversationContext(conversation));

    // Call Mistral
    const { Mistral } = await import('@mistralai/mistralai');
    const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

    let parsed = null;
    let assistantText = '';
    let mode = 'chat';
    let newBlogState = prevBlogState;
    let changeSummary = null;

    try {
      const resp = await mistral.chat.complete({
        model: process.env.MISTRAL_CHAT_MODEL || 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.7,
      });

      const rawText = resp.choices?.[0]?.message?.content || '{}';
      parsed = JSON.parse(rawText);

      mode = parsed.mode || 'chat';
      assistantText = parsed.message || (parsed.blog_state?.title ? `Done! Blog "${parsed.blog_state.title}" is ready.` : 'Done.');
      changeSummary = parsed.change_summary || null;

      // Only update blog state for generative modes
      if (['generate', 'edit_meta', 'edit_section'].includes(mode) && parsed.blog_state) {
        newBlogState = parsed.blog_state;
      }
    } catch (aiErr) {
      console.error('Mistral AI error:', aiErr);
      mode = 'error';
      assistantText = `An error occurred while processing your request. ${aiErr.message}`;
    }

    conversation.push({ role: 'assistant', content: assistantText });
    await saveSession(sessionId, conversation, newBlogState);

    return NextResponse.json({
      session_id: sessionId,
      mode,
      conversation,
      message: assistantText,
      blog_state: newBlogState,
      change_summary: changeSummary,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ detail: `Chat failed: ${err.message}` }, { status: 500 });
  }
}

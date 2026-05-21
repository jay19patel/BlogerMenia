import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const { prompt, sessionId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { detail: 'Prompt is required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return NextResponse.json(
        { detail: 'User session not found.' },
        { status: 401 }
      );
    }

    // Initialize chat sessions if missing
    if (!db.chatSessions) {
      db.chatSessions = [];
    }

    const currentSessionId = sessionId || `session_${Date.now()}`;
    let session = db.chatSessions.find(s => s.id === currentSessionId);
    
    if (!session) {
      session = {
        id: currentSessionId,
        user_id: user.id,
        messages: [],
        created_at: new Date().toISOString()
      };
      db.chatSessions.push(session);
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    });

    // Simulate AI Generation
    const botReply = {
      role: 'assistant',
      content: generateMockAIBlogDraft(prompt),
      timestamp: new Date().toISOString()
    };

    session.messages.push(botReply);
    writeDB(db);

    return NextResponse.json({
      sessionId: session.id,
      reply: botReply.content
    });

  } catch (error) {
    console.error('Chat generate API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

function generateMockAIBlogDraft(prompt) {
  // A sophisticated mock AI response
  const lowerPrompt = prompt.toLowerCase();
  
  const aiDraft = {
    title: `Exploring ${prompt.substring(0, 30)}...`,
    content: {
      introduction: `In this post, we'll dive deep into the technical nuances of the topic you requested: "${prompt}". This is a generated draft demonstrating our systems engineering approach.`,
      sections: [
        {
          type: 'text',
          title: 'Understanding the Core Concepts',
          content: 'Modern infrastructure requires robust, scale-to-zero paradigms. When designing systems, always prioritize edge-first deployment and minimal latency.'
        },
        {
          type: 'code',
          title: 'Implementation Example',
          language: 'python',
          content: `def process_data(payload):\n    # Simulate high performance processing\n    print(f"Processing {payload}")\n    return True`
        }
      ],
      conclusion: 'By integrating these paradigms, your stack will be significantly more resilient and cost-effective.'
    },
    draft_status: 'ready'
  };

  return JSON.stringify(aiDraft, null, 2);
}

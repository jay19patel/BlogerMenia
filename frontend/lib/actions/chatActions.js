'use server';

import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';
import Blog from '@/models/Blog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createBlogAction } from './blogActions';

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
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Session save error:', err);
  }
}

export async function generateBlogAction(userMessage, sessionId = null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Not authenticated');

    const id = sessionId || uuidv4();
    let { conversation, blogState } = await loadSession(id);
    
    // Simplistic mock response if we don't have the actual AI integration here
    // Ideally you'd call Gemini or OpenAI here.
    conversation.push({ role: 'user', content: userMessage });
    
    const reply = "I have drafted a blog based on your request.";
    const title = "Generated Blog";
    
    blogState = {
      title,
      subtitle: "Subtitle",
      excerpt: "Excerpt",
      content: {
        introduction: "Introduction...",
        sections: [{ heading: "Section 1", content: "Content here" }],
        conclusion: "Conclusion"
      },
      category: "AI",
      tags: ["AI"],
      is_published: false
    };

    conversation.push({ role: 'assistant', content: reply });
    await saveSession(id, conversation, blogState);

    return { reply, session_id: id, blog_state: blogState };
  } catch (err) {
    console.error('generateBlogAction error:', err);
    throw new Error('Failed to generate blog');
  }
}

export async function getSessionStateAction(sessionId) {
  try {
    const session = await loadSession(sessionId);
    return {
      session_id: sessionId,
      conversation: session.conversation,
      blog_state: session.blogState,
    };
  } catch (err) {
    throw new Error('Failed to get session state');
  }
}

export async function saveGeneratedBlogAction(sessionId) {
  try {
    const { blogState } = await loadSession(sessionId);
    if (!blogState) throw new Error('No blog in session to save');
    return await createBlogAction(blogState);
  } catch (err) {
    throw new Error('Failed to save generated blog');
  }
}

export async function deleteSessionAction(sessionId) {
  try {
    await connectToDatabase();
    await ChatSession.deleteOne({ session_id: sessionId });
    return { success: true };
  } catch (err) {
    throw new Error('Failed to delete session');
  }
}

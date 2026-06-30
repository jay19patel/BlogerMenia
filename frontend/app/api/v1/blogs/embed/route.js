import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';

export async function POST(request) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'No MISTRAL_API_KEY' });
  }

  try {
    await connectToDatabase();
    const { blog_id } = await request.json();
    if (!blog_id) return NextResponse.json({ detail: 'blog_id required' }, { status: 400 });

    const blog = await Blog.findById(blog_id).select('title excerpt content embedding_text_hash');
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    // Build text to embed
    const content = blog.content || {};
    const text = [
      blog.title,
      blog.excerpt,
      content.introduction,
      ...(content.sections || []).map((s) => `${s.title || ''} ${s.content || (s.items || []).join(' ')}`.trim()),
      content.conclusion,
    ].filter(Boolean).join('\n\n').slice(0, 8000);

    // Skip if text unchanged (hash comparison)
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(text).digest('hex');
    if (blog.embedding_text_hash === hash) {
      return NextResponse.json({ skipped: true, reason: 'No change' });
    }

    const { Mistral } = await import('@mistralai/mistralai');
    const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

    const resp = await mistral.embeddings.create({
      model: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed',
      inputs: [text],
    });

    const embedding = resp.data?.[0]?.embedding;
    if (embedding) {
      await Blog.updateOne({ _id: blog_id }, { $set: { embedding, embedding_text_hash: hash } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Embed error:', err);
    return NextResponse.json({ detail: 'Embedding failed' }, { status: 500 });
  }
}

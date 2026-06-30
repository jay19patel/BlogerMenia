import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    llm: {
      ok: !!process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_CHAT_MODEL || 'mistral-large-latest',
      provider: 'mistral',
    },
    storage: 'mongodb',
    runtime: 'nextjs',
  });
}

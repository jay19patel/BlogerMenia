import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FAQ from '@/models/FAQ';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Only return active FAQs, sorted by order
    const faqs = await FAQ.find({ is_active: true }).sort({ order: 1 });

    return NextResponse.json({
      count: faqs.length,
      faqs
    });
  } catch (error) {
    console.error("GET FAQs error:", error);
    return NextResponse.json({ detail: "Failed to fetch FAQs" }, { status: 500 });
  }
}

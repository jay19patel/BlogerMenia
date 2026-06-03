import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Testimonial from '@/models/Testimonial';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Only return approved testimonials
    const testimonials = await Testimonial.find({ is_approved: true }).sort({ createdAt: -1 });

    return NextResponse.json({
      count: testimonials.length,
      testimonials
    });
  } catch (error) {
    console.error("GET Testimonials error:", error);
    return NextResponse.json({ detail: "Failed to fetch testimonials" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    // The modal posts { author, designation, content } but the schema requires
    // { name, role, content, rating }. Map fields, fall back to the session
    // for the author name, and default the rating since the UI doesn't expose it.
    const name = (data.name || data.author || session.user?.name || session.user?.email || "").trim();
    const role = (data.role || data.designation || "User").trim();
    const content = (data.content || "").trim();
    const ratingRaw = Number(data.rating);
    const rating = Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : 5;

    if (!name) {
      return NextResponse.json({ detail: "Name is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ detail: "Feedback content is required" }, { status: 400 });
    }

    const newTestimonial = await Testimonial.create({
      name,
      role,
      content,
      rating,
      user: session.user.id,
      is_approved: true,
    });

    return NextResponse.json(newTestimonial, { status: 201 });
  } catch (error) {
    console.error("POST Testimonial error:", error);
    return NextResponse.json({ detail: "Failed to submit testimonial. " + error.message }, { status: 500 });
  }
}

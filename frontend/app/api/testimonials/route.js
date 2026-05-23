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

    const newTestimonial = await Testimonial.create({
      ...data,
      user: session.user.id,
      is_approved: false // Default to false until admin approves
    });

    return NextResponse.json(newTestimonial, { status: 201 });
  } catch (error) {
    console.error("POST Testimonial error:", error);
    return NextResponse.json({ detail: "Failed to submit testimonial. " + error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { detail: "User with this email already exists." },
        { status: 400 }
      );
    }

    // Create the user
    // The pre-save hook in User model will hash the password automatically
    const username = email.split('@')[0];
    const newUser = await User.create({
      email,
      password,
      full_name: full_name || username,
      username,
    });

    return NextResponse.json(
      { 
        message: "User registered successfully", 
        user: { 
          id: newUser._id, 
          email: newUser.email,
          full_name: newUser.full_name
        } 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { detail: "Failed to register user. " + error.message },
      { status: 500 }
    );
  }
}

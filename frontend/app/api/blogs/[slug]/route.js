import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Category from '@/models/Category'; // Need to import this for populate
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const trackView = searchParams.get('track_view') !== 'false';

    let blog;
    
    // Check if slug is an ObjectId or string
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slug)
        .populate('author', 'full_name username email profile_image headline bio blog_count total_views')
        .populate('category', 'name slug');
    } else {
      blog = await Blog.findOne({ slug })
        .populate('author', 'full_name username email profile_image headline bio blog_count total_views')
        .populate('category', 'name slug');
    }

    if (!blog) {
      return NextResponse.json({ detail: "Blog not found" }, { status: 404 });
    }

    if (trackView) {
      blog.views += 1;
      await blog.save();
      
      // Update author's total views
      if (blog.author) {
        await User.findByIdAndUpdate(blog.author._id, { $inc: { total_views: 1 } });
      }
    }

    return NextResponse.json(blog);
  } catch (error) {
    console.error("GET Blog error:", error);
    return NextResponse.json({ detail: "Failed to fetch blog" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    let blog;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slug);
    } else {
      blog = await Blog.findOne({ slug });
    }

    if (!blog) {
      return NextResponse.json({ detail: "Blog not found" }, { status: 404 });
    }

    // Check authorization: only author or admin can edit
    if (blog.author.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ detail: "Forbidden: You don't have permission to edit this blog" }, { status: 403 });
    }

    // Handle is_published toggling
    if (data.is_published && !blog.is_published) {
      data.publishedDate = new Date();
    }

    // Format content correctly for the schema if updating content
    if (data.introduction !== undefined || data.conclusion !== undefined || data.sections !== undefined) {
      const contentObj = {
        introduction: data.introduction !== undefined ? data.introduction : blog.content?.introduction,
        conclusion: data.conclusion !== undefined ? data.conclusion : blog.content?.conclusion,
        sections: data.sections !== undefined ? data.sections : blog.content?.sections || []
      };
      data.content = contentObj;
      delete data.introduction;
      delete data.conclusion;
      delete data.sections;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(blog._id, { $set: data }, { returnDocument: 'after' })
      .populate('author', 'full_name username email profile_image')
      .populate('category', 'name slug');

    return NextResponse.json(updatedBlog);
  } catch (error) {
    console.error("PATCH Blog error:", error);
    return NextResponse.json({ detail: "Failed to update blog. " + error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    let blog;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slug);
    } else {
      blog = await Blog.findOne({ slug });
    }

    if (!blog) {
      return NextResponse.json({ detail: "Blog not found" }, { status: 404 });
    }

    // Check authorization
    if (blog.author.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ detail: "Forbidden: You don't have permission to delete this blog" }, { status: 403 });
    }

    await Blog.findByIdAndDelete(blog._id);
    
    // Decrement user blog count
    await User.findByIdAndUpdate(blog.author, { $inc: { blog_count: -1 } });

    // 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE Blog error:", error);
    return NextResponse.json({ detail: "Failed to delete blog" }, { status: 500 });
  }
}

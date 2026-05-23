import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateObjectId = () => crypto.randomBytes(12).toString('hex');

// Read the gcp blog template
const gcpBlogPath = path.join(__dirname, 'gcp_blog.json');
const gcpBlogTemplate = JSON.parse(fs.readFileSync(gcpBlogPath, 'utf8'));

const users = [];
for (let i = 1; i <= 10; i++) {
  users.push({
    _id: generateObjectId(),
    email: `user${i}@example.com`,
    password: `password${i}`, // This won't be hashed in json but seed script should hash or just leave it for display
    full_name: `Architect User ${i}`,
    username: `user_${i}`,
    headline: `Senior System Architect ${i}`,
    description: `I am a system architect specializing in large scale systems.`,
    bio: `Detailed bio for Architect User ${i} covering years of experience in various technologies.`,
    profile_image: '/profile.png',
    role: 'Creator', // So they appear in creators list if role filter was there
    is_active: true,
    blog_count: 5, // since 50 blogs / 10 users = 5 each
    total_views: Math.floor(Math.random() * 1000) + 100,
    total_likes: Math.floor(Math.random() * 500) + 50
  });
}

const blogs = [];
for (let i = 1; i <= 50; i++) {
  const author = users[(i - 1) % 10]._id;
  
  // Clone the template
  const blogData = JSON.parse(JSON.stringify(gcpBlogTemplate));
  
  blogs.push({
    ...blogData,
    _id: generateObjectId(),
    title: `${blogData.title} Part ${i}`,
    slug: `${blogData.slug}-part-${i}`,
    author: author,
    is_published: true,
    featured: i <= 5, // first 5 are featured
    views: Math.floor(Math.random() * 500) + 50,
    likes: Math.floor(Math.random() * 200) + 20,
    publishedDate: new Date().toISOString()
  });
}

const playlists = [];
for (let i = 1; i <= 20; i++) {
  const owner = users[(i - 1) % 10]._id;
  // Pick some random blogs for this playlist (e.g. 3 blogs)
  const playlistBlogs = [];
  for (let j = 0; j < 3; j++) {
    const randomBlog = blogs[Math.floor(Math.random() * blogs.length)]._id;
    if (!playlistBlogs.includes(randomBlog)) {
      playlistBlogs.push(randomBlog);
    }
  }

  playlists.push({
    _id: generateObjectId(),
    name: `Master Playlist ${i}`,
    slug: `master-playlist-${i}`,
    description: `A master collection of system engineering topics ${i}.`,
    cover_image: '/playlist.png',
    owner: owner,
    is_public: true,
    blogs: playlistBlogs,
    total_views: Math.floor(Math.random() * 500) + 50,
    total_likes: Math.floor(Math.random() * 200) + 20,
    blog_count: playlistBlogs.length
  });
}

const dummyData = {
  users,
  blogs,
  playlists
};

fs.writeFileSync(
  path.join(__dirname, 'dummy_data.json'),
  JSON.stringify(dummyData, null, 2)
);

console.log('Successfully generated dummy_data.json based on gcp_blog.json structure');

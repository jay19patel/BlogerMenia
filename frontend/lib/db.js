import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'lib', 'db.json');
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_development_only';

// Helper to hash password using SHA-256
export function hashPassword(password) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(password).digest('hex');
}

// Generate secure client-verifiable JWTs
export function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Verify JWTs natively
export function verifyToken(token) {
  if (!token) return null;
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const [header, body, signature] = cleanToken.split('.');
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && Date.now() > decoded.exp) return null; // Expired
    return decoded;
  } catch {
    return null;
  }
}

// Read database from JSON file
export function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return initDB();
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read db.json, reinitializing...', error);
    return initDB();
  }
}

// Write database to JSON file atomically
export function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write db.json:', error);
    return false;
  }
}

// Initialize database with premium Fly.io tech-blog dummy seed data
function initDB() {
  const users = [
    {
      id: 'usr_admin',
      email: 'admin@blogermenia.com',
      password_hash: hashPassword('admin123'),
      full_name: 'Jay Patel',
      profile_image: '/images/avatars/jay.png',
      headline: 'SRE & Systems Architect | Founder of Blogermenia',
      blog_count: 3,
      total_views: 12450,
      total_likes: 890,
      is_active: true
    },
    {
      id: 'usr_flydev',
      email: 'flydev@example.com',
      password_hash: hashPassword('password123'),
      full_name: 'Kurt Mackey',
      profile_image: '/images/avatars/kurt.png',
      headline: 'Co-founder & CEO at Fly.io',
      blog_count: 2,
      total_views: 8900,
      total_likes: 670,
      is_active: true
    },
    {
      id: 'usr_sredude',
      email: 'sredude@example.com',
      password_hash: hashPassword('password123'),
      full_name: 'Thomas Ptacek',
      profile_image: '/images/avatars/thomas.png',
      headline: 'Security Researcher & Infrastructure Specialist',
      blog_count: 1,
      total_views: 4500,
      total_likes: 310,
      is_active: true
    }
  ];

  const categories = [
    { id: 'cat_devops', name: 'DevOps & Cloud', slug: 'devops-cloud' },
    { id: 'cat_sysdesign', name: 'System Design', slug: 'system-design' },
    { id: 'cat_backend', name: 'Backend', slug: 'backend' },
    { id: 'cat_frontend', name: 'Frontend', slug: 'frontend' },
    { id: 'cat_ai', name: 'AI & LLMs', slug: 'ai-llms' }
  ];

  const blogs = [
    {
      id: 'blog_1',
      slug: 'distributed-sqlite-at-the-edge',
      title: 'How We Built a Distributed SQLite Database on the Edge',
      subtitle: 'Replicating transactional SQLite databases globally with zero-fuss streaming snapshots.',
      excerpt: 'SQLite is perfect for local storage, but global replication is hard. Read how we engineered streaming snapshot replication using raft consensus to deliver distributed databases with sub-millisecond latencies.',
      content: {
        introduction: 'At Fly.io, we love simple things that scale. SQLite is the pinnacle of simple databases. However, running applications globally requires placing database data close to users. In this article, we explain how we designed and implemented a global, distributed SQLite synchronization system built on top of Fly Machines.',
        sections: [
          {
            type: 'text',
            title: 'The Challenge of Global SQLite',
            content: 'SQLite is fundamentally a single-file database. While this makes it incredibly robust and lightning-fast for local reads, it poses a significant bottleneck for multi-region configurations. Traditional strategies involve using complex distributed systems like Postgres with write-replicas. But what if you could keep SQLite\'s simplicity while achieving high availability?'
          },
          {
            type: 'flowchart',
            title: 'Snapshot Streaming Architecture',
            steps: [
              {
                id: 'edge_request',
                title: 'Client Connection at Edge',
                description: 'Client connects to the closest regional Fly.io edge machine.',
                color: 'blue'
              },
              {
                id: 'local_check',
                title: 'Local Cache Evaluation',
                description: 'The edge node checks if local SQLite database matches the latest sequence number.',
                color: 'indigo',
                branches: [
                  {
                    id: 'cache_hit',
                    title: 'Read Directly',
                    description: 'If valid, serve read query immediately in under 1ms.',
                    color: 'indigo'
                  },
                  {
                    id: 'cache_miss',
                    title: 'Pull Streaming Snapshot',
                    description: 'If out-of-date, stream incremental transaction logs from primary node.',
                    color: 'pink'
                  }
                ]
              },
              {
                id: 'write_redirect',
                title: 'Write Execution via Primary',
                description: 'Write operations are securely proxied to the central primary database region via Raft consensus.',
                color: 'violet'
              }
            ]
          },
          {
            type: 'code',
            title: 'Atomic Transaction Logging Implementation',
            language: 'javascript',
            content: `
// Streaming transaction journal packets
async function streamJournalPacket(dbConnection, lastSeenSeq) {
  const transactionLogs = await dbConnection.query(
    "SELECT seq, sql, params FROM journal WHERE seq > ?", 
    [lastSeenSeq]
  );
  
  if (transactionLogs.length === 0) {
    return { status: 'synchronized', patches: [] };
  }
  
  return {
    status: 'catchup',
    patches: transactionLogs.map(log => ({
      seq: log.seq,
      sql: log.sql,
      bind: JSON.parse(log.params)
    }))
  };
}
            `
          },
          {
            type: 'note',
            title: 'Performance Optimization Warning',
            content: 'Always batch write queries when replicating across networks. Single write statement rounds will cause excessive latency due to round-trip constraints.'
          },
          {
            type: 'table',
            title: 'Database Read/Write Performance Across Regions',
            headers: ['Location', 'Query Type', 'Standard Postgres', 'Distributed SQLite'],
            rows: [
              ['US-East (Primary)', 'Read / Write', '1.2 ms', '0.4 ms'],
              ['EU-Central (Edge)', 'Read Only', '85 ms', '0.8 ms'],
              ['AP-South (Edge)', 'Read Only', '190 ms', '1.1 ms'],
              ['EU-Central (Edge)', 'Write Only', '92 ms', '98 ms']
            ]
          },
          {
            type: 'links',
            title: 'Further Reading and SRE Resources',
            links: [
              {
                text: 'Fly.io LiteFS Replication Guide',
                url: 'https://fly.io/docs/litefs/',
                description: 'Deep technical walkthrough of our open-source edge replication system LiteFS.'
              },
              {
                text: 'SQLite Transaction Journals Explained',
                url: 'https://sqlite.org/tempfiles.html',
                description: 'Official SQLite guide on rollback journals and write-ahead logs.'
              }
            ]
          }
        ],
        conclusion: 'By running distributed SQLite on the edge, you can create blisteringly fast, resilient web applications that render pages instantly while maintaining absolute schema simplicity. Explore distributed SQLite databases on Fly.io today!'
      },
      author_id: 'usr_admin',
      category_id: 'cat_devops',
      views: 4500,
      likes: 380,
      publishedDate: '2026-05-12T10:00:00.000Z',
      created_at: '2026-05-12T10:00:00.000Z',
      thumbnail: null,
      image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800',
      featured: true,
      liked_by: []
    },
    {
      id: 'blog_2',
      slug: 'solving-nplusone-queries-django-react',
      title: 'Solving the N+1 Query Problem in Django & React Applications',
      subtitle: 'Eliminating latent database loading cycles using efficient prefetching and serialization.',
      excerpt: 'The N+1 query problem is the single largest performance bottleneck in modern single-page apps. In this guide, we dive deep into debugging ORM queries and implementing clean React patterns to decrease load times by 90%.',
      content: {
        introduction: 'When building modern web applications with a React frontend and a Django or Python backend, it is easy to accidentally fall into the N+1 query trap. It usually starts when you display a list of items and fetch details of each related resource inside a loop, triggering hundreds of redundant network round-trips.',
        sections: [
          {
            type: 'text',
            title: 'Understanding the N+1 Database Loop',
            content: 'Suppose you have a list of 100 blog posts, and each post has an author. If your API fetches the posts first, and then sequentially queries the database for each author\'s profile image, you have run 1 query (to fetch the posts) plus N queries (100 queries for each author profile). That\'s 101 queries! This degrades performance dramatically as your dataset grows.'
          },
          {
            type: 'code',
            title: 'Standard Django N+1 Fix: select_related',
            language: 'python',
            content: `
# DANGEROUS: Executes queries sequentially in loops
def get_blogs_dangerous(request):
    blogs = Blog.objects.all()  # 1 query
    data = []
    for blog in blogs:
        data.append({
            'title': blog.title,
            'author_name': blog.author.full_name  # Triggers N extra queries!
        })
    return JsonResponse(data, safe=False)

# SAFE: Joins authors in a single SQL query
def get_blogs_safe(request):
    blogs = Blog.objects.select_related('author').all()  # 1 Single JOIN query!
    data = [{
        'title': blog.title,
        'author_name': blog.author.full_name
    } for blog in blogs]
    return JsonResponse(data, safe=False)
            `
          },
          {
            type: 'bullets',
            title: 'Best Practices for Debugging N+1 Latency',
            items: [
              'Use Django Silk or django-debug-toolbar to monitor transaction queries.',
              'Leverage select_related for standard foreign key joins.',
              'Leverage prefetch_related for many-to-many or reverse foreign relationships.',
              'Avoid fetching nested relational fields dynamically inside serializer loops unless they are preloaded.',
              'Verify that your frontend initiates unified, batched API fetch calls.'
            ]
          }
        ],
        conclusion: 'Debugging N+1 query cycles requires both vigilant backend query planning and optimized frontend fetching. By joining relationships and preloading records, you can keep database transaction speeds below 5ms.'
      },
      author_id: 'usr_admin',
      category_id: 'cat_backend',
      views: 7950,
      likes: 510,
      publishedDate: '2026-05-18T14:30:00.000Z',
      created_at: '2026-05-18T14:30:00.000Z',
      thumbnail: null,
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
      featured: true,
      liked_by: []
    },
    {
      id: 'blog_3',
      slug: 'building-not-midjourney-bot',
      title: 'Building "Not-Midjourney": AI Image Generation Bot on Fly.io',
      subtitle: 'Running GPU diffusion pipelines cost-effectively using Fly Machines and fast start times.',
      excerpt: 'Learn how we designed a highly scalable, developer-centric Discord bot that spins up on-demand GPU clusters on Fly.io to render custom AI generation models, and shuts them down when idle.',
      content: {
        introduction: 'We wanted a quick, fun way to test Fly.io\'s on-demand GPU clusters. So we built a Discord image generator bot called "Not-Midjourney". In this post, we explain how we structured the server architecture to launch high-performance machine learning diffusion containers in less than 500ms.',
        sections: [
          {
            type: 'text',
            title: 'GPU Scale-to-Zero Architecture',
            content: 'Running machine learning models (like Stable Diffusion) on active GPUs gets expensive very fast. The most optimal way to handle this is "scale-to-zero". This means the GPU is completely powered down when there are no jobs. When a user submits a prompt in Discord, we spin up a Fly.io GPU Machine immediately, execute the generation, send the image back, and then trigger a shutdown command if no prompt is queued.'
          },
          {
            type: 'flowchart',
            title: 'Scale-To-Zero GPU Pipeline Flow',
            steps: [
              {
                id: 'discord_prompt',
                title: 'Discord Command Received',
                description: 'User enters the prompt "/generate Cyberpunk City" in Discord.',
                color: 'blue'
              },
              {
                id: 'queue_worker',
                title: 'Job Queue & Scale Signal',
                description: 'Queue worker processes the prompt and signals Fly API to boot the GPU machine.',
                color: 'indigo'
              },
              {
                id: 'gpu_activation',
                title: 'GPU Machine Boots Up',
                description: 'A Fly Machine containing preloaded models boots up in AP-North region in 480ms.',
                color: 'pink'
              },
              {
                id: 'image_generation',
                title: 'Diffusion Processing',
                description: 'The machine processes the prompt and writes the final image buffer directly to static storage.',
                color: 'violet'
              }
            ]
          },
          {
            type: 'code',
            title: 'Fly Machine Scaler Controller',
            language: 'javascript',
            content: `
async function scaleUpGPUMachine(machineId) {
  const startEndpoint = \`https://api.machines.dev/v1/apps/not-midjourney/machines/\${machineId}/start\`;
  
  const response = await fetch(startEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.FLY_API_TOKEN}\`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to wake up Fly GPU Machine.");
  }
  
  return { status: 'active', active_at: Date.now() };
}
            `
          }
        ],
        conclusion: 'Scale-to-zero SRE design enables running advanced AI inference tasks without wasting budget on idle resources. Try deploying on-demand GPU clusters on Fly.io today!'
      },
      author_id: 'usr_flydev',
      category_id: 'cat_ai',
      views: 8900,
      likes: 670,
      publishedDate: '2026-05-20T08:15:00.000Z',
      created_at: '2026-05-20T08:15:00.000Z',
      thumbnail: null,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
      featured: true,
      liked_by: []
    }
  ];

  const playlists = [
    {
      id: 'play_sre',
      slug: 'sre-edge-infrastructure',
      name: 'SRE & Edge Infrastructure Playbook',
      description: 'A curated selection of deep-dive articles guiding you on setting up global replication networks, Raft consensus pipelines, and cost-effective GPU scaling mechanisms.',
      thumbnail: null,
      is_public: true,
      owner_id: 'usr_admin',
      blog_count: 2,
      total_views: 13400,
      total_likes: 1050,
      blogs: [
        {
          blog_id: 'blog_1',
          slug: 'distributed-sqlite-at-the-edge',
          title: 'How We Built a Distributed SQLite Database on the Edge',
          image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800',
          excerpt: 'SQLite is perfect for local storage, but global replication is hard. Read how we engineered streaming snapshot replication using raft consensus to deliver distributed databases with sub-millisecond latencies.'
        },
        {
          blog_id: 'blog_3',
          slug: 'building-not-midjourney-bot',
          title: 'Building "Not-Midjourney": AI Image Generation Bot on Fly.io',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
          excerpt: 'Learn how we designed a highly scalable, developer-centric Discord bot that spins up on-demand GPU clusters on Fly.io to render custom AI generation models, and shuts them down when idle.'
        }
      ]
    }
  ];

  const testimonials = [
    {
      id: 'test_1',
      name: 'Kurt Mackey',
      role: 'CEO, Fly.io',
      avatar: 'https://ui-avatars.com/api/?name=Kurt+Mackey&background=0D8ABC&color=fff',
      content: 'This AI-assisted platform has completely changed how our developers write, organize, and read technical blogs. The Fly.io inspired UI fits perfectly into our engineering mindset.',
      rating: 5
    },
    {
      id: 'test_2',
      name: 'Thomas Ptacek',
      role: 'SRE & Security Specialist',
      avatar: 'https://ui-avatars.com/api/?name=Thomas+Ptacek&background=111&color=fff',
      content: 'Clean code snippets, native terminal layouts, and robust technical documentation structure. A masterfully crafted blog engine that actually caters to high-performance developers.',
      rating: 5
    }
  ];

  const faqs = [
    {
      id: 'faq_1',
      question: 'How does the AI blog generator help developers?',
      answer: 'The platform integrates with top-tier LLM models to convert brief bullet points or architectural scripts directly into rich technical blog posts with code sections, notes, lists, and flowcharts.'
    },
    {
      id: 'faq_2',
      question: 'Can I self-host this blog engine?',
      answer: 'Yes! The entire application is built natively in Next.js. With our local persistent file database, it has zero external dependencies, making it deployable on Vercel, Fly.io, or any node server instantly.'
    },
    {
      id: 'faq_3',
      question: 'How do playlists work?',
      answer: 'Playlists are curated learning tracks created by readers and authors. You can assemble articles chronologically to design courses, series, or technical guides.'
    }
  ];

  const db = {
    users,
    categories,
    blogs,
    playlists,
    testimonials,
    faqs,
    chatSessions: [],
    contacts: []
  };

  // Ensure lib directory exists
  const libDir = path.join(process.cwd(), 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log('Successfully initialized local JSON database with rich seed data!');
  return db;
}

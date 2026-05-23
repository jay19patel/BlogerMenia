import { Storage } from '@google-cloud/storage';

// Initialize storage object
let storage;

try {
  // We use private key and client email from env variables to avoid needing a physical key.json file
  // This is much safer and easier for deployments like Vercel
  const projectId = process.env.GCS_PROJECT_ID;
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  // Replace literal '\n' with actual newlines in case it's escaped in .env
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  } else {
    console.warn("Google Cloud Storage credentials are not fully configured in environment variables.");
    // Fallback to default credentials (e.g. if GOOGLE_APPLICATION_CREDENTIALS is set)
    storage = new Storage();
  }
} catch (error) {
  console.error("Failed to initialize Google Cloud Storage:", error);
}

export const bucketName = process.env.GCS_BUCKET_NAME || 'blogermenia-bucket';
export const bucket = storage ? storage.bucket(bucketName) : null;
export default storage;

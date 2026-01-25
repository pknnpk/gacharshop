import { Storage } from '@google-cloud/storage';

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix newline escaping
    },
});

const bucketName = process.env.GCP_BUCKET_NAME || 'gachar-user-uploads';
const bucket = storage.bucket(bucketName);

/**
 * Uploads a file buffer to Google Cloud Storage
 * @param buffer The file buffer
 * @param filename The desired filename in the bucket
 * @param contentType The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadImageToGCS(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const file = bucket.file(filename);

    await file.save(buffer, {
        metadata: {
            contentType: contentType,
            cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
    });

    // Make the file public (if bucket isn't already, but usually explicit public access is needed for individual objects if bucket isn't uniform public)
    // However, "storage.objects.create" permission doesn't imply "storage.objects.setIamPolicy"
    // For now, we assume the bucket or object is accessible. 
    // Usually with a "Uniform" bucket level access, we just need the link.
    // If not, we might need: await file.makePublic(); 
    // Let's try to make it public explicitly to be safe, assuming the SA has permission.
    try {
        // Attempt to make public, but don't fail if it doesn't work (we'll use proxy)
        await file.makePublic();
    } catch (e) {
        // console.warn('Failed to make file public, check bucket permissions:', e);
        // This is expected if 'Uniform Bucket Level Access' is on.
    }

    // Return relative URL for our proxy
    return `/api/images/${filename}`;
}

/**
 * Gets a read stream for a file from GCS
 * @param filename The filename in the bucket
 * @returns A readable stream of the file content and its metadata
 */
export async function getFileStream(filename: string) {
    const file = bucket.file(filename);
    const [exists] = await file.exists();

    if (!exists) {
        throw new Error('File not found');
    }

    const [metadata] = await file.getMetadata();
    const stream = file.createReadStream();

    return {
        stream,
        contentType: metadata.contentType || 'application/octet-stream',
        contentLength: metadata.size,
    };
}

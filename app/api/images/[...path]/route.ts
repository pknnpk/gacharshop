import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/storage';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathArray } = await params;
        const path = pathArray.join('/');

        // Security check: unexpected path traversal or invalid paths
        // decoded path should not contain '..'
        const decodedPath = decodeURIComponent(path);
        if (decodedPath.includes('..')) {
            return new NextResponse('Invalid path', { status: 400 });
        }

        const { stream, contentType, contentLength } = await getFileStream(decodedPath);

        // Convert Node.js readable stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk));
                stream.on('end', () => controller.close());
                stream.on('error', (err) => controller.error(err));
            },
        });

        // Set cache control headers for performance. Profile images can be cached, but maybe not too aggressively if they change often?
        // Actually, the filename changes with timestamp, so we can aggressively cache immutable content.
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        if (contentLength) {
            headers.set('Content-Length', contentLength.toString());
        }
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(webStream, {
            status: 200,
            headers,
        });

    } catch (error: any) {
        console.error('Error serving image:', error);
        if (error.message === 'File not found') {
            return new NextResponse('File not found', { status: 404 });
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { uploadImageToGCS } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return false;
    }
    return true;
}

export async function POST(req: NextRequest) {
    if (!await checkAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `products/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Upload to GCS
        const url = await uploadImageToGCS(buffer, filename, file.type);

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

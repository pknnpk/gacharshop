import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

import { uploadImageToGCS } from '@/lib/storage';

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectToDatabase();

        // Parse FormData instead of JSON
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        const name = formData.get('name') as string | null;

        const updateData: any = {};

        if (name) {
            updateData.name = name;
        }

        if (file) {
            // Validate file type/size if needed (already basic checks on frontend, but good to have here)
            // Convert to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Create a unique filename
            const timestamp = Date.now();
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storagePath = `users/${session.user.id}/profile_${timestamp}_${cleanFileName}`;

            // Upload to GCS
            const publicUrl = await uploadImageToGCS(buffer, storagePath, file.type);
            updateData.image = publicUrl;
        }

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            updateData,
            { new: true }
        );

        return NextResponse.json(updatedUser);
    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
    }
}

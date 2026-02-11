
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Location from '@/models/Location';
import { logAdminAction } from '@/lib/audit';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
}

export async function GET(req: NextRequest) {
    await connectToDatabase();
    // Allow reading locations for internal use, but ensuring admin for management
    // For listing, we can just return all
    const locations = await Location.find({}).sort({ name: 1 });
    return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        // Validation could be added here

        const location = await Location.create(body);

        await logAdminAction({
            action: 'CREATE_LOCATION',
            entity: 'Location',
            entityId: location._id.toString(),
            performedBy: adminUser.id,
            details: body,
            req
        });

        return NextResponse.json(location, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const location = await Location.findByIdAndUpdate(_id, updateData, { new: true });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        await logAdminAction({
            action: 'UPDATE_LOCATION',
            entity: 'Location',
            entityId: _id,
            performedBy: adminUser.id,
            details: updateData,
            req
        });

        return NextResponse.json(location);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

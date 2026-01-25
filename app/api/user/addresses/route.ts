import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Address from '@/models/Address';
import User from '@/models/User';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Direct user ID usage is safer and works for no-email accounts
    const addresses = await Address.find({ user: session.user.id }).sort({ isDefault: -1, createdAt: -1 });

    return NextResponse.json(addresses);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Since session.user.id comes from the token which came from the DB, validity is implicit.
    // If strict consistency is needed, we can check exists, but we can also just use the ID.
    const userId = session.user.id;

    const body = await req.json();

    // If new address is set as default, unset others first
    if (body.isDefault) {
        await Address.updateMany({ user: userId }, { isDefault: false });
    } else {
        // If this is the FIRST address, force it to be default
        const count = await Address.countDocuments({ user: userId });
        if (count === 0) {
            body.isDefault = true;
        }
    }

    try {
        const address = await Address.create({
            ...body,
            user: userId,
        });

        return NextResponse.json(address);
    } catch (error: any) {
        console.error('Error creating address:', error);
        return NextResponse.json({ error: error.message || 'Failed to create address' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Address from '@/models/Address';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const address = await Address.findById(id);
    if (!address) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Verify ownership
    const user = await User.findOne({ email: session.user.email });
    if (!user || user._id.toString() !== address.user.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.isDefault) {
        await Address.updateMany({ user: user._id, _id: { $ne: id } }, { isDefault: false });
    }

    const updatedAddress = await Address.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json(updatedAddress);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const address = await Address.findById(id);
    if (!address) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Verify ownership
    const user = await User.findOne({ email: session.user.email });
    if (!user || user._id.toString() !== address.user.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Address.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
}

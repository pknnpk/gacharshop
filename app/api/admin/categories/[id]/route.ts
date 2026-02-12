
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import Product from '@/models/Product';
import slugify from 'slugify';
import { logAdminAction } from '@/lib/audit';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
}

// Helper to safely get ID from params
async function getId(params: any): Promise<string> {
    const p = await params;
    return p.id;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    if (!await checkAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);
        const category = await Category.findById(id).populate('parent');
        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);
        const body = await req.json();

        // Prevent Circular Dependency
        if (body.parent === id) {
            return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 });
        }

        const updates: any = {
            description: body.description,
            image: body.image
        };

        if (body.name) {
            updates.name = body.name;
            updates.slug = slugify(body.name, { lower: true, strict: true });
        }

        // Handle Parent Change
        if (body.parent !== undefined) {
            const parentId = body.parent || null;
            let ancestors: any[] = [];
            let level = 0;

            if (parentId) {
                const parent = await Category.findById(parentId);
                if (!parent) {
                    return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
                }
                // Check if new parent is a descendant of current category (Loop check)
                // If parent.ancestors contains current category ID, it's a loop.
                const isDescendant = parent.ancestors.some((a: any) => a._id.toString() === id);
                if (isDescendant) {
                    return NextResponse.json({ error: 'Cannot set a descendant as parent' }, { status: 400 });
                }

                ancestors = [...(parent.ancestors || []), { _id: parent._id, name: parent.name, slug: parent.slug }];
                level = parent.level + 1;
            }

            updates.parent = parentId;
            updates.ancestors = ancestors;
            updates.level = level;

            // Note: If we change the parent, we SHOULD technically update all children of THIS category too.
            // This is "cascading updates". For Phase 1, we might skip or handle simpler.
            // Let's defer cascading updates for now to keep it simple, or warn user.
        }

        const category = await Category.findByIdAndUpdate(id, updates, { new: true });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        await logAdminAction({
            action: 'UPDATE_CATEGORY',
            entity: 'Category',
            entityId: id,
            performedBy: adminUser.id,
            details: updates,
            req
        });

        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);

        // Check for children
        const hasChildren = await Category.exists({ parent: id });
        if (hasChildren) {
            return NextResponse.json({ error: 'Cannot delete category with sub-categories. Please move or delete them first.' }, { status: 400 });
        }

        // Check for products
        const hasProducts = await Product.exists({ category: id });
        if (hasProducts) {
            return NextResponse.json({ error: 'Cannot delete category with associated products.' }, { status: 400 });
        }

        await Category.findByIdAndDelete(id);

        await logAdminAction({
            action: 'DELETE_CATEGORY',
            entity: 'Category',
            entityId: id,
            performedBy: adminUser.id,
            details: {},
            req
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

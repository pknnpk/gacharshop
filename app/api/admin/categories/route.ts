
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import slugify from 'slugify';
import { logAdminAction } from '@/lib/audit';

async function checkAdmin() {
    try {
        const session = await getServerSession(authOptions);
        console.log('checkAdmin session:', session?.user?.email, session?.user?.role);
        if (!session || session.user?.role !== 'admin') {
            console.log('checkAdmin failed: Unauthorized');
            return null; // Unauthorized
        }
        return session.user;
    } catch (error) {
        console.error('Error in checkAdmin:', error);
        return null; // Treat error as unauthorized/failure
    }
}

// Helper to build ancestors array
async function buildAncestors(parentId: string | null) {
    if (!parentId) return [];

    // Using a properly type assertion if needed, or relying on model
    const parent = await Category.findById(parentId).lean();
    if (!parent) return [];

    // Parent's ancestors + Parent itself
    return [...(parent.ancestors || []), { _id: parent._id, name: parent.name, slug: parent.slug }];
}

export async function GET(req: NextRequest) {
    console.log('GET /api/admin/categories started');
    try {
        await connectToDatabase();
        if (!await checkAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Return flat list, client can build tree
        // Or return tree directly? For admin table, flat list with 'parent' populated is often easier
        const categories = await Category.find({}).sort({ level: 1, name: 1 }).populate('parent', 'name').lean();
        return NextResponse.json(categories);
    } catch (error: any) {
        console.error('API Error in GET /api/admin/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const slug = slugify(body.name, { lower: true, strict: true });

        // Check duplicate
        const existing = await Category.findOne({ slug });
        if (existing) {
            return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
        }

        const parentId = body.parent || null;
        let ancestors: any[] = [];
        let level = 0;

        if (parentId) {
            const parent = await Category.findById(parentId);
            if (!parent) {
                return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
            }
            ancestors = [...(parent.ancestors || []), { _id: parent._id, name: parent.name, slug: parent.slug }];
            level = parent.level + 1;
        }

        const newCategory = await Category.create({
            name: body.name,
            slug,
            description: body.description,
            image: body.image,
            parent: parentId,
            ancestors,
            level
        });

        await logAdminAction({
            action: 'CREATE_CATEGORY',
            entity: 'Category',
            entityId: newCategory._id,
            performedBy: adminUser.id,
            details: { name: body.name, parent: parentId },
            req
        });

        return NextResponse.json(newCategory, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

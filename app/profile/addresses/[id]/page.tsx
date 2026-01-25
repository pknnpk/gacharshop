import Address from '@/models/Address';
import connectToDatabase from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import AddressForm from '@/components/AddressForm';

async function getAddress(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) return null;

    await connectToDatabase();

    // Find address and verify ownership
    const address = await Address.findOne({ _id: id, user: session.user.id });

    if (!address) return null;

    return JSON.parse(JSON.stringify(address));
}

export default async function EditAddressPage({ params }: { params: { id: string } }) {
    // Await params in Next.js 15+ (v16 is used here so params is a promise? check docs, usually props are awaited or async)
    // Next.js 15 breaking change: params is a promise.
    // user said v16.1.1. In v15+, params is async.
    const { id } = await params;
    const address = await getAddress(id);

    if (!address) {
        redirect('/profile/addresses');
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Wrapper is similar to Add page, but AddressForm handles mostly everything. 
                However, AddressForm seems to expect being inside a container from previous AddPage code?
                Let's check AddPage refactor again.
                AddPage just returns <AddressForm />.
                So EditPage can just return <AddressForm initialData={address} isEdit={true} />
            */}
            <AddressForm initialData={address} isEdit={true} />
        </div>
    );
}

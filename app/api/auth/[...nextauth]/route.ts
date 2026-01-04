
import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LineProvider from 'next-auth/providers/line';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        LineProvider({
            clientId: process.env.LINE_CHANNEL_ID!,
            clientSecret: process.env.LINE_CHANNEL_SECRET!,
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            await connectToDatabase();

            try {
                const { email, name, image, id } = user;
                const provider = account?.provider;
                console.log("DEBUG: signIn callback triggered");
                console.log("DEBUG: User:", JSON.stringify(user, null, 2));
                console.log("DEBUG: Account:", JSON.stringify(account, null, 2));
                const providerId = account?.providerAccountId;

                if (!email && provider === 'line') {
                    // Handle cases where LINE might not return email (requires specific scope configuration)
                    // For now, allow but warn or rely on providerId
                }


                // Check if user exists
                const matchers = [];
                if (email) matchers.push({ email });
                if (providerId) matchers.push({ providerId, provider });

                let dbUser = null;
                if (matchers.length > 0) {
                    dbUser = await User.findOne({ $or: matchers });
                }

                if (!dbUser) {
                    // Create new user
                    dbUser = await User.create({
                        name: name,
                        ...(email && { email }), // Only include email if present
                        image: image,
                        provider: provider,
                        providerId: providerId,
                        role: 'user',
                    });
                } else {
                    // Update existing user info if needed (e.g. image changed)
                    // Also link provider if matched by email but provider was different (Merging logic)
                    if (!dbUser.providerId && providerId) {
                        dbUser.provider = provider;
                        dbUser.providerId = providerId;
                    }
                    dbUser.name = name;
                    dbUser.image = image;
                    await dbUser.save();
                }

                // Pass user id to the token
                user.id = dbUser._id.toString();
                user.role = dbUser.role;

                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

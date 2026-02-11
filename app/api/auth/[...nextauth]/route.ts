
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
            authorization: { params: { scope: 'profile openid email' } },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            await connectToDatabase();

            try {
                const fs = await import('fs');
                const path = await import('path');
                const logPath = path.join(process.cwd(), 'auth-debug.log');
                const log = (msg: string) => fs.appendFileSync(logPath, new Date().toISOString() + ': ' + msg + '\n');

                log("signIn callback triggered");
                const { email, name, image, id } = user;
                const provider = account?.provider;

                log(`User: ${JSON.stringify(user)}`);
                log(`Account: ${JSON.stringify(account)}`);

                const providerId = account?.providerAccountId;

                if (!email && provider === 'line') {
                    log("Warning: No email from LINE");
                }

                // Check if user exists
                const matchers = [];
                if (email) matchers.push({ email });
                if (providerId) matchers.push({ providerId, provider });

                log(`Matchers: ${JSON.stringify(matchers)}`);

                let dbUser = null;
                if (matchers.length > 0) {
                    const mongooseState = require('mongoose').connection.readyState;
                    log(`Mongoose readyState: ${mongooseState}`);
                    log(`User model db name: ${User.db.name}`);
                    log(`User model db readyState: ${User.db.readyState}`);

                    dbUser = await User.findOne({ $or: matchers });
                }

                if (!dbUser) {
                    log("Creating new user...");
                    // Create new user
                    try {
                        dbUser = await User.create({
                            name: name || 'User', // Fallback name
                            ...(email && { email }), // Only include email if present
                            image: image,
                            provider: provider,
                            providerId: providerId,
                            role: 'user',
                        });
                        log("User created successfully");
                    } catch (createError) {
                        log(`Error creating user: ${createError}`);
                        throw createError;
                    }
                } else {
                    log(`Updating existing user: ${dbUser._id}`);
                    // Update existing user info if needed (e.g. image changed)
                    // Also link provider if matched by email but provider was different (Merging logic)
                    if (!dbUser.providerId && providerId) {
                        dbUser.provider = provider;
                        dbUser.providerId = providerId;
                    }
                    dbUser.name = name || dbUser.name;
                    dbUser.image = image;
                    await dbUser.save();
                }

                // Pass user id to the token
                user.id = dbUser._id.toString();
                user.role = dbUser.role;

                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                const fs = await import('fs');
                const path = await import('path');
                const logPath = path.join(process.cwd(), 'auth-debug.log');
                fs.appendFileSync(logPath, new Date().toISOString() + ': CRITICAL ERROR: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\n');
                return false;
            }
        },
        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.picture = user.image;
                if (account?.provider) {
                    token.provider = account.provider;
                }
            }

            // Support client-side update() calls
            if (trigger === 'update' && session?.image) {
                token.picture = session.image;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.image = token.picture as string | null | undefined;
                session.user.provider = token.provider as string | undefined;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

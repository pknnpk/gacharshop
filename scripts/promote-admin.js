
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env');
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    image: String,
    role: { type: String, default: 'user' },
    provider: String,
    providerId: String,
}, { timestamps: true });

// Prevent overwriting model if already compiled
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function promoteUser(identifier, emailToSet) {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Try to find by email first
        let user = await User.findOne({ email: identifier });

        // If not found, try by providerId
        if (!user) {
            console.log(`User with email "${identifier}" not found. Checking providerId...`);
            user = await User.findOne({ providerId: identifier });
        }

        if (user) {
            console.log(`Found user: ${user.name} (${user._id})`);
            user.role = 'admin';

            if (emailToSet && (!user.email || user.email !== emailToSet)) {
                console.log(`Updating email from "${user.email}" to "${emailToSet}"`);
                user.email = emailToSet;
            }

            await user.save();
            console.log(`Successfully promoted ${user.name} to admin.`);
            console.log('Final User Record:', user);
        } else {
            console.log(`User with identifier "${identifier}" not found.`);
        }
    } catch (error) {
        console.error('Error promoting user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit();
    }
}

// Get args
const identifier = process.argv[2];
const emailToSet = process.argv[3];

if (!identifier) {
    console.log('Usage: node scripts/promote-admin.js <email_or_provider_id> [email_to_set_if_missing]');
    process.exit(1);
}

promoteUser(identifier, emailToSet);

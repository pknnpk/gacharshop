
export default function PrivacyPage() {
    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
            <p>
                This is a placeholder Privacy Policy for the Gachar Shop.
                We collect your name, email, and profile picture to facilitate user authentication and order processing.
                We do not share your data with third parties.
            </p>
        </div>
    );
}

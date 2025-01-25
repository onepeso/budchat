import {useState, useEffect} from "react";
import Messages from "./Messages";
import MessageInput from "./MessageInput";
import UserStatus from "./UserStatus";
import {supabasePromise} from "./supabase"; // Import the promise
import {useNavigate} from "react-router-dom"; // For navigation

const Chat = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
    const navigate = useNavigate();

    useEffect(() => {
        // Wait for Supabase to initialize
        supabasePromise.then((client) => {
            setSupabase(client);
        }).catch((error) => {
            console.error('Failed to initialize Supabase:', error);
        });
    }, []);

    // Logout function
    const handleLogout = async () => {
        if (!supabase) return;

        try {
            // Sign out from Supabase Auth
            const {error} = await supabase.auth.signOut();
            if (error) {
                throw error;
            }

            // Redirect to the root path ("/")
            navigate("/");
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    <Messages/>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                    <MessageInput/>
                </div>
            </div>

            {/* Right Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 transition-transform duration-200 ease-in-out transform ${
                    isSidebarOpen ? "translate-x-0" : "translate-x-full"
                } md:translate-x-0 md:relative`}
            >
                {/* Toggle Button (for small screens) */}
                <button
                    className="absolute -left-12 top-4 p-2 bg-blue-500 text-white rounded-full md:hidden"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? "✕" : "☰"}
                </button>

                {/* Sidebar Content */}
                <div className="h-full flex flex-col">
                    {/* UserStatus Component */}
                    <div className="p-4 overflow-y-auto flex-1">
                        <UserStatus/>
                    </div>

                    {/* Logout Button */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
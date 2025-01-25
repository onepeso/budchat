import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "./AuthContext";
import {supabasePromise} from "./supabase"; // Import the promise
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface MessageInputProps {
    onMessageSent?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({onMessageSent}) => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
    const {user} = useAuth();
    const navigate = useNavigate();

    console.log(error);

    useEffect(() => {
        // Wait for Supabase to initialize
        supabasePromise.then((client) => {
            setSupabase(client);
        }).catch((error) => {
            console.error('Failed to initialize Supabase:', error);
            setError('Failed to initialize Supabase');
        });
    }, []);

    const handleEmojiSelect = (emoji: any) => {
        setMessage((prevMessage) => prevMessage + emoji.native);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            navigate("/login");
            return;
        }

        if (message.trim() === "") {
            setError("Message cannot be empty");
            return;
        }

        if (!supabase) {
            setError("Supabase client is not initialized");
            return;
        }

        setLoading(true);
        try {
            const {error: insertError} = await supabase
                .from("messages")
                .insert([
                    {
                        content: message.trim(),
                        user_id: user.id,
                    },
                ]);

            if (insertError) throw insertError;

            setMessage("");
            setError(null);
            onMessageSent?.();
        } catch (err) {
            console.error("Error sending message:", err);
            setError("Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="p-4 text-center border-t border-gray-300">
                Please{" "}
                <button
                    onClick={() => navigate("/login")}
                    className="text-blue-500 hover:text-blue-700 underline"
                >
                    login
                </button>
                {" "}
                to send messages
            </div>
        );
    }

    return (
        <div className="sticky bottom-0 w-full bg-white p-4 border-t border-gray-400">
            <div className="max-w-4xl mx-auto flex items-center space-x-2">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="p-2 text-xl"
                >
                    😊
                </button>

                {showPicker && (
                    <div className="absolute left-5 bottom-24 z-10">
                        <Picker data={data} onEmojiSelect={handleEmojiSelect}/>
                    </div>
                )}
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center w-full space-x-2"
                >
                    <input
                        type="text"
                        className="flex-grow p-2 text-sm text-black bg-gray-100 border border-gray-300 rounded-lg focus:outline-none"
                        placeholder="Send a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={loading}
                    />

                    <button
                        type="submit"
                        className={`py-2 px-4 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors ${
                            loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        disabled={loading}
                    >
                        {loading ? "Sending..." : "Send"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MessageInput;
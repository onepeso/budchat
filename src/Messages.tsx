import React, {useEffect, useState, useRef} from "react";
import {supabasePromise} from "./supabase"; // Import the promise
import {Send, X} from "lucide-react";

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    username?: string;
    parent_message_id?: string | null;
}

interface Error {
    message: string;
}

const Messages: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [replyContent, setReplyContent] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Wait for Supabase to initialize
        supabasePromise.then((client) => {
            setSupabase(client);
        }).catch((error) => {
            console.error('Failed to initialize Supabase:', error);
            setError({message: 'Failed to initialize Supabase'});
        });
    }, []);

    useEffect(() => {
        if (!supabase) return; // Exit if Supabase is not initialized

        // Get the current user
        supabase.auth.getUser().then(({data: {user}}: { data: { user: any } }) => {
            if (user) {
                setCurrentUser(user);
            }
        });

        const fetchMessages = async () => {
            try {
                setLoading(true);

                const {data, error} = await supabase
                    .from("messages")
                    .select(
                        `
                        id,
                        content,
                        created_at,
                        user_id,
                        parent_message_id,
                        profiles (
                            username
                        )
                        `
                    )
                    .order("created_at", {ascending: true});

                if (error) throw error;

                const formattedMessages = data.map((message: any) => ({
                    ...message,
                    username: message.profiles?.username || "Unknown User",
                }));

                setMessages(formattedMessages);
            } catch (e) {
                setError(e as Error);
                console.error("Error fetching messages:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        const subscription = supabase
            .channel("messages")
            .on(
                "postgres_changes",
                {event: "*", schema: "public", table: "messages"},
                async (payload: any) => {
                    switch (payload.eventType) {
                        case "INSERT": {
                            const {data: profileData, error: profileError} = await supabase
                                .from("profiles")
                                .select("username")
                                .eq("id", payload.new.user_id)
                                .single();

                            if (profileError) {
                                console.error(
                                    "Error fetching username for new message:",
                                    profileError
                                );
                            }

                            const newMessage: Message = {
                                id: payload.new.id,
                                content: payload.new.content,
                                created_at: payload.new.created_at,
                                user_id: payload.new.user_id,
                                username: profileData?.username || "Unknown User",
                                parent_message_id: payload.new.parent_message_id,
                            };

                            setMessages((prev) => [...prev, newMessage]);
                            break;
                        }
                        case "DELETE":
                            setMessages((prev) =>
                                prev.filter((msg) => msg.id !== payload.old.id)
                            );
                            break;
                        case "UPDATE":
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === payload.new.id ? {...msg, ...payload.new} : msg
                                )
                            );
                            break;
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]); // Add supabase as a dependency

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages]);

    const handleReply = (message: Message) => {
        setReplyingTo(message);
    };

    const submitReply = async () => {
        if (replyContent && replyingTo && supabase) {
            const {error} = await supabase.from("messages").insert([
                {
                    content: replyContent,
                    user_id: currentUser.id,
                    parent_message_id: replyingTo.id,
                },
            ]);
            if (error) {
                console.error("Error submitting reply:", error);
            } else {
                setReplyContent(null);
                setReplyingTo(null);
            }
        }
    };

    const cancelReply = () => {
        setReplyContent(null);
        setReplyingTo(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500 mt-10">
                Error: {error.message}
            </div>
        );
    }

    return (
        <section className="flex flex-col h-full bg-gray-50 mx-auto shadow-sm">
            {/* Chat Container */}
            <div
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 pb-36" // Added pb-36 for bottom padding
            >
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => {
                            const parentMessage = messages.find(
                                (msg) => msg.id === message.parent_message_id
                            );

                            return (
                                <div
                                    key={message.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                                >
                                    {/* Parent Message Reference */}
                                    {parentMessage && (
                                        <div className="bg-gray-50 rounded-lg p-2 mb-2 border-l-4 border-blue-500">
                                            <p className="text-xs text-gray-600 italic">
                                                Replying to: {parentMessage.username || "Unknown User"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                "{parentMessage.content}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Message Header */}
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                            <span className="text-sm font-semibold text-blue-600 mr-2">
                                                {message.username || "Unknown User"}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(message.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Message Content */}
                                    <p className="text-gray-800">{message.content}</p>

                                    {/* Reply Button */}
                                    <button
                                        onClick={() => handleReply(message)}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Reply
                                    </button>
                                </div>
                            );
                        })}
                        {/* Anchor to scroll to bottom */}
                        <div ref={messagesEndRef}/>
                    </>
                )}
            </div>

            {/* Reply Form */}
            {replyingTo && (
                <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
                    <div className="max-w-xl mx-auto">
                        <div className="bg-blue-50 rounded-lg p-2 mb-2 flex justify-between items-center">
                            <p className="text-sm text-gray-700">
                                Replying to: "{replyingTo.content}"
                            </p>
                            <button
                                onClick={cancelReply}
                                className="text-gray-500 hover:text-red-500"
                            >
                                <X size={20}/>
                            </button>
                        </div>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Type your reply..."
                            rows={3}
                            value={replyContent || ""}
                            onChange={(e) => setReplyContent(e.target.value)}
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={submitReply}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            >
                                <Send size={16} className="mr-2"/> Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default Messages;
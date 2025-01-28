import React, { useEffect, useState, useRef } from "react";
import { supabasePromise } from "./supabase"; // Import the promise
import { Send, X } from "lucide-react";
import MessageInput from "./MessageInput"; // Import the updated MessageInput component

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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for Supabase to initialize
    supabasePromise
      .then((client) => {
        setSupabase(client);
      })
      .catch((error) => {
        console.error("Failed to initialize Supabase:", error);
        setError({ message: "Failed to initialize Supabase" });
      });
  }, []);

  useEffect(() => {
    if (!supabase) return; // Exit if Supabase is not initialized

    // Get the current user
    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: any } }) => {
        if (user) {
          setCurrentUser(user);
        }
      });

    const fetchMessages = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
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
          .order("created_at", { ascending: true });

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
        { event: "*", schema: "public", table: "messages" },
        async (payload: any) => {
          switch (payload.eventType) {
            case "INSERT": {
              const { data: profileData, error: profileError } = await supabase
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
                  msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
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
  }, [supabase]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 text-center text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <section className="flex flex-col h-full mx-auto overflow-y-scroll shadow-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 pb-36">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-purple-300">
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
                  className="p-4 bg-gray-700 border border-gray-900 shadow-sm rounded-xl"
                >
                  {/* Parent Message Reference */}
                  {parentMessage && (
                    <div className="p-2 mb-2 bg-gray-800 border-l-2 border-purple-500">
                      <p className="text-xs italic text-purple-200">
                        <span className="font-semibold">
                          {parentMessage.username || "Unknown User"}
                        </span>{" "}
                        : "{parentMessage.content}"
                      </p>
                      <p className="text-xs text-purple-400"></p>
                    </div>
                  )}

                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="mr-2 text-sm font-semibold text-white">
                        {message.username || "Unknown User"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <p className="text-purple-100">{message.content}</p>

                  {/* Reply Button */}
                  <button
                    onClick={() => handleReply(message)}
                    className="mt-2 text-sm text-purple-300 transition-colors hover:text-purple-200"
                  >
                    Reply
                  </button>
                </div>
              );
            })}
            {/* Anchor to scroll to bottom */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onMessageSent={() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        currentUser={currentUser}
        supabase={supabase}
      />
    </section>
  );
};

export default Messages;

// src/Messages.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabasePromise } from "./supabase";
import MessageInput from "./MessageInput";
import { Reply, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GetAvatars from "./utils/getAvatars";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  parent_message_id?: string | null;
  updated_at?: string | null;
}

interface Error {
  message: string;
}

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState<string>("");

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          console.warn("Notifications are not enabled.");
        }
      });
    }
  }, []);

  // Initialize Supabase client
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const client = await supabasePromise;
        setSupabase(client);
      } catch (err) {
        console.error("Failed to initialize Supabase:", err);
        setError({ message: "Failed to initialize Supabase" });
      }
    };
    initializeSupabase();
  }, []);

  // Once Supabase is loaded, load current user and fetch messages
  useEffect(() => {
    if (!supabase) return;

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
            updated_at,
            profiles (
                username,
                avatar_url
            )
            `
          )
          .order("created_at", { ascending: true });
        if (error) throw error;
        const formattedMessages = data.map((message: any) => ({
          ...message,
          username: message.profiles?.username || "Unknown User",
          avatar_url: message.profiles?.avatar_url,
        }));
        setMessages(formattedMessages);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time message changes and notify on INSERT
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
                .select("username, avatar_url")
                .eq("id", payload.new.user_id)
                .single();

              if (profileError) {
                console.error(
                  "Error fetching profile for new message:",
                  profileError
                );
              }

              const newMessage: Message = {
                id: payload.new.id,
                content: payload.new.content,
                created_at: payload.new.created_at,
                user_id: payload.new.user_id,
                username: profileData?.username || "Unknown User",
                avatar_url: profileData?.avatar_url,
                parent_message_id: payload.new.parent_message_id,
                updated_at: payload.new.updated_at,
              };

              // Update the messages state
              setMessages((prev) => [...prev, newMessage]);

              // Trigger a web toast notification
              toast(
                `New message from ${newMessage.username}: "${newMessage.content}"`,
                {
                  icon: "💬",
                  duration: 5000,
                }
              );

              // Trigger a built-in native Web Notification
              if (Notification.permission === "granted") {
                new Notification("New Message", {
                  body: `From ${newMessage.username}: ${newMessage.content}`,
                });
              }
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

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // Handle replying to a message
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditMessageContent(message.content);
  };

  const handleDelete = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      toast.success("Message deleted successfully!");
    } catch (err) {
      console.error("Error deleting message:", err);
      toast.error("Failed to delete message.");
    }
  };

  const handleSave = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: editMessageContent, updated_at: new Date() })
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      setEditingMessageId(null);
      setEditMessageContent("");
      toast.success("Message updated successfully!");
    } catch (err) {
      console.error("Error updating message:", err);
      toast.error("Failed to update message.");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessageContent("");
  };

  return (
    <section className="flex flex-col h-full mx-auto overflow-y-scroll shadow-sm scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-blue-950 scrollbar-track-transparent">
      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 pb-36">
        {/* Render GetAvatars for side effects (avatar update) */}
        <GetAvatars />
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
                <div key={message.id} className="group">
                  <Card className="mt-8 bg-transparent border-none shadow-none">
                    <CardContent className="flex flex-col p-0">
                      {parentMessage && (
                        <div className="relative mb-2 ml-12">
                          <svg
                            className="absolute top-[0.5rem] left-[-3rem] z-10"
                            width="40"
                            height="20"
                            viewBox="0 0 20 30"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 20 V5 C10 0, 10 0, 15 0 H40"
                              stroke="gray"
                              strokeWidth="2"
                              className="dark:stroke-gray-400"
                            />
                          </svg>
                          <p className="text-xs italic text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">
                              {parentMessage.username || "Unknown User"}
                            </span>{" "}
                            : "{parentMessage.content}"
                          </p>
                        </div>
                      )}
                      <section className="flex">
                        <Avatar className="mr-3">
                          <AvatarImage src={message.avatar_url} />
                          <AvatarFallback>
                            {message.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <p className="text-sm font-semibold text-gray-600 dark:text-white">
                              {message.username || "Unknown User"}
                            </p>
                            <p className="ml-2 text-xs text-gray-400">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                            {message.updated_at &&
                              message.updated_at !== message.created_at && (
                                <p className="ml-2 text-xs italic text-gray-400">
                                  (Edited:{" "}
                                  {new Date(
                                    message.updated_at
                                  ).toLocaleString()}
                                  )
                                </p>
                              )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleReply(message)}
                                    className="ml-3 text-sm text-purple-800 transition-all duration-200 transform -translate-x-2 opacity-0 dark:text-white hover:text-purple-200 group-hover:opacity-100 group-hover:translate-x-0"
                                  >
                                    <Reply size={16} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Reply to {message.username}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {message.user_id === currentUser?.id && (
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleEdit(message)}
                                        className="ml-2 text-sm text-blue-500 transition-all duration-200 transform -translate-x-2 opacity-0 dark:text-white hover:text-blue-200 group-hover:opacity-100 group-hover:translate-x-0"
                                      >
                                        <Edit size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Edit message</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleDelete(message.id)}
                                        className="ml-2 text-sm text-red-500 transition-all duration-200 transform -translate-x-2 opacity-0 dark:text-white hover:text-red-200 group-hover:opacity-100 group-hover:translate-x-0"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Delete message</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>

                          <div>
                            {editingMessageId === message.id ? (
                              <input
                                type="text"
                                value={editMessageContent}
                                onChange={(e) =>
                                  setEditMessageContent(e.target.value)
                                }
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSave(message.id);
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                            ) : (
                              <p className="text-purple-800 dark:text-white">
                                {message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
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

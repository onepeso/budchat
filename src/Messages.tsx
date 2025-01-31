// src/Messages.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabasePromise } from "./supabase";
import MessageInput from "./MessageInput";
import { Reply } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const client = await supabasePromise;
        setSupabase(client);
      } catch (error) {
        console.error("Failed to initialize Supabase:", error);
        setError({ message: "Failed to initialize Supabase" });
      }
    };

    initializeSupabase();
  }, []);

  useEffect(() => {
    if (!supabase) return;

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
    <section className="flex flex-col h-full mx-auto overflow-y-scroll shadow-sm scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-blue-950 scrollbar-track-transparent">
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
                              d="M10 20 V5 C10 0, 10 0, 15 0 H40" // More controlled smooth curve
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
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <p className="text-sm font-semibold text-gray-600 dark:text-white ">
                              {message.username || "Unknown User"}
                            </p>
                            <p className="ml-2 text-xs text-gray-400">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
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
                                <TooltipContent>
                                  <p>Reply to {message.username}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div>
                            <p className="text-purple-800 dark:text-white ">
                              {message.content}
                            </p>
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

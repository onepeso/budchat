import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Send, SendHorizontal, X } from "lucide-react";

interface MessageInputProps {
  onMessageSent?: () => void;
  replyingTo: Message | null;
  setReplyingTo: (message: Message | null) => void;
  currentUser: any;
  supabase: any;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
  parent_message_id?: string | null;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onMessageSent,
  replyingTo,
  setReplyingTo,
  supabase,
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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
      const { error: insertError } = await supabase.from("messages").insert([
        {
          content: message.trim(),
          user_id: user.id,
          parent_message_id: replyingTo?.id || null, // Include parent_message_id if replying
        },
      ]);

      if (insertError) throw insertError;

      setMessage("");
      setError(null);
      setReplyingTo(null); // Clear the reply state after sending
      onMessageSent?.();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null); // Clear the reply state
  };

  return (
    <div className="sticky bottom-0 w-full p-2 rounded-lg">
      <div className="flex items-center max-w-4xl mx-auto space-x-2">
        {showPicker && (
          <div className="absolute z-10 right-5 bottom-24">
            <Picker data={data} onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full p-1 space-y-2 bg-gray-200 rounded-lg dark:bg-blue-950 "
        >
          {/* Display "Replying to" message if replying */}
          {replyingTo && (
            <div className="flex items-center justify-between p-2 bg-purple-700 rounded-lg">
              <p className="text-sm text-white">
                Replying to{" "}
                <span className="font-semibold">{replyingTo.username}</span>{" "}
                {/* "{replyingTo.content}" */}
              </p>
              <button
                onClick={cancelReply}
                className="text-gray-300 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-grow p-2 text-sm text-black bg-gray-200 rounded-lg dark:bg-transparent dark:text-white focus:outline-none"
              placeholder={
                replyingTo ? "Type your reply..." : "Send a message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              className={`py-2 px-4 text-sm bg-transparent text-gray-400 hover:bg-transparent hover:text-white transition-colors font-semibold dark:bg-transparent border-l-2 dark:border-gray-800 border-gray-300 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? <Send /> : <SendHorizontal />}
            </button>
          </div>
        </form>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="absolute p-2 text-xl text-white bottom-3 right-16 hover:text-purple-400"
        >
          😊
        </button>
      </div>
    </div>
  );
};

export default MessageInput;

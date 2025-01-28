import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabasePromise } from "./supabase"; // Import the promise
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { X } from "lucide-react";

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
  currentUser,
  supabase,
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="sticky bottom-0 w-full p-2 bg-gray-800 rounded-lg">
      <div className="flex items-center max-w-4xl mx-auto space-x-2">
        {showPicker && (
          <div className="absolute z-10 right-5 bottom-24">
            <Picker data={data} onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full space-y-2"
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
                className="text-gray-300 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-grow p-2 text-sm text-white bg-gray-700 border border-gray-500 rounded-lg focus:outline-none focus:border-gray-300"
              placeholder={
                replyingTo ? "Type your reply..." : "Send a message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-2 text-xl text-white hover:text-purple-400"
            >
              😊
            </button>

            <button
              type="submit"
              className={`py-2 px-4 text-sm bg-gray-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;

import { useState, useEffect } from "react";
import Messages from "./Messages";
import UserStatus from "./UserStatus";
import { supabasePromise } from "./supabase"; // Import the promise
import { useNavigate } from "react-router-dom"; // For navigation
import { ModeToggle } from "./components/custom/mode-toggle";
import UpdateAlert from "./utils/updateAlert";

const Chat = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Supabase to initialize
    supabasePromise
      .then((client) => {
        setSupabase(client);
      })
      .catch((error) => {
        console.error("Failed to initialize Supabase:", error);
      });
  }, []);

  // Logout function
  const handleLogout = async () => {
    if (!supabase) return;

    try {
      // Sign out from Supabase Auth
      const { error } = await supabase.auth.signOut();
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
    <div className="flex h-screen ">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Messages />
        </div>
      </div>

      {/* Right Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-64  border-l border-gray-200 dark:border-[#0b101f] dark:bg-transparent transition-transform duration-200 ease-in-out transform bg-gray-100 ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        } md:translate-x-0 md:relative`}
      >
        {/* Toggle Button (for small screens) */}
        <button
          className="absolute p-2 text-white bg-purple-600 rounded-full -left-12 top-4 md:hidden hover:bg-purple-700"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? "✕" : "☰"}
        </button>

        {/* Sidebar Content */}
        <div className="flex flex-col h-full ">
          <UpdateAlert />
          {/* UserStatus Component */}
          <div className="flex-1 p-4 overflow-y-auto ">
            <UserStatus />
          </div>

          {/* Logout Button */}
          <div className="p-4 mb-3 border-t border-gray-200 dark:border-[#0b101f]">
            <button
              onClick={handleLogout}
              className="w-1/2 px-4 py-2 mr-2 font-semibold text-white transition-colors bg-gray-400 rounded-lg dark:bg-blue-950 dark:hover:bg-blue-900 hover:bg-gray-500"
            >
              Logout
            </button>
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

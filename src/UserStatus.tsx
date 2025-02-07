"use client";

import { useEffect, useState } from "react";
import { supabasePromise } from "./supabase"; // Import the promise
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import PersonalMessage from "./components/custom/profile-components/PersonalMessage";
import { MessageSquareText } from "lucide-react";

const UserStatus = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client
  const [, setUserId] = useState<string | null>(null);

  // Fetch initial user statuses
  const fetchStatuses = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, status, personal_message") // Include personal_message
      .order("username", { ascending: true });

    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // Wait for Supabase to initialize
    supabasePromise
      .then(async (client) => {
        setSupabase(client);
        const { data } = await client.auth.getUser();
        setUserId(data?.user?.id || null);
      })
      .catch((error: string) => {
        console.error("Failed to initialize Supabase:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!supabase) return; // Exit if Supabase is not initialized

    const initialize = async () => {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      // Fetch initial statuses
      await fetchStatuses();

      // Set up real-time presence tracking
      const presenceChannel = supabase.channel("online-users", {
        config: {
          presence: {
            key: user.id, // Unique identifier for the user
          },
        },
      });

      // Track user presence
      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const newState = presenceChannel.presenceState();
          const onlineUserIds = Object.keys(newState);

          // Update user statuses based on presence
          setUsers((prevUsers) =>
            prevUsers.map((u) => ({
              ...u,
              status: onlineUserIds.includes(u.id) ? "online" : "offline",
            }))
          );
        })
        .subscribe(async (status: any) => {
          if (status === "SUBSCRIBED") {
            // Track the current user as online
            await presenceChannel.track({
              online_at: new Date().toISOString(),
            });
          }
        });

      // Cleanup on unmount
      return () => {
        presenceChannel.unsubscribe();
      };
    };

    initialize();
  }, [supabase]); // Add supabase as a dependency

  const refreshStatuses = async () => {
    await fetchStatuses();
  };

  const truncateMessage = (message: string | null, maxLength: number) => {
    const safeMessage = message || ""; // Treat null as an empty string

    if (safeMessage.length > maxLength) {
      return safeMessage.substring(0, maxLength) + "...";
    }
    return safeMessage;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="w-1/2 h-6 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-black dark:text-white">
      <h3 className="mb-4 ml-2 text-lg font-semibold">Members</h3>
      {/* Scrollable list of users */}
      <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between p-2 transition-colors rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-[#0000005b]"
          >
            <div className="flex items-center space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        user.status === "online"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{user.status === "online" ? "Online" : "Offline"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span>{user.username}</span>
                  {/* Display the message here */}
                  {user.id === user?.id && (
                    <PersonalMessage user={user} onUpdate={refreshStatuses} />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-500">
                    {user.personal_message &&
                      user.personal_message.length > 0 && (
                        <MessageSquareText size={12} />
                      )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {truncateMessage(user.personal_message, 20)}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserStatus;

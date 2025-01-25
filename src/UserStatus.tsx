import {useEffect, useState} from "react";
import {supabasePromise} from "./supabase"; // Import the promise

const UserStatus = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [supabase, setSupabase] = useState<any>(null); // State to hold the Supabase client

    console.log(currentUser);

    // Fetch initial user statuses
    const fetchStatuses = async () => {
        if (!supabase) return;

        const {data, error} = await supabase
            .from("profiles")
            .select("id, username, status")
            .order("username", {ascending: true});

        if (!error) setUsers(data || []);
        setLoading(false);
    };

    useEffect(() => {
        // Wait for Supabase to initialize
        supabasePromise.then((client) => {
            setSupabase(client);
        }).catch((error) => {
            console.error('Failed to initialize Supabase:', error);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!supabase) return; // Exit if Supabase is not initialized

        const initialize = async () => {
            // Get the current user
            const {data: {user}} = await supabase.auth.getUser();
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
                .on("presence", {event: "sync"}, () => {
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
                        await presenceChannel.track({online_at: new Date().toISOString()});
                    }
                });

            // Cleanup on unmount
            return () => {
                presenceChannel.unsubscribe();
            };
        };

        initialize();
    }, [supabase]); // Add supabase as a dependency

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Active Users</h3>
            {/* Scrollable list of users */}
            <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {users.map((user) => (
                    <li
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <span
                                className={`inline-block w-2.5 h-2.5 rounded-full ${
                                    user.status === "online" ? "bg-green-500" : "bg-gray-400"
                                }`}
                            ></span>
                            <span className="text-gray-700">{user.username}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserStatus;
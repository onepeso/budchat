import React, { useState, useEffect } from "react";
import { supabasePromise } from "./supabase"; // Import the promise
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // New state for username
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and signup
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
        setError("Failed to initialize Supabase");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase client is not initialized");
      return;
    }

    if (!email || !password || (isSignUp && !username)) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isSignUp) {
        // Sign up new user
        response = await supabase.auth.signUp({
          email,
          password,
        });

        if (response.error) {
          throw response.error;
        }

        const user = response.data?.user;
        if (user) {
          // Create a new profile in the `profiles` table with the username
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([{ id: user.id, email: user.email, username }]);

          if (profileError) {
            throw new Error(`Error creating profile: ${profileError.message}`);
          }

          setError("Please check your email for a verification link");
          return;
        }
      } else {
        // Login existing user
        response = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (response.error) {
          throw response.error;
        }

        if (response.data.user) {
          // console.log("User logged in:", response.data.user);

          // Initialize presence tracking for the user
          const presenceChannel = supabase.channel("online-users", {
            config: {
              presence: {
                key: response.data.user.id, // Unique identifier for the user
              },
            },
          });

          presenceChannel
            .on("presence", { event: "sync" }, () => {
              // console.log(
              //   "Presence state updated:",
              //   presenceChannel.presenceState()
              // );
            })
            .subscribe(async (status: any) => {
              if (status === "SUBSCRIBED") {
                // Track the current user as online
                await presenceChannel.track({
                  online_at: new Date().toISOString(),
                });
              }
            });

          // Navigate to the chat page
          navigate("/chat");
        } else {
          throw new Error("User data is not available");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md p-4 mx-auto">
      <h2 className="mb-4 text-xl font-bold">
        {isSignUp ? "Sign Up" : "Login"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col">
        {isSignUp && (
          <input
            type="text"
            placeholder="Username"
            className="p-2 mb-2 text-black border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          className="p-2 mb-2 text-black border rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 mb-2 text-black border rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span className="mb-2 text-sm text-red-500">{error}</span>}
        <button
          type="submit"
          className={`py-2 px-4 bg-blue-500 text-white rounded-lg mb-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
        </button>
        <button
          type="button"
          className="text-sm text-blue-500"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null); // Clear errors when toggling
          }}
        >
          {isSignUp
            ? "Already have an account? Login"
            : "Don't have an account? Sign Up"}
        </button>
      </form>
    </div>
  );
};

export default Login;

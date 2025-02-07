// getAvatars.tsx
"use client";

import { useEffect, useState } from "react";
import { supabasePromise } from "../supabase";

// A helper function to generate a random seed string
const getRandomSeed = () => Math.random().toString(36).substring(2, 10);

const GetAvatars = () => {
  // Initialize seed with a random value
  const [seed] = useState(getRandomSeed());

  // Construct the DiceBear avatar URL using the 'notionists-neutral' style.
  const avatarUrl = `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}`;

  useEffect(() => {
    const updateProfileAvatar = async () => {
      try {
        // Initialize supabase from your supabasePromise.
        const supabase = await supabasePromise;

        // Get the current user.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("No user logged in");
          return;
        }

        // Check if the user already has an avatar_url set.
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error.message);
        } else if (data?.avatar_url && data.avatar_url !== "") {
          console.log("User already has an avatar:", data.avatar_url);
          return;
        }

        // Otherwise, update the user's profile with the new avatar URL.
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating avatar:", updateError.message);
        } else {
          console.log("Avatar updated successfully.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    updateProfileAvatar();
  }, [avatarUrl]);

  return null; // Render nothing; we're only using the side effect.
};

export default GetAvatars;

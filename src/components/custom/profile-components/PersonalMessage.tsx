"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabasePromise } from "@/supabase";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

interface PersonalMessageProps {
  user: any;
  onUpdate: () => void; // Add the onUpdate prop
}

const PersonalMessage: React.FC<PersonalMessageProps> = ({
  user,
  onUpdate,
}) => {
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [personalMessage, setPersonalMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const updatePersonalMessage = async () => {
    if (!supabase || !user.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ personal_message: personalMessage })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating personal message:", error);
    } else {
      setOpen(false);
      onUpdate(); // Call the callback function to refresh the data
    }
  };

  useEffect(() => {
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
    if (supabase) {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (user) {
      setPersonalMessage(user.personal_message || "");
    }
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user.id === userId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Pencil size={12} className="mr-2" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Your Personal Message</DialogTitle>
              <DialogDescription>
                Add a personal message to your status. This will be visible to
                other members.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Enter your personal message"
            />
            <Button
              onClick={() => {
                updatePersonalMessage();
              }}
            >
              Save
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PersonalMessage;

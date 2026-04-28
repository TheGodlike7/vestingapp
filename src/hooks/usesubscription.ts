import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export const useSubscription = (userId: string | null) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    const checkSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at")
        .eq("owner_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!data) {
        setIsValid(false);
        return;
      }

      const valid = new Date(data.expires_at) > new Date();
      setIsValid(valid);
    };

    checkSubscription();
  }, [userId]);

  return isValid;
};
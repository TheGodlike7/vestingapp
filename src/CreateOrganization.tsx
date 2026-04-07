import { useState } from "react";
import { supabase } from "@/supabase";
import { useWallet } from "@solana/wallet-adapter-react";

export default function CreateOrganization({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { publicKey } = useWallet();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createOrg = async () => {
    if (!publicKey || !name) return;

    setLoading(true);

    const { error } = await supabase.from("organizations").insert({
      owner_id: publicKey.toBase58(),
      name,
    });

    setLoading(false);

    if (!error) {
      onCreated();
    }
  };

  return (
    <div>
      <input
        placeholder="Organization name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={createOrg} disabled={loading}>
        Create Organization
      </button>
    </div>
  );
}
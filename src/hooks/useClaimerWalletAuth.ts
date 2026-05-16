import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase.ts";

const CLAIM_SIGN_IN_STATEMENT =
  "Sign in to Harvest to view schedules assigned to this wallet.";

function getWeb3WalletAddresses(session: Session | null): string[] {
  const identityWallets = (session?.user.identities ?? [])
    .filter((identity) => identity.provider === "web3")
    .map((identity) => {
      const providerId = identity.identity_data?.provider_id;
      const subject = identity.identity_data?.sub;

      if (typeof providerId === "string") return providerId;
      if (typeof subject === "string") return subject;
      return null;
    })
    .filter((providerId): providerId is string => Boolean(providerId));

  const metadataWallets = [
    session?.user.user_metadata?.provider_id,
    session?.user.user_metadata?.sub,
  ].filter((providerId): providerId is string => typeof providerId === "string");

  return Array.from(new Set([...identityWallets, ...metadataWallets]));
}

export function useClaimerWalletAuth() {
  const wallet = useWallet();
  const walletAddress = wallet.publicKey?.toBase58() ?? null;
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signedInWallets = useMemo(
    () => getWeb3WalletAddresses(session),
    [session],
  );

  const isSignedInForConnectedWallet = Boolean(
    walletAddress && signedInWallets.includes(walletAddress),
  );

  const signInWithConnectedWallet = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setAuthError("Connect a Solana wallet first.");
      return false;
    }

    if (!wallet.signMessage) {
      setAuthError("This wallet does not support message signing.");
      return false;
    }

    setSigningIn(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement: CLAIM_SIGN_IN_STATEMENT,
        wallet: {
          publicKey: wallet.publicKey,
          signMessage: wallet.signMessage,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSigningIn(false);
    }
  }, [wallet]);

  return {
    authError,
    authLoading,
    isSignedInForConnectedWallet,
    signInWithConnectedWallet,
    signedInWallets,
    signingIn,
    walletAddress,
  };
}

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const defaultActions = {
  kycVerified: false,
  bankLinked: false,
  bankInReview: false,
  bankSnapshotExists: false,
  loading: true,
};

export const useRequiredActions = () => {
  const [actions, setActions] = useState(defaultActions);
  const isMountedRef = useRef(true);

  const loadActions = useCallback(async () => {
    try {
      if (!supabase) {
        if (isMountedRef.current) {
          setActions({ ...defaultActions, loading: false });
        }
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (isMountedRef.current) {
          setActions({ ...defaultActions, loading: false });
        }
        return;
      }

      const userId = userData.user.id;

      const { data: snapshotData, error: snapshotError } = await supabase
        .from("truid_bank_snapshots")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      const bankSnapshotExists = !snapshotError && (snapshotData?.length ?? 0) > 0;

      let { data, error } = await supabase
        .from("required_actions")
        .select("kyc_verified, bank_linked, bank_in_review")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        const { data: newData, error: insertError } = await supabase
          .from("required_actions")
          .insert({ user_id: userId })
          .select("kyc_verified, bank_linked, bank_in_review")
          .single();

        if (!insertError && newData) {
          data = newData;
        }
      }

      if (isMountedRef.current) {
        setActions({
          kycVerified: data?.kyc_verified || false,
          bankLinked: data?.bank_linked || false,
          bankInReview: data?.bank_in_review || false,
          bankSnapshotExists,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to load required actions", error);
      if (isMountedRef.current) {
        setActions({ ...defaultActions, loading: false });
      }
    }
  }, []);

  const refetch = useCallback(() => {
    setActions((prev) => ({ ...prev, loading: true }));
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    isMountedRef.current = true;
    loadActions();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadActions]);

  return { ...actions, refetch };
};

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CoupleData {
  couple_id: string;
  couple_name: string;
  partner_id: string | null;
  house_id: string | null;
  layout_id: string | null;
}

function withTimeout<T>(promise: PromiseLike<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase is taking too long to respond.')), milliseconds);
    }),
  ]);
}

export function useCouple(userId: string | null) {
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchCouple = useCallback(async () => {
    if (!userId || !supabase) {
      setLoadedUserId(userId);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: coupleData, error: coupleError } = await withTimeout(
        supabase.rpc('get_my_couple'),
        10000
      );

      if (coupleError) throw coupleError;

      const myCouple = coupleData?.[0] || null;
      setCouple(myCouple);

      if (myCouple) {
        const { data: invites, error: inviteError } = await supabase
          .from('invitations')
          .select('code')
          .eq('couple_id', myCouple.couple_id)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (inviteError) throw inviteError;
        setInviteCode(invites?.[0]?.code ?? null);
      } else {
        setInviteCode(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your home.');
      setCouple(null);
      setInviteCode(null);
    } finally {
      setLoadedUserId(userId);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCouple();
  }, [fetchCouple]);

    // Realtime sync for house layout changes
  useEffect(() => {
    if (!couple?.couple_id || !supabase) return;

    const channel = supabase
      .channel(`house:${couple.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'house_worlds',
          filter: `couple_id=eq.${couple.couple_id}`,
        },
        () => {
          fetchCouple();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [couple?.couple_id, fetchCouple]);

    const createCouple = useCallback(
    async (name: string = 'Our Home', layoutId: string = 'cozy-house') => {
      if (!userId || !supabase) return null;

      setError(null);

      try {
        const { data: coupleId, error: createError } = await supabase.rpc('create_couple', {
          p_name: name,
          p_layout_id: layoutId,
        });

        if (createError) throw createError;

        const { data: code, error: inviteError } = await supabase.rpc('create_invitation', {
          p_couple_id: coupleId,
        });

        if (inviteError) throw inviteError;

        setInviteCode(code);
        await fetchCouple();

        return code;
      } catch (err: any) {
        setError(err.message || 'Failed to create couple.');
        return null;
      }
    },
    [userId, fetchCouple]
  );

  const createInvite = useCallback(async () => {
    if (!userId || !supabase) return null;

    if (!couple) {
      setError('No couple found.');
      return null;
    }

    setError(null);

    try {
      const { data: code, error: inviteError } = await supabase.rpc('create_invitation', {
        p_couple_id: couple.couple_id,
      });

      if (inviteError) throw inviteError;

      setInviteCode(code);
      return code;
    } catch (err: any) {
      setError(err.message || 'Failed to create invitation.');
      return null;
    }
  }, [userId, couple]);

  const joinCouple = useCallback(
    async (code: string): Promise<boolean> => {
      if (!userId || !supabase) return false;

      setError(null);

      try {
        const { error: joinError } = await supabase.rpc('join_couple_by_code', {
          p_code: code,
        });

        if (joinError) throw joinError;

        await fetchCouple();
        return true;
      } catch (err: any) {
        console.error('Failed to join couple:', err);
        setError(err.message || 'Invalid or expired invitation code.');
        return false;
      }
    },
    [userId, fetchCouple]
  );

    const updateLayout = useCallback(
    async (layoutId: string): Promise<boolean> => {
      if (!couple?.couple_id || !supabase) return false;

      const { error } = await supabase
        .from('house_worlds')
        .update({ layout_id: layoutId })
        .eq('couple_id', couple.couple_id);

      if (error) {
        console.error('Failed to update layout:', error);
        return false;
      }

      await fetchCouple();
      return true;
    },
    [couple?.couple_id, fetchCouple]
  );

   return {
    couple,
    inviteCode,
    loading,
    error,
    createCouple,
    createInvite,
    joinCouple,
    updateLayout,
    refetch: fetchCouple,
  };
}
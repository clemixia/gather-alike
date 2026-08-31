import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getHouseLayout, findFreeSpot } from '../game/layouts';
import { getFurnitureType } from '../game/furniture';

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

// Keep furniture inside the playable area when the house layout changes.
const FURNITURE_EDGE_MARGIN = 60;

async function clampFurnitureToLayout(houseId: string, layoutId: string): Promise<void> {
  if (!supabase) return;
  const layout = getHouseLayout(layoutId);

  const { data: items, error } = await supabase
    .from('furniture')
    .select('id, type, x, y')
    .eq('house_id', houseId);

  if (error) {
    console.error('Failed to load furniture for clamping:', error);
    return;
  }
  if (!items || items.length === 0) return;

  for (const item of items) {
    const type = getFurnitureType(item.type);
    const spot = findFreeSpot(
      layout,
      Number(item.x),
      Number(item.y),
      type?.width ?? 32,
      type?.height ?? 32
    );

    if (spot.x !== Number(item.x) || spot.y !== Number(item.y)) {
      const { error: updateError } = await supabase
        .from('furniture')
        .update({ x: spot.x, y: spot.y })
        .eq('id', item.id);
      if (updateError) {
        console.error('Failed to clamp furniture:', updateError);
      }
    }
  }
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

      console.log('📡 [useCouple] fetch:',
      'rows=' + (coupleData?.length ?? 0),
      'error=' + (coupleError?.message ?? 'none'),
      'userId=' + (userId ? userId.slice(0, 8) : 'NULL')
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

    // Keep furniture inside the new layout bounds (syncs to partner via realtime)
    if (couple.house_id) {
      await clampFurnitureToLayout(couple.house_id, layoutId);
    }

    await fetchCouple();
    return true;
  },
  [couple?.couple_id, couple?.house_id, fetchCouple]
);

   // 🔧 FIX: If userId changed (e.g. session just resolved) but we haven't
// loaded data for the new userId yet, report loading=true.
// This closes the race window where coupleLoading=false but couple=null.
const isLoading = loading || loadedUserId !== userId;

return {
  couple,
  inviteCode,
  loading: isLoading,
  error,
  createCouple,
  createInvite,
  joinCouple,
  updateLayout,
  refetch: fetchCouple,
};
}
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { FurnitureInstance } from '../game/furniture';

export function useFurniture(houseId: string | null, userId: string | null) {
  const [furniture, setFurniture] = useState<FurnitureInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const draggingRef = useRef<Set<string>>(new Set());

  // Load furniture
  useEffect(() => {
    async function load() {
      if (!houseId || !supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('furniture')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load furniture:', error);
      } else {
        setFurniture(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [houseId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!houseId || !supabase) return;

    const channel = supabase
      .channel(`furniture:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'furniture',
          filter: `house_id=eq.${houseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as FurnitureInstance;
            setFurniture((prev) => {
              if (prev.some((f) => f.id === newItem.id)) return prev;
              return [...prev, newItem];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as FurnitureInstance;
            // Don't update if we're currently dragging this item
            if (draggingRef.current.has(updated.id)) return;
            setFurniture((prev) =>
              prev.map((f) => (f.id === updated.id ? updated : f))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as FurnitureInstance;
            setFurniture((prev) => prev.filter((f) => f.id !== deleted.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (supabase) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [houseId]);

  const addFurniture = useCallback(
    async (type: string, x: number, y: number): Promise<FurnitureInstance | null> => {
      if (!houseId || !supabase) return null;

      const { data, error } = await supabase
        .from('furniture')
        .insert({
          house_id: houseId,
          type,
          x,
          y,
          rotation: 0,
          props: {},
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add furniture:', error);
        return null;
      }

      setFurniture((prev) => {
        if (prev.some((f) => f.id === data.id)) return prev;
        return [...prev, data];
      });

      return data;
    },
    [houseId]
  );

  const moveFurniture = useCallback(
    async (id: string, x: number, y: number) => {
      if (!supabase) return;

      // Mark as dragging to ignore incoming updates
      draggingRef.current.add(id);

      const { error } = await supabase
        .from('furniture')
        .update({ x, y })
        .eq('id', id);

      if (error) {
        console.error('Failed to move furniture:', error);
      }

      // Remove from dragging after a short delay to allow the update to propagate
      setTimeout(() => {
        draggingRef.current.delete(id);
      }, 500);
    },
    []
  );

  const rotateFurniture = useCallback(
    async (id: string, rotation: number) => {
      if (!supabase) return;

      const { error } = await supabase
        .from('furniture')
        .update({ rotation })
        .eq('id', id);

      if (error) {
        console.error('Failed to rotate furniture:', error);
      }
    },
    []
  );

  const deleteFurniture = useCallback(
    async (id: string) => {
      if (!supabase) return;

      const { error } = await supabase.from('furniture').delete().eq('id', id);

      if (error) {
        console.error('Failed to delete furniture:', error);
        return;
      }

      setFurniture((prev) => prev.filter((f) => f.id !== id));
    },
    []
  );

  return {
    furniture,
    loading,
    addFurniture,
    moveFurniture,
    rotateFurniture,
    deleteFurniture,
  };
}
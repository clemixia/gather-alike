import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {  DEFAULT_AVATAR } from '../game/types';
import type { AvatarConfig } from '../game/types';

export function useAvatar(userId: string | null) {
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId || !supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('avatar, display_name')
        .eq('id', userId)
        .single();

      if (data) {
        const stored = (data.avatar as Partial<AvatarConfig>) || {};
        setAvatar({
          ...DEFAULT_AVATAR,
          ...stored,
          name: data.display_name ?? DEFAULT_AVATAR.name,
        });
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  const saveAvatar = useCallback(
    async (config: AvatarConfig) => {
      if (!userId || !supabase) return false;
      const { name, ...rest } = config;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: rest, display_name: name })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save avatar:', error);
        return false;
      }
      setAvatar(config);
      return true;
    },
    [userId]
  );

  return { avatar, loading, saveAvatar, setAvatar };
}
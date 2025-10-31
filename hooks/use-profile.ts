'use client';

import { useCallback, useEffect, useState } from 'react';
import { PROFILE_STORAGE_KEY, Profile, calculateAgeLabel, parseProfile, serializeProfile } from '@/lib/profile';

type SaveProfileInput = {
  nickname: string;
  birthdate: string;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    setProfile(parseProfile(stored));
    setIsReady(true);
  }, []);

  const saveProfile = useCallback((input: SaveProfileInput) => {
    const trimmedNickname = input.nickname.trim();
    if (!trimmedNickname) {
      throw new Error('孩子昵称不能为空');
    }
    const next: Profile = {
      nickname: trimmedNickname,
      birthdate: input.birthdate
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, serializeProfile(next));
    }
    setProfile(next);
    return next;
  }, []);

  const clearProfile = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
    setProfile(null);
  }, []);

  return {
    profile,
    isReady,
    saveProfile,
    clearProfile,
    calculateAgeLabel
  };
}

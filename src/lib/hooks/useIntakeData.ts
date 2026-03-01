'use client';

import { useState, useEffect, useCallback } from 'react';
import { INTAKE_QUESTIONS } from '@/lib/data/intake-questions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntakeAnswer {
  questionId: string;
  value: string | string[] | number;
  answeredAt: string;
  updatedAt: string;
}

interface ArtistIntakeData {
  artistName: string;
  answers: Record<string, IntakeAnswer>;
  lastUpdated: string;
}

interface IntakeStore {
  version: 1;
  artists: Record<string, ArtistIntakeData>;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mcc-artist-intake';

function loadStore(): IntakeStore {
  if (typeof window === 'undefined') return { version: 1, artists: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, artists: {} };
    const parsed = JSON.parse(raw) as IntakeStore;
    if (parsed.version === 1) return parsed;
    return { version: 1, artists: {} };
  } catch {
    return { version: 1, artists: {} };
  }
}

function persistStore(store: IntakeStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIntakeData(artistName: string) {
  const [answers, setAnswers] = useState<Record<string, IntakeAnswer>>({});
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const store = loadStore();
    const artistData = store.artists[artistName];
    if (artistData) {
      setAnswers(artistData.answers);
    } else {
      setAnswers({});
    }
    setMounted(true);
  }, [artistName]);

  const saveAnswer = useCallback(
    (questionId: string, value: string | string[] | number) => {
      const now = new Date().toISOString();
      setAnswers(prev => {
        const existing = prev[questionId];
        const updated = {
          ...prev,
          [questionId]: {
            questionId,
            value,
            answeredAt: existing?.answeredAt ?? now,
            updatedAt: now,
          },
        };

        // Persist to localStorage
        const store = loadStore();
        if (!store.artists[artistName]) {
          store.artists[artistName] = {
            artistName,
            answers: {},
            lastUpdated: now,
          };
        }
        store.artists[artistName].answers = updated;
        store.artists[artistName].lastUpdated = now;
        persistStore(store);

        return updated;
      });
    },
    [artistName],
  );

  const getAnswer = useCallback(
    (questionId: string): string | string[] | number | undefined => {
      return answers[questionId]?.value;
    },
    [answers],
  );

  const clearAll = useCallback(() => {
    setAnswers({});
    const store = loadStore();
    delete store.artists[artistName];
    persistStore(store);
  }, [artistName]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = INTAKE_QUESTIONS.length;
  const completionPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const lastUpdated = mounted
    ? (loadStore().artists[artistName]?.lastUpdated ?? null)
    : null;

  return {
    answers,
    saveAnswer,
    getAnswer,
    clearAll,
    completionPct,
    answeredCount,
    totalQuestions,
    lastUpdated,
    mounted,
  };
}

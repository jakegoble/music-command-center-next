'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { type ArtistFilter, parseArtistParam, artistToParam } from '@/config/notion';

interface ArtistContextType {
  artist: ArtistFilter;
  setArtist: (artist: ArtistFilter) => void;
}

const ArtistContext = createContext<ArtistContextType>({
  artist: 'all',
  setArtist: () => {},
});

export function ArtistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [artist, setArtistState] = useState<ArtistFilter>(() => {
    return parseArtistParam(searchParams.get('artist'));
  });

  // Sync from URL on mount and when searchParams change
  useEffect(() => {
    const fromUrl = parseArtistParam(searchParams.get('artist'));
    setArtistState(fromUrl);
  }, [searchParams]);

  // Update URL when artist changes
  const setArtist = useCallback(
    (newArtist: ArtistFilter) => {
      setArtistState(newArtist);

      const params = new URLSearchParams(searchParams.toString());
      if (newArtist === 'all') {
        params.delete('artist');
      } else {
        params.set('artist', artistToParam(newArtist));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return (
    <ArtistContext.Provider value={{ artist, setArtist }}>
      {children}
    </ArtistContext.Provider>
  );
}

export function useArtistContext() {
  return useContext(ArtistContext);
}

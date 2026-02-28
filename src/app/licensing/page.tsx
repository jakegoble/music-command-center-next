'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { LicensingContactSummary } from '@/lib/types';

export default function LicensingPage() {
  const [contacts, setContacts] = useState<LicensingContactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/licensing-contacts')
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setContacts(data.contacts ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Licensing Contacts" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load licensing contacts: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Licensing Contacts" />

      <p className="mt-2 text-sm text-gray-400">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Contact Name</th>
              <th className="px-3 py-3">Status</th>
              <th className="hidden px-3 py-3 md:table-cell">Genre Focus</th>
              <th className="hidden px-3 py-3 lg:table-cell">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td colSpan={5} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-800/50" />
                  </td>
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No licensing contacts found.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3 font-medium text-white">{c.company}</td>
                  <td className="px-3 py-3 text-gray-300">{c.contact_name ?? '\u2014'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'Active' ? 'bg-green-900/50 text-green-300' :
                      c.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>{c.status ?? '\u2014'}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{c.genre_focus.join(', ') || '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{c.last_contact ?? '\u2014'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { ContractSummary } from '@/lib/types';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    const qs = params.toString();

    fetch(`/api/contracts${qs ? `?${qs}` : ''}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setContracts(data.contracts ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [statusFilter, typeFilter]);

  if (error) {
    return (
      <div>
        <PageHeader title="Contracts" />
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
          Failed to load contracts: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Contracts" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Pending">Pending</option>
        </select>
        <input
          type="text"
          placeholder="Filter by type..."
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
        />
        <span className="ml-auto text-sm text-gray-400">
          {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty data warning */}
      {!isLoading && contracts.length > 0 && (() => {
        const total = contracts.length;
        const hasType = contracts.filter(c => c.type && c.type !== '\u2014').length;
        const hasParties = contracts.filter(c => c.parties && c.parties !== '\u2014').length;
        const hasStatus = contracts.filter(c => c.status && c.status !== '\u2014').length;
        const hasDateSigned = contracts.filter(c => c.date_signed && c.date_signed !== '\u2014').length;
        const hasExpiration = contracts.filter(c => c.expiration && c.expiration !== '\u2014').length;
        const hasKeyTerms = contracts.filter(c => c.key_terms && c.key_terms !== '\u2014').length;
        const completeness = [hasType, hasParties, hasStatus, hasDateSigned, hasExpiration, hasKeyTerms];
        const totalFilled = completeness.reduce((s, v) => s + v, 0);
        const totalPossible = total * 6;
        if (totalFilled < totalPossible * 0.5) {
          return (
            <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              <p className="font-medium">Contracts data is incomplete</p>
              <p className="mt-1 text-xs text-amber-400/70">
                {hasType}/{total} have type &middot; {hasParties}/{total} have parties &middot; {hasStatus}/{total} have status &middot; {hasDateSigned}/{total} have date signed &middot; {hasExpiration}/{total} have expiration &middot; {hasKeyTerms}/{total} have key terms.
                Update the Contracts database in Notion to fill in missing fields.
              </p>
            </div>
          );
        }
        return null;
      })()}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">Document Name</th>
              <th className="px-3 py-3">Type</th>
              <th className="hidden px-3 py-3 md:table-cell">Parties</th>
              <th className="px-3 py-3">Status</th>
              <th className="hidden px-3 py-3 lg:table-cell">Date Signed</th>
              <th className="hidden px-3 py-3 lg:table-cell">Expiration</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td colSpan={6} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-800/50" />
                  </td>
                </tr>
              ))
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  No contracts found.
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-3 py-3 font-medium text-white">{c.document_name}</td>
                  <td className="px-3 py-3 text-gray-400">{c.type ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-400 md:table-cell">{c.parties ?? '\u2014'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'Active' ? 'bg-green-900/50 text-green-300' :
                      c.status === 'Expired' ? 'bg-red-900/50 text-red-300' :
                      c.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-700/50 text-gray-300'
                    }`}>{c.status ?? '\u2014'}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{c.date_signed ?? '\u2014'}</td>
                  <td className="hidden px-3 py-3 text-gray-400 lg:table-cell">{c.expiration ?? '\u2014'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import type { Competitor } from '@/types';
import Card from '@/components/ui/Card';

interface CompetitorTableProps {
  competitors: Competitor[];
}

export default function CompetitorTable({ competitors }: CompetitorTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Competitor
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Key Weakness
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {competitors.map((competitor, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {competitor.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                  {competitor.description}
                </td>
                <td className="px-6 py-4 text-sm text-red-600 max-w-xs">
                  {competitor.weakness}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

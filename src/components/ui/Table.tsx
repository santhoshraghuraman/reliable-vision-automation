import React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#101018]">
      <table className={cn('w-full text-left text-sm text-zinc-300', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-[#0B0B12] text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/[0.08]', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-white/[0.04] bg-[#101018]', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-white/[0.03] transition-colors duration-150', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4.5 py-3.5 font-bold text-zinc-300 tracking-wider', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4.5 py-4 align-middle text-zinc-300 font-medium text-xs sm:text-sm', className)} {...props}>
      {children}
    </td>
  );
}

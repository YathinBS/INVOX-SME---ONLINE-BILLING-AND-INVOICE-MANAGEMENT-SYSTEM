import React from 'react';
import { CheckCircle, Clock, AlertCircle, CircleDot } from 'lucide-react';
import { PaymentStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: PaymentStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = (status || '').toUpperCase();

  switch (norm) {
    case 'PAID':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Paid
        </span>
      );
    case 'PARTIALLY_PAID':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <CircleDot className="w-3.5 h-3.5 text-amber-600" />
          Partially Paid
        </span>
      );
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Overdue
        </span>
      );
    case 'UNPAID':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Unpaid
        </span>
      );
  }
};

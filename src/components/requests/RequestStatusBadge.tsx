import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package, 
  AlertCircle,
  Zap,
  Eye,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import type { RequestStatus } from '@/types/request';

interface RequestStatusBadgeProps {
  status: RequestStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function RequestStatusBadge({ status, showIcon = true, size = 'default' }: RequestStatusBadgeProps) {
  const getStatusConfig = (status: RequestStatus) => {
    const configs = {
      draft: {
        label: 'Draft',
        icon: FileText,
        className: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md hover:shadow-lg border border-slate-400/30',
      },
      submitted: {
        label: 'Submitted',
        icon: Eye,
        className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg border border-blue-400/30',
      },
      inbox: {
        label: 'Inbox',
        icon: Inbox,
        className: 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md hover:shadow-lg border border-blue-400/30',
      },
      pending_manager_approval: {
        label: 'Pending Manager',
        icon: Clock,
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:shadow-lg border border-amber-400/30',
      },
      pending_admin_approval: {
        label: 'Pending Admin',
        icon: AlertCircle,
        className: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg border border-purple-400/30',
      },
      approved: {
        label: 'Approved',
        icon: CheckCircle,
        className: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md hover:shadow-lg border border-emerald-400/30',
      },
      declined: {
        label: 'Declined',
        icon: XCircle,
        className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:shadow-lg border border-red-400/30',
      },
      ordered: {
        label: 'Ordered',
        icon: Truck,
        className: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md hover:shadow-lg border border-indigo-400/30',
      },
      delivered: {
        label: 'Delivered',
        icon: Package,
        className: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg border border-teal-400/30',
      },
      cancelled: {
        label: 'Cancelled',
        icon: XCircle,
        className: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md hover:shadow-lg border border-gray-400/30',
      },
      in_progress: {
        label: 'In Progress',
        icon: Zap,
        className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg border border-blue-400/30',
      },
      awaiting_information: {
        label: 'Awaiting Info',
        icon: AlertCircle,
        className: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md hover:shadow-lg border border-yellow-400/30',
      },
      on_hold: {
        label: 'On Hold',
        icon: Clock,
        className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg border border-orange-400/30',
      },
      completed: {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md hover:shadow-lg border border-green-500/30',
      },
    };

    return configs[status] || configs.submitted;
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 h-6',
    default: 'text-sm px-3 py-1 h-7',
    lg: 'text-base px-4 py-2 h-8'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge 
      className={`
        ${config.className} 
        ${sizeClasses[size]}
        inline-flex items-center gap-1.5 rounded-full font-medium 
        transition-all duration-200 hover:scale-105 cursor-default
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
import React from 'react';
import { Search, Filter, Calendar, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RequestStatus, RequestPriority } from '@/types/request';

interface RequestFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: RequestStatus | 'all';
  onStatusFilterChange: (value: RequestStatus | 'all') => void;
  priorityFilter: RequestPriority | 'all';
  onPriorityFilterChange: (value: RequestPriority | 'all') => void;
  dateRange: 'all' | '7d' | '30d' | '90d';
  onDateRangeChange: (value: 'all' | '7d' | '30d' | '90d') => void;
  minAmount?: number;
  maxAmount?: number;
  onAmountChange: (min?: number, max?: number) => void;
  totalResults: number;
  onClearFilters: () => void;
}

export function RequestFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateRange,
  onDateRangeChange,
  minAmount,
  maxAmount,
  onAmountChange,
  totalResults,
  onClearFilters
}: RequestFiltersProps) {
  const hasActiveFilters = 
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateRange !== 'all' ||
    minAmount !== undefined ||
    maxAmount !== undefined ||
    searchTerm.length > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search requests by title, description, or items..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending_manager_approval">Pending Manager</SelectItem>
                <SelectItem value="pending_admin_approval">Pending Admin</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min $"
                value={minAmount || ''}
                onChange={(e) => onAmountChange(
                  e.target.value ? parseFloat(e.target.value) : undefined,
                  maxAmount
                )}
                className="w-20"
              />
              <Input
                type="number"
                placeholder="Max $"
                value={maxAmount || ''}
                onChange={(e) => onAmountChange(
                  minAmount,
                  e.target.value ? parseFloat(e.target.value) : undefined
                )}
                className="w-20"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results and Active Filters */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {totalResults} request{totalResults !== 1 ? 's' : ''} found
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <div className="flex gap-1">
                  {statusFilter !== 'all' && (
                    <Badge variant="info" className="text-xs">
                      Status: {statusFilter.replace('_', ' ')}
                    </Badge>
                  )}
                  {priorityFilter !== 'all' && (
                    <Badge variant="warning" className="text-xs">
                      Priority: {priorityFilter}
                    </Badge>
                  )}
                  {dateRange !== 'all' && (
                    <Badge variant="success" className="text-xs">
                      Date: {dateRange}
                    </Badge>
                  )}
                  {(minAmount !== undefined || maxAmount !== undefined) && (
                    <Badge variant="premium" className="text-xs">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {minAmount || 0} - {maxAmount || '∞'}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
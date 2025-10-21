'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'

export interface WorkEntryFilters {
  status?: 'draft' | 'submitted' | 'returned' | 'approved' | 'all'
  dateFrom?: string
  dateTo?: string
  workType?: string
}

interface WorkEntryFiltersProps {
  filters: WorkEntryFilters
  onFiltersChange: (filters: WorkEntryFilters) => void
  onReset: () => void
}

export function WorkEntryFiltersComponent({
  filters,
  onFiltersChange,
  onReset
}: WorkEntryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters = () => {
    return (
      (filters.status && filters.status !== 'all') ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.workType
    )
  }

  const updateFilter = (key: keyof WorkEntryFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
            {hasActiveFilters() && (
              <span className="text-sm font-normal text-muted-foreground">
                (активны)
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Статус</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilter('status', value as any)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="submitted">Отправлено</SelectItem>
                <SelectItem value="returned">Возвращено</SelectItem>
                <SelectItem value="approved">Утверждено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">С даты</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">По дату</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Work Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="work-type-filter">Тип работы</Label>
            <Select
              value={filters.workType || 'all'}
              onValueChange={(value) => updateFilter('workType', value === 'all' ? undefined : value)}
            >
              <SelectTrigger id="work-type-filter">
                <SelectValue placeholder="Все типы работ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы работ</SelectItem>
                <SelectItem value="fiber_installation">Монтаж оптоволокна</SelectItem>
                <SelectItem value="trenching">Земляные работы</SelectItem>
                <SelectItem value="cabinet_installation">Установка шкафов</SelectItem>
                <SelectItem value="house_connection">Подключение домов</SelectItem>
                <SelectItem value="repair">Ремонт</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

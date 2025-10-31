'use client'

import { Button } from '@/components/ui/button'
import { DOCUMENT_CATEGORIES } from '@/lib/constants/document-categories'
import type { WorkerDocumentCategory } from '@/types/models'
import { Badge } from '@/components/ui/badge'

interface DocumentCategoryFilterProps {
  selectedCategory?: WorkerDocumentCategory
  onCategoryChange: (category: WorkerDocumentCategory | undefined) => void
}

export function DocumentCategoryFilter({
  selectedCategory,
  onCategoryChange,
}: DocumentCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={!selectedCategory ? 'default' : 'outline'}
        size="sm"
        onClick={() => onCategoryChange(undefined)}
        className="rounded-full"
      >
        Все
      </Button>

      {DOCUMENT_CATEGORIES.map((category) => (
        <Button
          key={category.value}
          variant={selectedCategory === category.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(category.value)}
          className="rounded-full"
        >
          {category.label}
        </Button>
      ))}
    </div>
  )
}

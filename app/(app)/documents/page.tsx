'use client'

import { useState } from 'react'
import { useWorkerDocuments } from '@/lib/hooks/use-worker-documents'
import { DocumentList } from '@/components/documents/document-list'
import { DocumentCategoryFilter } from '@/components/documents/document-category-filter'
import { Input } from '@/components/ui/input'
import { Search, FileText } from 'lucide-react'
import type { WorkerDocumentCategory } from '@/types/models'

export default function DocumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<WorkerDocumentCategory | undefined>()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: documents, isLoading, error } = useWorkerDocuments({
    category: selectedCategory,
    search: searchQuery,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Мои Документы</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск документов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <DocumentCategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 px-4">
            <p className="text-destructive text-center mb-2">Ошибка при загрузке документов</p>
            <p className="text-sm text-muted-foreground text-center">
              {error instanceof Error ? error.message : 'Неизвестная ошибка'}
            </p>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-4">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-2">
              {searchQuery || selectedCategory
                ? 'Документы не найдены'
                : 'У вас пока нет документов'}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || selectedCategory
                ? 'Попробуйте изменить фильтры поиска'
                : 'Документы будут добавлены администратором'}
            </p>
          </div>
        ) : (
          <DocumentList documents={documents} />
        )}
      </div>
    </div>
  )
}

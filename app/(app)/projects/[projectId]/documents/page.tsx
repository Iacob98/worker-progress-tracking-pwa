'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Search, ArrowLeft, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProjectDocuments, useDocumentCategories } from '@/lib/hooks/use-project-documents'
import type { ProjectDocument } from '@/types/models'

export default function ProjectDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId as string

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | undefined>()
  const [showOnlyRequired, setShowOnlyRequired] = useState(false)

  // Fetch documents with filters
  const {
    data: documents,
    isLoading,
    error,
  } = useProjectDocuments(projectId, {
    categoryCode: selectedCategoryCode,
    search: searchQuery,
    isRequired: showOnlyRequired ? true : undefined,
  })

  // Fetch categories
  const { data: categories } = useDocumentCategories()

  // Separate required and optional documents
  const requiredDocs = documents?.filter(doc => doc.isRequired) || []
  const optionalDocs = documents?.filter(doc => !doc.isRequired) || []

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Документы проекта</h1>
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

        {/* Filters */}
        <div className="space-y-2">
          {/* Show only required toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={showOnlyRequired ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyRequired(!showOnlyRequired)}
              className="rounded-full"
            >
              {showOnlyRequired ? '✓ ' : ''}Только обязательные
            </Button>
          </div>

          {/* Category filters */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategoryCode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryCode(undefined)}
                className="rounded-full"
              >
                Все
              </Button>

              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryCode === category.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoryCode(category.code)}
                  className="rounded-full"
                >
                  {category.nameRu}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            <p>Ошибка загрузки документов</p>
            <p className="text-sm">{error.message}</p>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Документы не найдены</p>
            <p className="text-sm">
              {searchQuery || selectedCategoryCode
                ? 'Попробуйте изменить фильтры'
                : 'Документы для этого проекта еще не загружены'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Required documents section */}
            {requiredDocs.length > 0 && (
              <div className="bg-white">
                <div className="p-4 bg-amber-50 border-b border-amber-100">
                  <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                    <span>📌</span>
                    Обязательные документы ({requiredDocs.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {requiredDocs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}

            {/* Optional documents section */}
            {optionalDocs.length > 0 && (
              <div className="bg-white mt-4">
                <div className="p-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <span>📂</span>
                    Справочные документы ({optionalDocs.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {optionalDocs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// DocumentCard component (inline for now, will extract later)
function DocumentCard({ document }: { document: ProjectDocument }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { useDownloadProjectDocument } = require('@/lib/hooks/use-project-documents')
  const downloadDocument = useDownloadProjectDocument()

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadDocument(document, document.filePath || undefined)
    } catch (error) {
      console.error('Download error:', error)
      alert('Ошибка при скачивании документа')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePreview = () => {
    const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3000'

    // Build preview URL from filePath
    let previewUrl: string
    if (document.filePath && document.filePath.startsWith('/api/')) {
      // Use Admin API endpoint for preview (replace /download with /preview if available, or use as-is)
      previewUrl = `${adminApiUrl}${document.filePath}`
    } else if (document.filePath && document.filePath.startsWith('/documents/')) {
      previewUrl = `${adminApiUrl}${document.filePath}`
    } else {
      // Fallback to Supabase Storage
      previewUrl = `https://oijmohlhdxoawzvctnxx.supabase.co/storage/v1/object/public/project-documents/${document.filename}`
    }

    console.log('👁️ Opening preview in new window:', previewUrl)

    // Open in new window
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
  }

  return (
    <div className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm leading-tight">
              {document.originalFilename || document.filename}
            </h3>
            {document.isRequired && (
              <Badge variant="destructive" className="text-xs flex-shrink-0">
                Обязательно
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
            {document.categoryName && (
              <Badge variant="outline" className="text-xs">
                {document.categoryName}
              </Badge>
            )}
            {document.fileSize && (
              <span>{formatFileSize(document.fileSize)}</span>
            )}
            {document.documentType && (
              <span className="capitalize">{document.documentType}</span>
            )}
          </div>

          {document.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {document.description}
            </p>
          )}

          {document.dueDate && (
            <p className="text-xs text-amber-600 mb-2">
              Срок: {new Date(document.dueDate).toLocaleDateString('ru-RU')}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreview}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Просмотр
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="text-xs"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Скачивание...
                </>
              ) : (
                'Скачать'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

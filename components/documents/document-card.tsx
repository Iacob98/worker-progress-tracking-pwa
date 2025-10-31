'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Eye, FileText, Award, BookOpen, Shield, AlertTriangle, GraduationCap, User, File } from 'lucide-react'
import type { WorkerDocument } from '@/types/models'
import { DOCUMENT_CATEGORY_LABELS } from '@/lib/constants/document-categories'
import { useDownloadDocument, useGetDocumentUrl } from '@/lib/hooks/use-worker-documents'
import { formatDate } from '@/lib/utils/format'

interface DocumentCardProps {
  document: WorkerDocument
}

// Icon mapping
const CATEGORY_ICON_MAP = {
  contract: FileText,
  certificate: Award,
  instruction: BookOpen,
  policy: Shield,
  safety: AlertTriangle,
  training: GraduationCap,
  personal: User,
  other: File,
}

export function DocumentCard({ document }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const downloadDocument = useDownloadDocument()
  const getDocumentUrl = useGetDocumentUrl()

  const IconComponent = CATEGORY_ICON_MAP[document.category] || File

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadDocument(document)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Ошибка при скачивании документа')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleView = async () => {
    setIsViewing(true)
    try {
      const url = await getDocumentUrl(document)

      // Open in new tab for viewing
      if (document.mimeType === 'application/pdf') {
        window.open(url, '_blank')
      } else if (document.mimeType.startsWith('image/')) {
        window.open(url, '_blank')
      } else {
        // For other file types, download instead
        await downloadDocument(document)
      }
    } catch (error) {
      console.error('Error viewing document:', error)
      alert('Ошибка при просмотре документа')
    } finally {
      setIsViewing(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight mb-1 truncate">
                {document.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {DOCUMENT_CATEGORY_LABELS[document.category]}
                </Badge>
                <span>•</span>
                <span>{formatFileSize(document.fileSize)}</span>
                <span>•</span>
                <span>{formatDate(document.createdAt)}</span>
              </div>
              {document.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {document.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {(document.mimeType === 'application/pdf' || document.mimeType.startsWith('image/')) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleView}
                disabled={isViewing}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                {isViewing ? 'Открытие...' : 'Просмотр'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1" />
              {isDownloading ? 'Скачивание...' : 'Скачать'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

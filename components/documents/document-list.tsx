'use client'

import { DocumentCard } from './document-card'
import type { WorkerDocument } from '@/types/models'

interface DocumentListProps {
  documents: WorkerDocument[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (!documents || documents.length === 0) {
    return null
  }

  return (
    <div className="divide-y">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  )
}

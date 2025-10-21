'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MapPin, Box, Calendar } from 'lucide-react'
import type { Project } from '@/types/models'
import { formatDate, formatMeters, formatPercentage } from '@/lib/utils/format'
import { calculateProgress } from '@/lib/utils/calculations'
import Link from 'next/link'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            <Badge
              variant={project.status === 'active' ? 'default' : 'secondary'}
            >
              {project.status === 'active' ? 'Активный' : project.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Total Length */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Общая длина</span>
              <span className="font-medium">{formatMeters(project.totalLengthM)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">НВТ</div>
                <div className="text-sm font-medium">{project.cabinetCount}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Дата начала</div>
                <div className="text-sm font-medium">
                  {project.startDate ? formatDate(project.startDate) : '—'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

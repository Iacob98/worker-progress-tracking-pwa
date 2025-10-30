'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useProjects } from '@/lib/hooks/use-projects'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ProjectsPage() {
  const { worker, signOut } = useAuth()
  const { data: projects, isLoading, error } = useProjects()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Проекты</h1>
          <p className="text-muted-foreground">
            Добро пожаловать, {worker?.firstName || worker?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/documents')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Мои документы
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Выйти
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка при загрузке проектов. Проверьте подключение к интернету.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && projects?.length === 0 && (
        <Alert>
          <AlertDescription>
            У вас пока нет назначенных проектов. Обратитесь к вашему руководителю.
          </AlertDescription>
        </Alert>
      )}

      {/* Projects Grid */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

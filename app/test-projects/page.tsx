'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestProjectsPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { worker } = useAuth()
  const supabase = createClient()

  const testTables = async () => {
    setLoading(true)
    try {
      const tests: any = {}

      // Test 1: Check if crew_id exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, crew_id, role')
        .eq('email', 'K1_4@kometa.com')
        .single()

      tests.user = { data: userData, error: userError?.message }

      // Test 2: Check if crew_members table exists
      const { data: crewMembers, error: crewError } = await supabase
        .from('crew_members')
        .select('*')
        .eq('user_id', worker?.id)
        .limit(5)

      tests.crewMembers = {
        exists: !crewError,
        data: crewMembers,
        error: crewError?.message
      }

      // Test 3: Check if project_workers table exists
      const { data: projectWorkers, error: pwError } = await supabase
        .from('project_workers')
        .select('*')
        .eq('user_id', worker?.id)
        .limit(5)

      tests.projectWorkers = {
        exists: !pwError,
        data: projectWorkers,
        error: pwError?.message
      }

      // Test 4: Check crews table
      const { data: crews, error: crewsError } = await supabase
        .from('crews')
        .select('*, projects:project_id(*)')
        .limit(5)

      tests.crews = {
        exists: !crewsError,
        data: crews,
        error: crewsError?.message
      }

      // Test 5: Get user's crew if crew_id exists
      if (userData?.crew_id) {
        const { data: crewData, error: crewDataError } = await supabase
          .from('crews')
          .select('*, project:project_id(*)')
          .eq('id', userData.crew_id)
          .single()

        tests.userCrew = { data: crewData, error: crewDataError?.message }
      }

      // Test 6: All projects
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .limit(10)

      tests.allProjects = { data: allProjects, error: projectsError?.message }

      setResult(tests)
    } catch (err: any) {
      console.error('Exception:', err)
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Projects Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Worker ID: {worker?.id}
            </p>
            <p className="text-sm text-muted-foreground">
              Email: {worker?.email}
            </p>
            <p className="text-sm text-muted-foreground">
              Role: {worker?.role}
            </p>
          </div>

          <Button onClick={testTables} disabled={loading}>
            Test Database Structure
          </Button>

          {loading && <p className="text-sm">Loading...</p>}

          {result && (
            <div className="mt-4">
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-[600px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

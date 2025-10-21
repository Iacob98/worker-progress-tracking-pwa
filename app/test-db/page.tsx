'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestDBPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function runTests() {
    setLoading(true)
    const testResults: any = {}

    // Get current worker from localStorage
    const sessionData = localStorage.getItem('worker_session')
    const session = sessionData ? JSON.parse(sessionData) : null
    testResults.workerId = session?.workerId

    if (!session?.workerId) {
      testResults.error = 'Нет сессии работника. Войдите в систему.'
      setResults(testResults)
      setLoading(false)
      return
    }

    // Test 1: Check crew_members table structure
    console.log('📝 Test 1: Checking crew_members structure...')
    const { data: crewMembers, error: crewError } = await supabase
      .from('crew_members')
      .select('*')
      .eq('user_id', session.workerId)
      .limit(5)

    testResults.crewMembers = {
      data: crewMembers,
      error: crewError,
      columns: crewMembers?.[0] ? Object.keys(crewMembers[0]) : [],
      count: crewMembers?.length || 0
    }

    // Test 2: Get all crew_members for this user (no filters)
    console.log('📝 Test 2: Getting all crew memberships...')
    const { data: allCrewMembers, error: allCrewError } = await supabase
      .from('crew_members')
      .select('crew_id')
      .eq('user_id', session.workerId)

    testResults.allCrewMembers = {
      data: allCrewMembers,
      error: allCrewError,
      count: allCrewMembers?.length || 0
    }

    if (allCrewMembers && allCrewMembers.length > 0) {
      const crewIds = allCrewMembers.map(cm => cm.crew_id)
      testResults.crewIds = crewIds

      // Test 3: Get crews info
      console.log('📝 Test 3: Getting crews info...')
      const { data: crews, error: crewsError } = await supabase
        .from('crews')
        .select('*')
        .in('id', crewIds)

      testResults.crews = {
        data: crews,
        error: crewsError
      }

      // Test 4: Get projects for these crews
      console.log('📝 Test 4: Getting projects...')
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          crews!inner(id, name)
        `)
        .in('crews.id', crewIds)
        .in('status', ['draft', 'planning', 'active'])

      testResults.projects = {
        data: projects,
        error: projectsError,
        count: projects?.length || 0
      }

      // Test 5: Get cabinets for all projects
      if (projects && projects.length > 0) {
        console.log('📝 Test 5: Getting cabinets (NVT)...')
        const projectIds = projects.map(p => p.id)
        const firstProjectId = projectIds[0]

        // Test with direct eq first
        const { data: cabinetsDirect, error: cabinetsDirectError } = await supabase
          .from('cabinets')
          .select('*')
          .eq('project_id', firstProjectId)

        console.log('Direct query result:', cabinetsDirect)

        const { data: cabinets, error: cabinetsError } = await supabase
          .from('cabinets')
          .select('*')
          .in('project_id', projectIds)

        console.log('In query result:', cabinets)

        testResults.cabinets = {
          data: cabinets,
          directData: cabinetsDirect,
          error: cabinetsError,
          count: cabinets?.length || 0,
          directCount: cabinetsDirect?.length || 0,
          projectIds: projectIds
        }

        // Test 5b: Get ALL cabinets to see what's there
        console.log('📝 Test 5b: Getting ALL cabinets...')
        const { data: allCabinets, error: allError } = await supabase
          .from('cabinets')
          .select('id, code, name, project_id')
          .limit(20)

        testResults.allCabinets = {
          data: allCabinets,
          error: allError,
          count: allCabinets?.length || 0
        }

        // Test 6: Get segments for first cabinet if exists
        if (cabinets && cabinets.length > 0) {
          console.log('📝 Test 6: Getting segments...')
          const { data: segments, error: segmentsError } = await supabase
            .from('segments')
            .select('*')
            .eq('cabinet_id', cabinets[0].id)
            .limit(5)

          testResults.segments = {
            data: segments,
            error: segmentsError,
            cabinetId: cabinets[0].id
          }
        }
      }
    }

    console.log('✅ All tests completed:', testResults)
    setResults(testResults)
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Диагностика БД</h1>
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Тестирование...' : 'Запустить тесты'}
        </Button>
      </div>

      {results.error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{results.error}</p>
          </CardContent>
        </Card>
      )}

      {results.workerId && (
        <Card>
          <CardHeader>
            <CardTitle>Worker ID</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-gray-100 p-2 rounded block">{results.workerId}</code>
          </CardContent>
        </Card>
      )}

      {results.crewMembers && (
        <Card>
          <CardHeader>
            <CardTitle>1. Crew Members - Структура таблицы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <strong>Количество записей:</strong> {results.crewMembers.count}
            </div>
            <div>
              <strong>Колонки в таблице:</strong>
              <pre className="text-sm bg-gray-100 p-3 rounded mt-2">
                {JSON.stringify(results.crewMembers.columns, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Данные:</strong>
              <pre className="text-sm bg-gray-100 p-3 rounded mt-2 max-h-60 overflow-auto">
                {JSON.stringify(results.crewMembers.data, null, 2)}
              </pre>
            </div>
            {results.crewMembers.error && (
              <div className="text-red-600">
                <strong>Ошибка:</strong>
                <pre className="text-sm">{JSON.stringify(results.crewMembers.error, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.crewIds && (
        <Card>
          <CardHeader>
            <CardTitle>2. Crew IDs</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded">
              {JSON.stringify(results.crewIds, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {results.crews && (
        <Card>
          <CardHeader>
            <CardTitle>3. Crews Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded max-h-60 overflow-auto">
              {JSON.stringify(results.crews.data, null, 2)}
            </pre>
            {results.crews.error && (
              <div className="text-red-600 mt-2">
                <strong>Ошибка:</strong> {results.crews.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.projects && (
        <Card>
          <CardHeader>
            <CardTitle>4. Projects ({results.projects.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded max-h-60 overflow-auto">
              {JSON.stringify(results.projects.data, null, 2)}
            </pre>
            {results.projects.error && (
              <div className="text-red-600 mt-2">
                <strong>Ошибка:</strong> {results.projects.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.cabinets && (
        <Card className={results.cabinets.count === 0 ? 'border-yellow-500' : ''}>
          <CardHeader>
            <CardTitle>5. Cabinets / НВТ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Project IDs:</strong> {results.cabinets.projectIds?.join(', ')}
              </div>

              <div className="border-t pt-3">
                <strong>Прямой запрос (.eq): {results.cabinets.directCount}</strong>
                {results.cabinets.directCount === 0 ? (
                  <div className="text-red-600 mt-2">❌ Не найдено через .eq()</div>
                ) : (
                  <pre className="text-sm bg-gray-100 p-3 rounded mt-2 max-h-40 overflow-auto">
                    {JSON.stringify(results.cabinets.directData, null, 2)}
                  </pre>
                )}
              </div>

              <div className="border-t pt-3">
                <strong>Запрос через .in(): {results.cabinets.count}</strong>
                {results.cabinets.count === 0 ? (
                  <div className="text-red-600 mt-2">❌ Не найдено через .in()</div>
                ) : (
                  <pre className="text-sm bg-gray-100 p-3 rounded mt-2 max-h-40 overflow-auto">
                    {JSON.stringify(results.cabinets.data, null, 2)}
                  </pre>
                )}
              </div>

              {results.cabinets.error && (
                <div className="text-red-600 mt-2">
                  <strong>Ошибка:</strong> {results.cabinets.error.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.allCabinets && (
        <Card className={results.allCabinets.count > 0 ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle>5b. ВСЕ НВТ в базе (первые 20): {results.allCabinets.count}</CardTitle>
          </CardHeader>
          <CardContent>
            {results.allCabinets.count === 0 ? (
              <div className="text-red-600 font-semibold">
                ❌ В таблице cabinets нет данных вообще!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-blue-600 font-semibold">
                  ✅ Найдено {results.allCabinets.count} НВТ точек
                </div>
                <pre className="text-sm bg-gray-100 p-3 rounded max-h-60 overflow-auto">
                  {JSON.stringify(results.allCabinets.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.segments && (
        <Card>
          <CardHeader>
            <CardTitle>6. Segments (для cabinet: {results.segments.cabinetId})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded max-h-60 overflow-auto">
              {JSON.stringify(results.segments.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

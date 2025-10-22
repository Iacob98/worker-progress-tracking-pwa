import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oijmohlhdxoawzvctnxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pam1vaGxoZHhvYXd6dmN0bnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODUzMjcsImV4cCI6MjA3MDg2MTMyN30.vw9G5hcSfd-m5AZqeGlmzGvqc9ImYioDFR-AsiHoFro'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  console.log('🔒 Проверка RLS политик на таблице cabinets...\n')

  const projectId = '8cd3a97f-e911-42c3-b145-f9f5c1c6340a'
  const cabinetId = '448df18e-52df-432d-bd82-32c8a51250fd'

  // 1. Try to query the specific cabinet that we know exists
  console.log('1️⃣ Попытка получить конкретный cabinet по ID:')
  console.log(`   ID: ${cabinetId}`)
  const { data: byId, error: byIdError } = await supabase
    .from('cabinets')
    .select('*')
    .eq('id', cabinetId)
    .single()

  if (byIdError) {
    console.error('   ❌ Ошибка:', byIdError.message)
    console.error('   Code:', byIdError.code)
    console.error('   Details:', byIdError.details)
    console.error('   Hint:', byIdError.hint)
  } else if (byId) {
    console.log('   ✅ Найден:', byId)
  } else {
    console.log('   ⚠️  Не найден (null)')
  }
  console.log()

  // 2. Query with RLS info in error
  console.log('2️⃣ Проверка всех cabinets для проекта:')
  const { data: byProject, error: projectError, count } = await supabase
    .from('cabinets')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  console.log('   Count:', count)
  console.log('   Data length:', byProject?.length || 0)
  if (projectError) {
    console.error('   ❌ Ошибка:', projectError.message)
    console.error('   Code:', projectError.code)
    console.error('   Details:', projectError.details)
  } else {
    console.log('   Data:', byProject)
  }
  console.log()

  // 3. Try with no filters at all
  console.log('3️⃣ Запрос БЕЗ фильтров (limit 50):')
  const { data: noFilter, error: noFilterError, count: noFilterCount } = await supabase
    .from('cabinets')
    .select('*', { count: 'exact' })
    .limit(50)

  console.log('   Count:', noFilterCount)
  console.log('   Data length:', noFilter?.length || 0)
  if (noFilterError) {
    console.error('   ❌ Ошибка:', noFilterError.message)
  } else if (noFilter && noFilter.length > 0) {
    console.log('   ✅ Найдено записей:', noFilter.length)
    console.log('   Первая запись:', noFilter[0])
  } else {
    console.log('   ⚠️  RLS блокирует доступ - 0 записей возвращено')
  }
  console.log()

  // 4. Check other tables for comparison
  console.log('4️⃣ Проверка доступа к другим таблицам:')

  const tables = ['projects', 'crews', 'crew_members']
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`)
    } else {
      console.log(`   ✅ ${table}: count=${count}, доступ есть`)
    }
  }
  console.log()

  // 5. Try to get RLS policies info (this might not work with anon key)
  console.log('5️⃣ Информация о RLS (может не сработать с anon key):')
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_policies', { table_name: 'cabinets' })

  if (policiesError) {
    console.log('   ⚠️  Не удалось получить политики:', policiesError.message)
    console.log('   Это нормально для anon ключа')
  } else {
    console.log('   Policies:', policies)
  }
  console.log()

  console.log('📋 ЗАКЛЮЧЕНИЕ:')
  console.log('Если все запросы возвращают 0 записей или ошибку "row-level security policy",')
  console.log('то проблема в RLS политиках на таблице cabinets.')
  console.log('\nНеобходимо добавить политику в Supabase Dashboard:')
  console.log('CREATE POLICY "Allow read access to cabinets" ON public.cabinets')
  console.log('FOR SELECT USING (true);')
  console.log('\nИли более строгую политику для аутентифицированных пользователей.')
}

checkRLS().catch(console.error)

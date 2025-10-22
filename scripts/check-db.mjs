import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oijmohlhdxoawzvctnxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pam1vaGxoZHhvYXd6dmN0bnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODUzMjcsImV4cCI6MjA3MDg2MTMyN30.vw9G5hcSfd-m5AZqeGlmzGvqc9ImYioDFR-AsiHoFro'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Проверка структуры БД...\n')

  const projectId = '8cd3a97f-e911-42c3-b145-f9f5c1c6340a'

  // 1. Check projects table
  console.log('1️⃣ Проект:')
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) {
    console.error('   ❌ Ошибка:', projectError.message)
  } else {
    console.log('   ✅ Найден:', project.name)
    console.log('   Статус:', project.status)
  }
  console.log()

  // 2. Check all tables that might contain NVT/Cabinet data
  const tables = ['cabinets', 'nvt', 'nvt_points', 'cut_points', 'fiber_cabinets']

  for (const table of tables) {
    console.log(`2️⃣ Проверка таблицы "${table}":`)
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false })
      .eq('project_id', projectId)
      .limit(5)

    if (error) {
      if (error.code === '42P01') {
        console.log(`   ⚠️  Таблица не существует`)
      } else {
        console.log(`   ❌ Ошибка: ${error.message}`)
      }
    } else {
      console.log(`   ✅ Таблица существует, записей для проекта: ${data?.length || 0}`)
      if (data && data.length > 0) {
        console.log('   Первая запись:')
        console.log('  ', JSON.stringify(data[0], null, 2))
      }
    }
    console.log()
  }

  // 3. List all tables in the schema
  console.log('3️⃣ Получение списка ВСЕХ таблиц через RPC...')
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_tables_list')
  if (rpcError) {
    console.log('   ⚠️  RPC функция не существует, попробую другой способ')
  } else {
    console.log('   Таблицы:', rpcData)
  }
  console.log()

  // 4. Try to query information_schema (if accessible)
  console.log('4️⃣ Попытка получить все таблицы через postgrest...')

  // List some common tables
  const commonTables = [
    'users', 'projects', 'crews', 'crew_members',
    'cabinets', 'segments', 'work_entries', 'photos',
    'nvt', 'houses', 'apartments', 'fiber_cuts'
  ]

  console.log('   Проверка распространенных таблиц:')
  for (const table of commonTables) {
    const { data, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (!error) {
      console.log(`   ✅ ${table}`)
    }
  }
  console.log()

  // 5. Check if there are ANY cabinets in the database at all
  console.log('5️⃣ Проверка ВСЕХ записей в cabinets (первые 10):')
  const { data: allCabinets, error: allError } = await supabase
    .from('cabinets')
    .select('*')
    .limit(10)

  if (allError) {
    console.error('   ❌ Ошибка:', allError.message)
  } else {
    console.log(`   Всего записей: ${allCabinets?.length || 0}`)
    if (allCabinets && allCabinets.length > 0) {
      console.log('   Записи:', JSON.stringify(allCabinets, null, 2))
    } else {
      console.log('   ⚠️  Таблица cabinets ПУСТАЯ!')
    }
  }
  console.log()

  // 6. Search for "68V1052" across potential columns
  console.log('6️⃣ Поиск "68V1052" в cabinets:')
  const { data: searchResult, error: searchError } = await supabase
    .from('cabinets')
    .select('*')
    .or('code.ilike.%68V1052%,name.ilike.%68V1052%')

  if (searchError) {
    console.error('   ❌ Ошибка:', searchError.message)
  } else if (searchResult && searchResult.length > 0) {
    console.log('   ✅ Найдено:', searchResult.length)
    console.log('  ', JSON.stringify(searchResult, null, 2))
  } else {
    console.log('   ⚠️  Не найдено')
  }
}

checkDatabase().catch(console.error)

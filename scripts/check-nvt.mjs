import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oijmohlhdxoawzvctnxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pam1vaGxoZHhvYXd6dmN0bnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODUzMjcsImV4cCI6MjA3MDg2MTMyN30.vw9G5hcSfd-m5AZqeGlmzGvqc9ImYioDFR-AsiHoFro'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNVT() {
  const projectId = '8cd3a97f-e911-42c3-b145-f9f5c1c6340a'

  console.log('🔍 Проверка таблицы NVT...\n')

  // 1. Get all NVT for project
  console.log('1️⃣ Получение всех NVT для проекта:')
  const { data: nvtData, error: nvtError } = await supabase
    .from('nvt')
    .select('*')
    .eq('project_id', projectId)

  if (nvtError) {
    console.error('   ❌ Ошибка:', nvtError.message)
  } else {
    console.log(`   ✅ Найдено записей: ${nvtData?.length || 0}`)
    if (nvtData && nvtData.length > 0) {
      console.log('   Записи:')
      console.log(JSON.stringify(nvtData, null, 2))
    }
  }
  console.log()

  // 2. Search for specific code
  console.log('2️⃣ Поиск "68V1052" в nvt:')
  const { data: searchData, error: searchError } = await supabase
    .from('nvt')
    .select('*')
    .or('code.ilike.%68V1052%,name.ilike.%68V1052%,address.ilike.%68V1052%')

  if (searchError) {
    console.error('   ❌ Ошибка:', searchError.message)
  } else if (searchData && searchData.length > 0) {
    console.log(`   ✅ Найдено: ${searchData.length}`)
    console.log(JSON.stringify(searchData, null, 2))
  } else {
    console.log('   ⚠️  Не найдено')
  }
  console.log()

  // 3. Get ALL NVT (first 20)
  console.log('3️⃣ Все NVT в базе (первые 20):')
  const { data: allNVT, error: allError } = await supabase
    .from('nvt')
    .select('id, project_id, code, name, address')
    .limit(20)

  if (allError) {
    console.error('   ❌ Ошибка:', allError.message)
  } else {
    console.log(`   Всего записей: ${allNVT?.length || 0}`)
    if (allNVT && allNVT.length > 0) {
      console.log(JSON.stringify(allNVT, null, 2))
    } else {
      console.log('   ⚠️  Таблица nvt тоже ПУСТАЯ!')
    }
  }
}

checkNVT().catch(console.error)

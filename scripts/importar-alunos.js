// scripts/importar-alunos.js
//
// Importa alunos em lote a partir do arquivo importacao-alunos.xlsx.
// Uso:  node scripts/importar-alunos.js caminho/para/importacao-alunos.xlsx
//
// Precisa que o .env (na raiz do projeto) já tenha VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY preenchidos, e pede seu e-mail/senha de admin
// na hora de rodar (é preciso estar autenticado pra gravar no banco).

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
import readline from 'node:readline/promises'

const caminhoArquivo = process.argv[2]
if (!caminhoArquivo) {
  console.error('Uso: node scripts/importar-alunos.js caminho/para/importacao-alunos.xlsx')
  process.exit(1)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const email = await rl.question('Seu e-mail de admin: ')
  const senha = await rl.question('Sua senha: ')
  rl.close()

  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (erroLogin) {
    console.error('Não foi possível fazer login:', erroLogin.message)
    process.exit(1)
  }
  console.log('Login OK. Lendo planilha...')

  const workbook = xlsx.readFile(caminhoArquivo)
  const sheet = workbook.Sheets['Alunos']
  const linhas = xlsx.utils.sheet_to_json(sheet, { defval: '' })

  let sucesso = 0
  let erros = 0

  for (const linha of linhas) {
    const nome = String(linha['Nome completo'] || '').trim()
    if (!nome) continue // pula linhas vazias/exemplo sem nome

    try {
      // Evita duplicar aluno já existente (permite rodar o script mais de uma vez)
      const { data: existentes } = await supabase.from('alunos').select('id').ilike('nome', nome)
      if (existentes && existentes.length > 0) {
        console.log(`— Já existe: ${nome} (pulado)`)
        continue
      }

      const { data: aluno, error: erroAluno } = await supabase
        .from('alunos')
        .insert({
          nome,
          telefone: String(linha['Telefone do aluno'] || '').trim() || null,
          nome_responsavel: String(linha['Nome do responsável'] || '').trim() || null,
          telefone_responsavel: String(linha['Telefone do responsável'] || '').trim() || null,
          status: String(linha['Status'] || 'Ativo').trim() || 'Ativo',
          observacao: String(linha['Observação'] || '').trim() || null
        })
        .select()
        .single()

      if (erroAluno) throw erroAluno

      const saldoInicial = Number(linha['Aulas disponíveis agora']) || 0
      const pacoteTexto = String(linha['Pacote atual (texto livre)'] || '').trim()

      if (saldoInicial > 0) {
        const { error: erroMov } = await supabase.from('movimentacoes').insert({
          aluno_id: aluno.id,
          data: new Date().toISOString().slice(0, 10),
          tipo: 'AJUSTE',
          descricao: pacoteTexto ? `Saldo inicial (importação) — ${pacoteTexto}` : 'Saldo inicial (importação)',
          entrada: saldoInicial,
          saida: 0,
          saldo_apos: saldoInicial,
          observacao: 'Importado em lote a partir da planilha antiga'
        })
        if (erroMov) throw erroMov
      }

      console.log(`✓ Importado: ${nome} (saldo inicial: ${saldoInicial})`)
      sucesso++
    } catch (err) {
      console.error(`✗ Erro em "${nome}":`, err.message)
      erros++
    }
  }

  console.log(`\nConcluído. ${sucesso} aluno(s) importado(s), ${erros} erro(s).`)
  process.exit(0)
}

main()

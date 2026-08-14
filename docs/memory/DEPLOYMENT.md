# DEPLOYMENT.md

## Onde o projeto vive

- **Código-fonte:** GitHub, repositório `mendes-surf-house` (conta GitHub do
  administrador). Cópia local em `D:\REPOSITORIO_PESSOAL\mendes-app` (Windows).
- **Hospedagem do app:** Vercel, projeto `mendes-surf-house`, deploy automático a
  cada push na branch `main`.
- **Banco/Auth:** Supabase, projeto `mendes-surf-house`, região São Paulo
  (`sa-east-1`).

## Deploy do app (Vercel)

Automático: push para `main` no GitHub → Vercel builda (`npm run build`, Vite) e
publica. Não há passos manuais de deploy nem pipeline de CI separado.

**Variáveis de ambiente exigidas na Vercel** (Project Settings → Environment
Variables) — mesmos nomes usados localmente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sem essas variáveis configuradas na Vercel, o build sobe mas o app não consegue
falar com o Supabase (tela de login quebrada/erro silencioso no console).

## Ambiente local

```bash
npm install
cp .env.example .env      # preencher com valores reais do Supabase (Project Settings → API)
npm run dev                # http://localhost:5173
```

Build de produção local (pra testar antes de subir):
```bash
npm run build
npm run preview
```

## Domínio

Hoje o app roda no domínio padrão da Vercel (`*.vercel.app`) — nenhum domínio
próprio configurado. Ver `docs/memory/DECISIONS.md` para o raciocínio de custo
(ficar no domínio Vercel mantém o projeto 100% gratuito).

## Banco de dados — deploy de schema

**Não há pipeline de deploy de schema.** Toda alteração estrutural (nova coluna,
nova tabela, nova view, trigger) é feita rodando um script `.sql` manualmente no
SQL Editor do painel do Supabase. Não existe Supabase CLI configurado no projeto,
nem pasta `supabase/migrations`. Ver `docs/memory/DATABASE.md` para o processo
recomendado de alteração.

## Importação em lote (fora do fluxo de deploy)

`scripts/importar-alunos.js` roda localmente (`npm run importar-alunos --
caminho/arquivo.xlsx`), nunca em produção/CI. Depende do mesmo `.env` local e
pede login interativo (e-mail/senha) no terminal.

## Custos (estado no momento desta documentação)

Todo o projeto roda nos planos gratuitos:
- Supabase: Free tier
- Vercel: Free (Hobby)
- GitHub: Free

Sem domínio próprio contratado. Ver `docs/memory/DECISIONS.md`.

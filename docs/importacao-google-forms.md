# Guia: Google Forms + planilha de respostas → importação de alunos

Passo a passo para captar Nome e Telefone dos alunos via Google Forms, revisar
as respostas, e importar para o Mendes Surf House usando o script que já existe
(`scripts/importar-alunos.js`). Nenhuma alteração de código é necessária — só
configuração no Google Forms/Sheets.

## 1. Criar o formulário no Google Forms

Crie um formulário novo com estas perguntas (nomes **exatamente assim**, porque
o título da pergunta vira o cabeçalho da coluna na planilha de respostas, e o
script procura por esses nomes de coluna):

- **Nome completo** — resposta curta, obrigatória.
- **Telefone do aluno** — resposta curta, opcional.

Opcional, mas recomendado (o sistema já suporta e evita retrabalho depois, para
alunos menores de idade sem telefone próprio):

- **Nome do responsável** — resposta curta, opcional.
- **Telefone do responsável** — resposta curta, opcional.

Não peça "Sobrenome" separado — o app guarda o nome como um campo único
(é nele que a checagem de aluno duplicado roda), então um único campo "Nome
completo" evita ter que juntar duas colunas depois.

Não é preciso perguntar quantidade de aulas, status ou pacote — isso fica de
fora do formulário de propósito, porque você vai inserir manualmente depois de
cada aluno já cadastrado (é exatamente o fluxo que você descreveu).

## 2. Ligar o formulário a uma planilha de respostas

No Forms: aba **Respostas** → ícone do Google Sheets (canto superior direito)
→ **Criar planilha**. Isso cria um Google Sheets novo, ligado ao formulário,
que recebe uma linha a cada resposta automaticamente.

## 3. Renomear a aba de respostas para "Alunos"

Por padrão a aba se chama algo como "Respostas ao formulário 1". O script
procura especificamente por uma aba chamada **Alunos** dentro do Excel — então,
clique com o botão direito na aba (embaixo, no Sheets) → **Renomear** → digite
`Alunos`.

Isso não afeta o formulário nem as respostas — é só o nome da aba.

## 4. Revisar as respostas antes de importar

Aqui entra a sua etapa de conferência, antes de "subir" qualquer coisa:

- Abra a planilha sempre que quiser conferir novas respostas.
- Apague linhas problemáticas diretamente na planilha (nome vazio, submissão
  de brincadeira, telefone claramente errado, etc.) — apagar uma linha aqui
  não afeta o formulário, só remove aquela resposta da exportação.
- Fique atento a nomes escritos de forma diferente para a mesma pessoa (ex:
  "João Paiva" vs "joão  paiva silva") — o bloqueio de duplicado do script
  compara nome de forma exata (ignorando maiúsculas e espaços extras), não
  "parecido", então pequenas variações de digitação passam como alunos
  diferentes. Vale corrigir manualmente antes de importar.
- A coluna automática "Carimbo de data/hora" (criada pelo Forms) pode ficar
  onde está — o script ignora colunas que não reconhece.

## 5. Exportar como .xlsx

Na planilha: **Arquivo → Fazer download → Microsoft Excel (.xlsx)**.
Salve o arquivo (ex: `importacao-alunos.xlsx`) em algum lugar fácil de achar.

## 6. Rodar a importação

No terminal, dentro da pasta do projeto:

```
node scripts/importar-alunos.js caminho\para\importacao-alunos.xlsx
```

Vai pedir seu e-mail e senha de admin do app. Alunos que já existem no banco
(mesmo nome) são pulados automaticamente — então é seguro repetir esse
processo toda vez que novas respostas chegarem, sem duplicar quem já foi
importado antes.

Como o formulário não pergunta "aulas disponíveis", todo aluno importado
entra com saldo zero — depois é só usar **Inserir pacote/aula avulsa** no
app, aluno por aluno, pra lançar as aulas de cada um.

## Resumo do fluxo recorrente

1. Alunos preenchem o formulário no grupo.
2. Você abre a planilha de respostas de vez em quando, revisa e limpa.
3. Baixa como `.xlsx`.
4. Roda `node scripts/importar-alunos.js ...`.
5. Entra em cada aluno novo no app e lança as aulas que ele comprou.

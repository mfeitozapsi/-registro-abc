# Registro ABC

Aplicativo web responsivo (prioridade: smartphones) para pais e responsáveis
registrarem situações do cotidiano, em quatro partes: **Antecedente**,
**Comportamento**, **Intervenção** e **Consequência imediata**.

> **Situação atual:** formulário de registro em 5 etapas com ajuda contextual,
> tela de revisão, acesso das famílias por link exclusivo e salvamento real no
> Supabase. Ainda não há histórico, painel do psicólogo nem exportação.

## Tecnologias

- **React 18**: interface organizada em componentes reutilizáveis.
- **Vite 5**: ambiente de desenvolvimento rápido e build simples.
- CSS puro com variáveis (sem frameworks): fácil de ler e alterar.

## Como executar

Requisito: [Node.js](https://nodejs.org) versão 18 ou superior.

```bash
npm install     # instala as dependências (uma vez)
npm run dev     # inicia em http://localhost:5173
```

Para ver no celular durante o desenvolvimento, conecte-o à mesma rede Wi-Fi
e abra o endereço "Network" exibido no terminal.

Outros comandos:

```bash
npm run build     # gera a versão final na pasta dist/
npm run preview   # testa a versão final localmente
```

## Estrutura

```
registro-abc/
├── brand-originals/      PNGs originais da marca (intactos, fora do app)
├── public/favicon.png
├── scripts/verificar-conexao.mjs   teste de conexão com o Supabase
├── tests/                testes unitários (unit/) e de interface (e2e/)
├── .env.example          modelo das variáveis de ambiente
├── supabase/             banco de dados: migrações SQL, testes e instruções (ver supabase/README.md)
├── src/
│   ├── assets/brand/     logotipos redimensionados usados pelo app
│   ├── components/
│   │   ├── brand/        BrandSignature (logotipo)
│   │   ├── help/         HelpButton (botão "?" e janela de ajuda)
│   │   ├── layout/       AppLayout (cabeçalho, conteúdo, rodapé)
│   │   └── ui/           Button, Card, TextInput, TextArea, Modal, ConfirmDialog
│   ├── config/app.js     nome, textos e os 4 componentes do registro
│   ├── features/
│   │   └── registros/    formulário em 5 etapas (RegistroForm, RegistroRevisao, steps.js)
│   ├── pages/Home.jsx    tela inicial
│   ├── services/         conexão com o Supabase (supabaseClient, familiaApi, seguranca)
│   │   (acesso/ dentro de features: leitura do link, validação e tela de acesso)
│   └── styles/           tokens.css (paleta) e base.css
└── index.html
```

## Identidade visual

- A paleta oficial está **somente** em `src/styles/tokens.css`. Os
  componentes usam nomes de função (`--fundo`, `--acao`, `--texto`...), então
  mudar a aparência é mudar um único arquivo.
- Não adicionar outras cores.
- O logotipo aparece apenas na tela inicial, como assinatura discreta
  (`BrandSignature`). Use a versão marrom em fundo claro e a versão clara
  (`tone="dark"`) apenas em fundo escuro. Não recolorir, recortar nem distorcer.

## Banco de dados e conexão com o Supabase

A estrutura do banco está em `supabase/` (ver `supabase/README.md`) e já foi
executada no projeto Supabase. O app usa `src/services/` para conversar com ele.

**Configuração (uma vez):**
1. `cp .env.example .env.local`
2. Preencha `VITE_SUPABASE_URL` (Project Settings > API) e
   `VITE_SUPABASE_PUBLISHABLE_KEY` (a chave **pública**: publishable ou anon).
3. `npm install`

**Nunca** coloque a chave secreta (`sb_secret_...`) ou `service_role` no `.env`:
tudo que começa com `VITE_` fica visível no navegador. O app e o script de teste
recusam chaves secretas.

**Testar a conexão (sem dados de famílias):** `npm run verificar:supabase`.
Resultado esperado: `✓ Conexão OK. O servidor respondeu "link_invalido"...`.
(O teste grava uma tentativa falha inofensiva; para apagá-la, no SQL Editor:
`delete from abc_interno.tentativas_falhas;`)

## Acesso das famílias e salvamento

- Cada família recebe um link no formato `https://SEU-SITE/#/f/<código>`.
  O código fica depois do `#` (não é enviado ao servidor do site), é guardado no
  aparelho para a família voltar ao app e é apagado da barra de endereço.
- Ao abrir o app, o código é validado (`familia_validar_acesso`). Se for inválido,
  revogado ou estiver bloqueado, o formulário não é liberado e uma mensagem
  simples é exibida. Sem link, o app orienta a abrir o link recebido.
- "Salvar registro" grava no Supabase (`familia_criar_registro`). A tela de
  conclusão só aparece depois da confirmação do servidor. Se falhar, os dados
  continuam na tela e é possível tentar de novo. Toques repetidos não duplicam o envio.
- O código de acesso é uma credencial privada: nunca é exibido, registrado em
  console ou incluído em mensagens de erro.
- Atenção: em aparelho **compartilhado**, quem abrir o app nele terá o acesso da
  família. Para encerrar um acesso, o psicólogo revoga/substitui o link.

## Testes

```bash
npm test            # 34 testes unitários (sem rede, sem dependências extras)
npm run test:e2e    # 18 testes de interface em navegador real (Chromium)
```
Os testes de interface precisam de `npm install` e de
`npx playwright install chromium`. Todos usam um Supabase **falso** e códigos
**fictícios**: nenhum dado real e nenhuma chamada ao seu projeto.

## Próximas etapas (não iniciadas)

Telas de registro, histórico, exportação, contas de usuário, separação por
família e banco de dados.

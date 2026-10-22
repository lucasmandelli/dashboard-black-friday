# Radar de Preços: Black Friday

Dashboard para acompanhar o preço de produtos específicos em várias lojas, com histórico.

- **Cadastro** de produtos no próprio dashboard, cada um com um ou vários links de lojas e um preço-alvo opcional.
- **Histórico** coletado a cada 6 horas, com gráfico por loja, mediana de 30 dias e menor preço já visto.
- **Avisos no card** quando o preço fica abaixo do alvo, quando a coleta falha e quando o desconto parece "metade do dobro" (o preço subiu na semana anterior e depois "caiu" para o valor normal).
- **Vários usuários:** cada pessoa entra com o próprio e-mail e vê só a própria lista.

## Como funciona

```
GitHub Actions (a cada 6h)          Supabase (grátis)              GitHub Pages
┌──────────────────────┐   grava   ┌──────────────────────┐  lê   ┌────────────────┐
│ collector/ (Node)    │ ───────▶ │ Postgres + Auth + RLS│ ◀──── │ web/ (Vue 3)   │
│ lê preço das lojas   │           │ products, links,     │       │ dashboard      │
└──────────────────────┘           │ price_snapshots      │       └────────────────┘
                                   └──────────────────────┘
```

- `collector/`: abre a página de cada link e lê o preço nos dados estruturados que as lojas publicam (JSON-LD `schema.org/Product`, ou meta tags/microdata como alternativa). Para o Mercado Livre, tenta antes a API pública.
- `web/`: Vue 3, Vite, Pinia, Tailwind e Chart.js.
- `supabase/migrations/`: tabelas e regras de acesso. Cada usuário só lê e altera os próprios produtos, e só o coletor grava preços.
- `shared/`: o mapa de domínio para nome da loja, usado pelos dois lados.

> **Limitação:** algumas lojas bloqueiam robôs ou só montam o preço via JavaScript. Esses links aparecem com **✕ erro** no dashboard, junto com o motivo.

## Testar localmente (modo demonstração)

Sem nenhuma configuração, o dashboard abre com dados fictícios:

```bash
cd web
npm install
npm run dev
```

Para testar a leitura de preço de um link real, sem gravar nada:

```bash
cd collector
npm install
npm run collect -- --dry-run --url "https://www.kabum.com.br/produto/..."
```

## Colocar no ar

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com). O plano gratuito basta.
2. Abra o **SQL Editor**, cole o conteúdo de `supabase/migrations/001_init.sql` e execute.
3. Em **Authentication → URL Configuration**:
   - **Site URL:** `https://<seu-usuario>.github.io/dashboard-black-friday/`
   - **Redirect URLs:** a mesma URL, mais `http://localhost:5173/` para desenvolvimento.
4. Em **Project Settings → API**, anote a **Project URL**, a chave **anon** e a chave **service_role**.

### 2. GitHub
Em **Settings → Secrets and variables → Actions**:

| Tipo | Nome | Valor |
|---|---|---|
| Secret | `SUPABASE_URL` | Project URL |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (**nunca** coloque no frontend) |
| Variable | `VITE_SUPABASE_URL` | Project URL |
| Variable | `VITE_SUPABASE_ANON_KEY` | chave anon (pode ser pública, porque quem protege os dados é o RLS) |

Depois:
1. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
2. Faça merge na `main`. O workflow **Publicar dashboard** sobe o site.
3. O workflow **Coletar preços** roda sozinho a cada 6 horas. Para buscar preços na hora, depois de cadastrar um produto, vá em **Actions → Coletar preços → Run workflow**.

> O GitHub Pages é gratuito para repositórios **públicos**. Em repositório privado, ele exige um plano pago do GitHub. Os dados de cada usuário ficam no Supabase, não no repositório, então tornar o repositório público não expõe as listas.

### 3. Abrir para outras pessoas
Basta mandar o link do site. Cada pessoa entra com o próprio e-mail (link mágico, sem senha) e cadastra os próprios produtos. Para restringir quem pode entrar, desative **Authentication → Providers → Email → Allow new users to sign up** e convide as pessoas em **Authentication → Users → Invite**.

## Desenvolvimento

```bash
cd collector && npm test      # extratores de preço e normalização "R$ 1.234,56"
cd web && npm test            # cálculos do dashboard (mediana, alvo, desconto suspeito)
cd web && npm run build       # checagem de tipos + build
```

Para rodar o frontend contra o Supabase real, copie `web/.env.example` para `web/.env.local` e preencha.

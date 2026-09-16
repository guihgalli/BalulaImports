# Painel Admin — Cloudflare Access

O painel fica em `/admin` e a API em `/api/admin/*`.

## O que da para fazer

- Definir capa manual de fabricante (tenis ou futebol)
- Mover produto para outro fabricante
- Trocar capa de produto
- Ocultar produto do catalogo publico (nao apaga do Yupoo)
- Restaurar produto ou capa automatica

As alteracoes ficam em KV (`catalog:admin-overrides:v1`) e sao aplicadas sobre o catalogo sincronizado.

## Autenticacao

### Producao (recomendado): Cloudflare Access

#### Opcao A — Dashboard (tela que voce esta vendo)

1. **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Tipo: **Self-hosted and private**
3. Clique em **Public DNS** (hostname publico — e o caso do `workers.dev`)
4. **Continue with Self-hosted and private**
5. Preencha:
   - **Application name:** `Balula Admin UI`
   - **Session Duration:** 24 hours
   - **Application domain:** `balula.importsv1.workers.dev`
   - **Path:** `/admin*`
6. **Next** → crie policy **Allow**:
   - **Include** → **Emails** → `guilherme.galli@live.com` (ou seu e-mail)
7. Salve
8. Repita para a API (segunda aplicacao):
   - Nome: `Balula Admin API`
   - Mesmo dominio
   - **Path:** `/api/admin*`

#### Opcao B — Script (API)

1. Crie token em **My Profile** → **API Tokens** → **Create Token**
2. Template: **Edit Cloudflare Zero Trust** (ou custom com `Account > Zero Trust > Edit`)
3. Execute:

```powershell
$env:CLOUDFLARE_API_TOKEN = "seu-token"
.\scripts\setup-cloudflare-access.ps1 -AdminEmail "guilherme.galli@live.com"
```

#### Atalho (nao recomendado para este projeto)

Em **Workers & Pages** → **balula** → **Settings** → **Domains & Routes** → **Enable Cloudflare Access** protege **todo** o site, nao so `/admin`. Use apenas se quiser bloquear a loja inteira.

Quando voce acessa `/admin` pelo navegador, o Cloudflare valida identidade e injeta headers no Worker:

- `CF-Access-Authenticated-User-Email`
- `Cf-Access-Jwt-Assertion`

A API admin aceita esses headers automaticamente — nao precisa colar token no painel.

### Desenvolvimento local

Use o mesmo `SYNC_SECRET` do `.dev.vars`:

```
SYNC_SECRET=troque-por-um-segredo-forte
```

No painel `/admin`, cole o valor na tela de login. Em chamadas diretas (Postman/curl):

```bash
curl -H "Authorization: Bearer SEU_SYNC_SECRET" \
  https://balula.importsv1.workers.dev/api/admin/state
```

## Deploy do secret

```bash
npx wrangler secret put SYNC_SECRET
```

## Endpoints

| Metodo | Rota | Acao |
|--------|------|------|
| GET | `/api/admin/me` | Status de autenticacao |
| GET | `/api/admin/state` | Estado completo para o painel |
| PATCH | `/api/admin/categories/{tenis\|futebol}/{id}/cover` | `{ "coverImage": "url" }` |
| DELETE | `/api/admin/categories/{tenis\|futebol}/{id}/cover` | Remove capa custom |
| PATCH | `/api/admin/products/{id}` | `{ "categoryName", "coverImage", "hidden" }` |
| DELETE | `/api/admin/products/{id}` | Oculta produto |
| POST | `/api/admin/products/{id}/restore` | Remove todas edicoes do produto |

## Notas

- Ocultar produto nao remove do Yupoo; no proximo sync ele continua no KV bruto, mas fica fora do catalogo publico.
- Mover fabricante cria override de `categoryName`; categorias sao recalculadas na exibicao.
- Proteja `/api/admin` no Access para que APIs nao fiquem abertas com apenas o SYNC_SECRET em producao.

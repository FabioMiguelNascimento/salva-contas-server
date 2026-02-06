# 🚀 Guia Rápido: Instalação do Sistema de Anexos

## Passo 1: Executar Migration no Backend

```bash
cd salva-contas-server

# Executar a migration
npx prisma migrate dev --name add_attachments

# Gerar o Prisma Client atualizado
npx prisma generate
```

## Passo 2: Criar Pasta de Uploads (ou configurar R2)

Se for usar armazenamento local:

```bash
# Criar pasta para armazenar os arquivos
mkdir uploads

# Adicionar ao .gitignore (se ainda não estiver)
echo "uploads/" >> .gitignore
```

Se pretende usar Cloudflare R2 (recomendado para produção), configure as variáveis de ambiente conforme o `.env.attachments.example` com `STORAGE_TYPE=r2` e as credenciais `R2_*`.

## Passo 3: Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env` no backend:

```env
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
STORAGE_TYPE=local
```

## Passo 4: Reiniciar o Servidor

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
pnpm dev
```

## Passo 5: Testar a Funcionalidade

### Via API (com cURL ou Postman)

```bash
# Upload de arquivo
curl -X POST http://localhost:3001/attachments/upload \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@caminho/para/arquivo.pdf" \
  -F "transactionId=UUID_DA_TRANSACAO" \
  -F "description=Boleto de março"

# Listar anexos
curl -X GET "http://localhost:3001/attachments?transactionId=UUID_DA_TRANSACAO" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Via Interface (Frontend)

1. Adicione o componente em qualquer página de transação:

```tsx
import { AttachmentsManager } from "@/components/attachments/attachments-manager";

<AttachmentsManager transactionId={transactionId} />
```

2. Navegue até a transação
3. Clique em "Adicionar Anexo"
4. Selecione um arquivo (PDF ou imagem)
5. Adicione uma descrição opcional
6. Clique em "Enviar"

## ✅ Checklist de Verificação

- [ ] Migration executada com sucesso
- [ ] Prisma Client gerado
- [ ] Pasta `uploads` criada
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Módulo AttachmentsModule importado no AppModule
- [ ] Endpoint `/attachments/upload` acessível
- [ ] Arquivos estáticos sendo servidos em `/uploads`

## 🐛 Troubleshooting

### Erro: "Cannot find module 'generated/prisma/client'"

**Solução**: Execute `npx prisma generate`

### Erro: "ENOENT: no such file or directory, open 'uploads/...'"

**Solução**: Crie a pasta `mkdir uploads`

### Erro: "File size exceeds limit"

**Solução**: Aumente o valor de `MAX_FILE_SIZE` no `.env`

### Arquivos não estão sendo servidos

**Solução**: Verifique se o `app.useStaticAssets` está configurado no `main.ts`

### Erro de CORS ao fazer upload

**Solução**: Verifique as configurações de CORS no `main.ts`

## 📚 Próximos Passos

1. **Integrar em páginas existentes**: Adicione o `AttachmentsManager` em páginas de transações e assinaturas
2. **Customizar UI**: Ajuste o componente conforme o design do seu projeto
3. **Configurar S3** (opcional): Para produção, considere usar AWS S3 ou outro serviço de armazenamento
4. **Adicionar validações**: Implemente regras de negócio específicas (ex: limite de arquivos por transação)

## 💡 Dicas

- Use o hook `useAttachments` para lógica customizada
- Consulte os exemplos em `components/attachments/examples.tsx`
- Leia a documentação completa em `docs/ATTACHMENTS.md`
- Para produção, configure armazenamento em nuvem (S3, Cloudinary, etc.)

## 🆘 Precisa de Ajuda?

Consulte a documentação completa ou entre em contato com a equipe de desenvolvimento.

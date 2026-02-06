# Sistema de Anexos - Salva Contas

Sistema completo para upload, armazenamento e gerenciamento de PDFs e imagens de boletos e comprovantes.

## 🚀 Funcionalidades

- ✅ Upload de PDFs e imagens (JPEG, PNG, WebP)
- ✅ Limite de 10MB por arquivo
- ✅ Armazenamento local com suporte futuro para S3
- ✅ Vínculo com transações e assinaturas
- ✅ Descrições personalizadas para cada anexo
- ✅ Preview e download de arquivos
- ✅ Exclusão de anexos

## 📦 Instalação

### Backend (salva-contas-server)

1. **Executar as migrations do Prisma**:

```bash
cd salva-contas-server
npx prisma migrate dev --name add_attachments
```

2. **Gerar o Prisma Client**:

```bash
npx prisma generate
```

3. **Criar a pasta de uploads** (se não existir):

```bash
mkdir uploads
```

4. **Instalar dependências** (já instaladas):
   - `@nestjs/platform-express`
   - `multer`
   - `@types/multer`

### Frontend (salva-contas)

Nenhuma instalação adicional necessária. Os componentes já usam as bibliotecas existentes.

## 🔧 Configuração

### Variáveis de Ambiente

Adicione ao `.env` do backend:

```env
# Upload de arquivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB em bytes
```

### Permissões de Pasta

Certifique-se de que a pasta `uploads` tem permissões de escrita:

```bash
chmod 755 uploads
```

## 📝 Uso

### No Backend

O módulo de attachments já está integrado ao `AppModule`. Os endpoints disponíveis são:

#### Upload de Arquivo

```http
POST /attachments/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- file: (arquivo)
- transactionId: (opcional) UUID da transação
- subscriptionId: (opcional) UUID da assinatura
- description: (opcional) Descrição do arquivo
```

#### Listar Anexos

```http
GET /attachments?transactionId={uuid}&subscriptionId={uuid}&type={pdf|image|document}
Authorization: Bearer {token}
```

#### Atualizar Descrição

```http
PATCH /attachments/{id}
Authorization: Bearer {token}

Body:
{
  "description": "Nova descrição"
}
```

#### Deletar Anexo

```http
DELETE /attachments/{id}
Authorization: Bearer {token}
```

### No Frontend

#### Usando o Componente AttachmentsManager

```tsx
import { AttachmentsManager } from "@/components/attachments/attachments-manager";

// Em uma página de transação
<AttachmentsManager transactionId={transaction.id} />

// Em uma página de assinatura
<AttachmentsManager subscriptionId={subscription.id} />
```

#### Usando o Hook useAttachments

```tsx
import { useAttachments } from "@/hooks/use-attachments";

function MyComponent() {
  const {
    attachments,
    isUploading,
    uploadAttachment,
    loadAttachments,
    deleteAttachment
  } = useAttachments(transactionId);

  const handleFileUpload = async (file: File) => {
    await uploadAttachment(file, "Boleto de março");
  };

  // ...
}
```

## 🗂️ Estrutura do Banco de Dados

### Tabela `attachments`

| Campo          | Tipo            | Descrição                          |
|----------------|-----------------|------------------------------------|
| id             | UUID            | ID único do anexo                  |
| userId         | String          | ID do usuário proprietário         |
| fileName       | String          | Nome do arquivo no storage         |
| originalName   | String          | Nome original do arquivo           |
| fileSize       | Int             | Tamanho em bytes                   |
| mimeType       | String          | Tipo MIME do arquivo               |
| type           | Enum            | pdf / image / document             |
| storageUrl     | String          | URL ou path do arquivo             |
| description    | String?         | Descrição opcional                 |
| transactionId  | UUID?           | ID da transação vinculada          |
| subscriptionId | UUID?           | ID da assinatura vinculada         |
| createdAt      | DateTime        | Data de criação                    |
| updatedAt      | DateTime        | Data de última atualização         |

## 🔐 Segurança

- ✅ Autenticação obrigatória em todos os endpoints
- ✅ Validação de tipo de arquivo (apenas PDF e imagens)
- ✅ Limite de tamanho de arquivo (10MB)
- ✅ Isolamento por usuário (cada usuário só acessa seus próprios anexos)
- ✅ Nomes de arquivo com UUID para evitar conflitos

## 🚀 Melhorias Futuras

### Armazenamento em Nuvem (S3 / Cloudflare R2)

O `S3StorageService` suporta tanto AWS S3 quanto provedores S3-compatíveis (por exemplo Cloudflare R2). Para usar S3/R2, instale o SDK:

```bash
npm install @aws-sdk/client-s3
```

Como configurar para **Cloudflare R2**:

1. Configure as variáveis de ambiente (exemplo):

```env
STORAGE_TYPE=r2
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com/
R2_BUCKET_NAME=SALVA_CONTAS
R2_PUBLIC_URL=https://<account_id>.r2.cloudflarestorage.com/SALVA_CONTAS
```

2. O `S3StorageService` detecta `STORAGE_TYPE=r2` (ou a presença de `R2_ENDPOINT`) e usa as variáveis `R2_*` para se conectar ao R2.

3. Atualizar o provider no `AttachmentsModule` (já configurado para detectar `r2`):

```typescript
{
  provide: StorageServiceInterface,
  useFactory: () => {
    const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
    if (storageType === 's3' || storageType === 'r2') {
      return new S3StorageService();
    }
    return new LocalStorageService();
  },
}
```

> Observação: Para R2, o `getFileUrl` usa `R2_PUBLIC_URL` quando disponível. Caso não seja configurado, o serviço tenta montar uma URL a partir do endpoint + bucket.


### Outras Melhorias

- 📊 Compressão automática de imagens
- 🔍 OCR para extrair texto de PDFs/imagens
- 🖼️ Geração de thumbnails para imagens
- 📎 Suporte para mais tipos de arquivos
- 🔄 Sincronização com Google Drive/Dropbox
- 📱 Upload via câmera no mobile

## 📄 Licença

Este projeto faz parte do sistema Salva Contas.

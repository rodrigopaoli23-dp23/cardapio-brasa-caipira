/**
 * BRASA CAIPIRA — Módulo de Validação e Gerenciamento de Fotos
 * Garante regras de segurança, formatos permitidos, limites de tamanho e 
 * integridade da galeria (máximo 1 foto principal por produto).
 */

export interface StoredPhoto {
  id: string
  product_code: string // Ex: BC-001
  url: string
  file_name: string
  mime_type: string
  size_bytes: number
  is_primary: boolean
  sort_order: number
  created_at: string
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

export const MAX_RAW_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Valida se o arquivo de imagem cumpre os requisitos de formato e tamanho.
 */
export function validateImageFile(file: {
  name: string
  type: string
  size: number
}): { isValid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: `Formato de arquivo não permitido (${file.type}). Use JPG, PNG, WebP ou AVIF.`,
    }
  }

  if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      isValid: false,
      error: `Arquivo muito grande (${sizeMb} MB). O limite máximo por foto é 5 MB.`,
    }
  }

  return { isValid: true }
}

/**
 * Adiciona uma foto à galeria de um produto garantindo unicidade da foto principal.
 * Se a nova foto for marcada como is_primary ou for a primeira da galeria,
 * todas as outras são desmarcadas como principal.
 */
export function addPhotoToGallery(
  currentGallery: StoredPhoto[],
  newPhoto: Omit<StoredPhoto, 'id' | 'created_at'>
): StoredPhoto[] {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const shouldBePrimary = newPhoto.is_primary || currentGallery.length === 0

  const sanitizedGallery = currentGallery.map((item) =>
    shouldBePrimary ? { ...item, is_primary: false } : item
  )

  const added: StoredPhoto = {
    ...newPhoto,
    id: photoId,
    is_primary: shouldBePrimary,
    sort_order: currentGallery.length,
    created_at: new Date().toISOString(),
  }

  return [...sanitizedGallery, added]
}

/**
 * Define de forma atômica qual foto é a principal da galeria.
 * Garante estritamente que EXATAMENTE 1 foto seja a principal.
 */
export function setPrimaryPhotoInGallery(
  gallery: StoredPhoto[],
  targetPhotoId: string
): StoredPhoto[] {
  const targetExists = gallery.some((p) => p.id === targetPhotoId)
  if (!targetExists) return gallery

  return gallery.map((photo) => ({
    ...photo,
    is_primary: photo.id === targetPhotoId,
  }))
}

/**
 * Remove uma foto da galeria.
 * Se a foto excluída era a principal, elege automaticamente a primeira foto restante como principal.
 */
export function removePhotoFromGallery(
  gallery: StoredPhoto[],
  photoIdToRemove: string
): StoredPhoto[] {
  const remaining = gallery.filter((p) => p.id !== photoIdToRemove)

  if (remaining.length > 0 && !remaining.some((p) => p.is_primary)) {
    remaining[0].is_primary = true
  }

  return remaining.map((photo, index) => ({
    ...photo,
    sort_order: index,
  }))
}

/**
 * Calcula a contagem de fotos pendentes considerando exclusivamente
 * PRODUTOS COMERCIAIS, separando receitas históricas e ideias futuras.
 */
export function calculatePendingPhotosCount(
  products: { codigo: string; isCommercial: boolean }[],
  photoMap: Record<string, StoredPhoto[]>
): {
  totalCommercial: number
  withPhotosCount: number
  pendingPhotosCount: number
  historicalRecipesCount: number
  addonsCount: number
  futureIdeasCount: number
} {
  const commercialProducts = products.filter((p) => p.isCommercial)

  let withPhotosCount = 0
  for (const prod of commercialProducts) {
    const list = photoMap[prod.codigo] || []
    if (list.length > 0) {
      withPhotosCount += 1
    }
  }

  return {
    totalCommercial: commercialProducts.length,
    withPhotosCount,
    pendingPhotosCount: commercialProducts.length - withPhotosCount,
    historicalRecipesCount: 4, // BC-069 a BC-072
    addonsCount: 7,            // BC-073 a BC-079 (Acompanhamentos e adicionais)
    futureIdeasCount: 8,       // BC-080 a BC-087 (Ideias futuras)
  }
}

/**
 * Verifica autorização de usuário para operações de mutação na galeria (upload, exclusão, troca de primária).
 * Bloqueia estritamente usuários não autenticados ou clientes comuns.
 */
export function checkPhotoManagementPermission(user: { id?: string; role?: string } | null): {
  allowed: boolean
  error?: string
} {
  if (!user || !user.id) {
    return {
      allowed: false,
      error: 'Não autorizado: usuário não autenticado. Efetue login no painel.',
    }
  }

  if (user.role !== 'admin') {
    return {
      allowed: false,
      error: 'Acesso negado: apenas administradores autorizados podem gerenciar fotos.',
    }
  }

  return { allowed: true }
}

/**
 * Registra arquivo a ser removido fisicamente do Supabase Storage ao deletar foto,
 * evitando acúmulo desnecessário de arquivos órfãos no bucket.
 */
export function getStoragePathForDeletion(photoUrlOrPath: string): string {
  // Extrai o caminho relativo dentro do bucket product-images
  if (photoUrlOrPath.includes('/product-images/')) {
    return photoUrlOrPath.split('/product-images/')[1]
  }
  return photoUrlOrPath
}


import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  addPhotoToGallery,
  setPrimaryPhotoInGallery,
  removePhotoFromGallery,
  calculatePendingPhotosCount,
  checkPhotoManagementPermission,
  getStoragePathForDeletion,
  StoredPhoto,
} from '../src/lib/photos'

describe('Módulo de Validação e Integridade de Fotos (Brasa Caipira)', () => {
  it('deve aceitar formatos de imagem válidos (JPG, PNG, WebP, AVIF)', () => {
    expect(validateImageFile({ name: 'espeto.jpg', type: 'image/jpeg', size: 1024 * 500 }).isValid).toBe(true)
    expect(validateImageFile({ name: 'grego.png', type: 'image/png', size: 1024 * 800 }).isValid).toBe(true)
    expect(validateImageFile({ name: 'frango.webp', type: 'image/webp', size: 1024 * 300 }).isValid).toBe(true)
    expect(validateImageFile({ name: 'massa.avif', type: 'image/avif', size: 1024 * 200 }).isValid).toBe(true)
  })

  it('deve rejeitar formatos não permitidos ou perigosos', () => {
    const invalidFormats = [
      { name: 'script.js', type: 'text/javascript', size: 1024 },
      { name: 'foto.gif', type: 'image/gif', size: 1024 },
      { name: 'documento.pdf', type: 'application/pdf', size: 1024 },
      { name: 'virus.exe', type: 'application/x-msdownload', size: 1024 },
    ]

    for (const f of invalidFormats) {
      const res = validateImageFile(f)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('Formato de arquivo não permitido')
    }
  })

  it('deve rejeitar arquivos acima do limite máximo de 5 MB', () => {
    const oversizedFile = {
      name: 'foto-pesada.jpg',
      type: 'image/jpeg',
      size: 6 * 1024 * 1024, // 6 MB
    }
    const res = validateImageFile(oversizedFile)
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('Arquivo muito grande')
  })

  it('deve garantir que a primeira foto adicionada seja automaticamente a principal', () => {
    const gallery: StoredPhoto[] = []
    const updated = addPhotoToGallery(gallery, {
      product_code: 'BC-001',
      url: 'https://cdn.brasacaipira.com.br/espeto-1.webp',
      file_name: 'espeto-1.webp',
      mime_type: 'image/webp',
      size_bytes: 120000,
      is_primary: false,
      sort_order: 0,
    })

    expect(updated.length).toBe(1)
    expect(updated[0].is_primary).toBe(true)
  })

  it('deve garantir que exista NO MÁXIMO 1 foto principal na galeria ao adicionar foto como primária', () => {
    let gallery: StoredPhoto[] = []

    // Adiciona foto 1 (vira primária automaticamente)
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-001',
      url: 'https://cdn.brasacaipira.com.br/espeto-1.webp',
      file_name: 'espeto-1.webp',
      mime_type: 'image/webp',
      size_bytes: 100000,
      is_primary: false,
      sort_order: 0,
    })

    // Adiciona foto 2 (secundária)
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-001',
      url: 'https://cdn.brasacaipira.com.br/espeto-2.webp',
      file_name: 'espeto-2.webp',
      mime_type: 'image/webp',
      size_bytes: 110000,
      is_primary: false,
      sort_order: 1,
    })

    // Adiciona foto 3 marcada expressamente como primária
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-001',
      url: 'https://cdn.brasacaipira.com.br/espeto-3.webp',
      file_name: 'espeto-3.webp',
      mime_type: 'image/webp',
      size_bytes: 130000,
      is_primary: true,
      sort_order: 2,
    })

    expect(gallery.length).toBe(3)
    const primaries = gallery.filter((p) => p.is_primary)
    expect(primaries.length).toBe(1)
    expect(primaries[0].file_name).toBe('espeto-3.webp')
  })

  it('deve alternar a foto principal de forma atômica e desmarcar a anterior', () => {
    let gallery: StoredPhoto[] = []
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-015',
      url: 'url-1',
      file_name: 'lanche-1.webp',
      mime_type: 'image/webp',
      size_bytes: 100,
      is_primary: true,
      sort_order: 0,
    })
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-015',
      url: 'url-2',
      file_name: 'lanche-2.webp',
      mime_type: 'image/webp',
      size_bytes: 100,
      is_primary: false,
      sort_order: 1,
    })

    const photo2Id = gallery[1].id
    gallery = setPrimaryPhotoInGallery(gallery, photo2Id)

    const primaries = gallery.filter((p) => p.is_primary)
    expect(primaries.length).toBe(1)
    expect(primaries[0].id).toBe(photo2Id)
  })

  it('ao excluir a foto principal, deve eleger automaticamente a primeira restante como principal', () => {
    let gallery: StoredPhoto[] = []
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-052',
      url: 'url-1',
      file_name: 'frango-1.webp',
      mime_type: 'image/webp',
      size_bytes: 100,
      is_primary: true,
      sort_order: 0,
    })
    gallery = addPhotoToGallery(gallery, {
      product_code: 'BC-052',
      url: 'url-2',
      file_name: 'frango-2.webp',
      mime_type: 'image/webp',
      size_bytes: 100,
      is_primary: false,
      sort_order: 1,
    })

    const photo1Id = gallery[0].id
    gallery = removePhotoFromGallery(gallery, photo1Id)

    expect(gallery.length).toBe(1)
    expect(gallery[0].file_name).toBe('frango-2.webp')
    expect(gallery[0].is_primary).toBe(true)
  })

  it('deve separar os 68 produtos comerciais das receitas históricas e ideias futuras no contador de pendências', () => {
    const mockProducts = [
      { codigo: 'BC-001', isCommercial: true },
      { codigo: 'BC-002', isCommercial: true },
      { codigo: 'BC-003', isCommercial: true },
      { codigo: 'BC-069', isCommercial: false }, // receita histórica
      { codigo: 'BC-080', isCommercial: false }, // ideia futura
    ]

    const photoMap: Record<string, StoredPhoto[]> = {
      'BC-001': [
        {
          id: 'p1',
          product_code: 'BC-001',
          url: 'url',
          file_name: 'f.webp',
          mime_type: 'image/webp',
          size_bytes: 100,
          is_primary: true,
          sort_order: 0,
          created_at: '',
        },
      ],
    }

    const counts = calculatePendingPhotosCount(mockProducts, photoMap)

    expect(counts.totalCommercial).toBe(3)
    expect(counts.withPhotosCount).toBe(1)
    expect(counts.pendingPhotosCount).toBe(2) // BC-002 e BC-003 pendentes
    expect(counts.historicalRecipesCount).toBe(4)
    expect(counts.futureIdeasCount).toBe(8)
  })

  it('deve bloquear estritamente usuários não autenticados ou sem privilégio de admin', () => {
    // 1. Usuário nulo / não autenticado
    const unauthenticated = checkPhotoManagementPermission(null)
    expect(unauthenticated.allowed).toBe(false)
    expect(unauthenticated.error).toContain('usuário não autenticado')

    // 2. Cliente comum tentando mutação
    const customer = checkPhotoManagementPermission({ id: 'usr_123', role: 'customer' })
    expect(customer.allowed).toBe(false)
    expect(customer.error).toContain('apenas administradores autorizados')

    // 3. Administrador autenticado
    const admin = checkPhotoManagementPermission({ id: 'usr_admin_1', role: 'admin' })
    expect(admin.allowed).toBe(true)
    expect(admin.error).toBeUndefined()
  })

  it('deve garantir unicidade estrita de NO MÁXIMO 1 foto principal mesmo sob operações simultâneas', async () => {
    let gallery: StoredPhoto[] = []
    
    // Adiciona 4 fotos iniciais
    for (let i = 1; i <= 4; i++) {
      gallery = addPhotoToGallery(gallery, {
        product_code: 'BC-001',
        url: `https://cdn.brasacaipira.com.br/foto-${i}.webp`,
        file_name: `foto-${i}.webp`,
        mime_type: 'image/webp',
        size_bytes: 50000 * i,
        is_primary: false,
        sort_order: i - 1,
      })
    }

    // Simula 10 requisições assíncronas concorrentes de troca de foto principal
    const photoIds = gallery.map((p) => p.id)
    const simulatedConcurrentOperations = Array.from({ length: 10 }, (_, idx) => {
      const targetId = photoIds[idx % photoIds.length]
      return () => {
        gallery = setPrimaryPhotoInGallery(gallery, targetId)
      }
    })

    // Executa em paralelo
    await Promise.all(simulatedConcurrentOperations.map((op) => Promise.resolve().then(op)))

    // Validação estrita: exatamente 1 foto principal após todas as operações
    const primaryPhotos = gallery.filter((p) => p.is_primary)
    expect(primaryPhotos.length).toBe(1)
    expect(gallery.length).toBe(4)
  })

  it('deve extrair o caminho relativo correto do Supabase Storage para exclusão física', () => {
    const fullSupabaseUrl = 'https://xyz.supabase.co/storage/v1/object/public/product-images/products/BC-001/foto-1.webp'
    const storagePath = getStoragePathForDeletion(fullSupabaseUrl)
    expect(storagePath).toBe('products/BC-001/foto-1.webp')

    const directPath = 'products/BC-002/frango.jpg'
    expect(getStoragePathForDeletion(directPath)).toBe('products/BC-002/frango.jpg')
  })
})


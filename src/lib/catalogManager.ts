/**
 * BRASA CAIPIRA — Gerenciador de Catálogo de Produtos e Categorias (Fase 3)
 * Persistência local sincronizada, geração de códigos BC-XXX, CRUD de produtos
 * com proteção de histórico de pedidos e CRUD de categorias com organização de Porções.
 */

import { INITIAL_PRODUCTS } from '@/data/initialCatalog'
import { pushToCloud } from '@/lib/cloudSync'
import {
  CatalogItemStatus,
  CategoryRecord,
  ExtendedProduct,
} from '@/types/phase3.types'

export const CATALOG_STORAGE_KEY = 'brasa_caipira_catalog_v1'
export const CATEGORIES_STORAGE_KEY = 'brasa_caipira_categories_v1'
export const ORDERS_STORAGE_KEY = 'brasa_caipira_orders_v1'

/**
 * Converte um nome de categoria em um ID slug estável.
 */
function slugifyCategoryId(name: string): string {
  return (
    'cat-' +
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  )
}

/**
 * Retorna os produtos iniciais enriquecidos com os campos da Fase 3 (ExtendedProduct).
 */
export function getInitialExtendedProducts(): ExtendedProduct[] {
  return INITIAL_PRODUCTS.map((item, idx) => ({
    ...item,
    status: item.isCommercial
      ? item.observacoes?.includes('ESGOTADO')
        ? 'paused'
        : 'published'
      : 'unp_draft',
    variantes: [],
    adicionaisDisponiveis: [],
    diasAtivos: [],
    horarioInicio: '',
    horarioFim: '',
    ordemExibicao: idx + 1,
  }))
}

/**
 * Analisa todos os códigos BC-XXX existentes e gera o próximo código único
 * com formatação de 3 dígitos (ex: BC-088 após BC-087).
 */
export function generateNextProductCode(products: ExtendedProduct[]): string {
  let maxNumber = 0

  for (const prod of products) {
    const match = prod.codigo?.trim().match(/^BC-(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num
      }
    }
  }

  let nextNumber = maxNumber + 1
  let candidate = `BC-${String(nextNumber).padStart(3, '0')}`

  while (!isProductCodeUnique(products, candidate)) {
    nextNumber += 1
    candidate = `BC-${String(nextNumber).padStart(3, '0')}`
  }

  return candidate
}

/**
 * Valida se um código BC-XXX é único na lista de produtos.
 * Permite ignorar o código original durante a edição de um produto existente.
 */
export function isProductCodeUnique(
  products: ExtendedProduct[],
  code: string,
  ignoreCode?: string
): boolean {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) return false

  const normalizedIgnore = ignoreCode?.trim().toUpperCase()

  return !products.some((p) => {
    const currentCode = p.codigo.trim().toUpperCase()
    if (normalizedIgnore && currentCode === normalizedIgnore) {
      return false
    }
    return currentCode === normalizedCode
  })
}

/**
 * Cria um novo produto no catálogo validando código único e campos obrigatórios.
 */
export function createProduct(
  products: ExtendedProduct[],
  newProductData: Partial<ExtendedProduct> & { produto: string; categoria: string }
): {
  success: boolean
  products: ExtendedProduct[]
  product?: ExtendedProduct
  error?: string
} {
  const nomeTrimmed = newProductData.produto?.trim()
  const categoriaTrimmed = newProductData.categoria?.trim()

  if (!nomeTrimmed) {
    return {
      success: false,
      products,
      error: 'O nome do produto é obrigatório.',
    }
  }

  if (!categoriaTrimmed) {
    return {
      success: false,
      products,
      error: 'A categoria do produto é obrigatória.',
    }
  }

  const desiredCode = newProductData.codigo?.trim().toUpperCase()
    ? newProductData.codigo.trim().toUpperCase()
    : generateNextProductCode(products)

  if (!/^BC-\d{3,}$/i.test(desiredCode)) {
    return {
      success: false,
      products,
      error: 'O código deve seguir o padrão BC-XXX (ex: BC-088).',
    }
  }

  if (!isProductCodeUnique(products, desiredCode)) {
    return {
      success: false,
      products,
      error: `O código ${desiredCode} já está cadastrado em outro produto.`,
    }
  }

  const status: CatalogItemStatus = newProductData.status ?? 'published'
  const classification = newProductData.classification ?? 'commercial'
  const isCommercial =
    newProductData.isCommercial !== undefined
      ? newProductData.isCommercial
      : classification === 'commercial' && status !== 'archived'

  const createdProduct: ExtendedProduct = {
    codigo: desiredCode,
    categoria: categoriaTrimmed,
    produto: nomeTrimmed,
    descricao: newProductData.descricao?.trim() || null,
    ingredientes: newProductData.ingredientes?.trim() || null,
    unidade: newProductData.unidade?.trim() || 'unidade',
    preco:
      newProductData.preco !== undefined && newProductData.preco !== null && !isNaN(Number(newProductData.preco))
        ? Number(newProductData.preco)
        : null,
    dia_periodo: newProductData.dia_periodo?.trim() || null,
    evidencia: newProductData.evidencia?.trim() || 'Cadastrado via Painel Admin',
    observacoes: newProductData.observacoes?.trim() || null,
    isCommercial,
    classification,
    status,
    variantes: newProductData.variantes ? [...newProductData.variantes] : [],
    adicionaisDisponiveis: newProductData.adicionaisDisponiveis
      ? [...newProductData.adicionaisDisponiveis]
      : [],
    diasAtivos: newProductData.diasAtivos ? [...newProductData.diasAtivos] : [],
    horarioInicio: newProductData.horarioInicio?.trim() || '',
    horarioFim: newProductData.horarioFim?.trim() || '',
    ordemExibicao: newProductData.ordemExibicao ?? products.length + 1,
  }

  return {
    success: true,
    products: [...products, createdProduct],
    product: createdProduct,
  }
}

/**
 * Atualiza um produto existente pelo seu código original.
 */
export function updateProduct(
  products: ExtendedProduct[],
  originalCode: string,
  updatedData: Partial<ExtendedProduct>
): {
  success: boolean
  products: ExtendedProduct[]
  product?: ExtendedProduct
  error?: string
} {
  const normalizedOriginal = originalCode.trim().toUpperCase()
  const targetIndex = products.findIndex(
    (p) => p.codigo.trim().toUpperCase() === normalizedOriginal
  )

  if (targetIndex === -1) {
    return {
      success: false,
      products,
      error: `Produto ${originalCode} não encontrado.`,
    }
  }

  const currentProduct = products[targetIndex]
  const nextCode = updatedData.codigo
    ? updatedData.codigo.trim().toUpperCase()
    : currentProduct.codigo

  if (!/^BC-\d{3,}$/i.test(nextCode)) {
    return {
      success: false,
      products,
      error: 'O código deve seguir o padrão BC-XXX (ex: BC-088).',
    }
  }

  if (!isProductCodeUnique(products, nextCode, currentProduct.codigo)) {
    return {
      success: false,
      products,
      error: `O código ${nextCode} já pertence a outro produto.`,
    }
  }

  if (updatedData.produto !== undefined && !updatedData.produto.trim()) {
    return {
      success: false,
      products,
      error: 'O nome do produto não pode ficar vazio.',
    }
  }

  const nextStatus = updatedData.status ?? currentProduct.status ?? 'published'
  let nextObservacoes =
    updatedData.observacoes !== undefined
      ? updatedData.observacoes
      : currentProduct.observacoes

  // Sincroniza flag textual legada [ESGOTADO HOJE] com o status pausado/publicado
  if (updatedData.status === 'paused') {
    if (!nextObservacoes?.includes('ESGOTADO')) {
      nextObservacoes = `${nextObservacoes || ''} [ESGOTADO HOJE]`.trim()
    }
  } else if (updatedData.status === 'published' && nextObservacoes?.includes('[ESGOTADO HOJE]')) {
    nextObservacoes = nextObservacoes.replace('[ESGOTADO HOJE]', '').trim() || null
  }

  const updatedProduct: ExtendedProduct = {
    ...currentProduct,
    ...updatedData,
    codigo: nextCode,
    produto:
      updatedData.produto !== undefined
        ? updatedData.produto.trim()
        : currentProduct.produto,
    categoria:
      updatedData.categoria !== undefined
        ? updatedData.categoria.trim()
        : currentProduct.categoria,
    status: nextStatus,
    observacoes: nextObservacoes,
  }

  const nextProducts = [...products]
  nextProducts[targetIndex] = updatedProduct

  return {
    success: true,
    products: nextProducts,
    product: updatedProduct,
  }
}

/**
 * Altera rapidamente o status operacional de um produto:
 * 'published' | 'unp_draft' | 'paused' | 'archived'
 */
export function setProductStatus(
  products: ExtendedProduct[],
  code: string,
  status: CatalogItemStatus
): ExtendedProduct[] {
  const normalizedCode = code.trim().toUpperCase()

  return products.map((p) => {
    if (p.codigo.trim().toUpperCase() !== normalizedCode) {
      return p
    }

    let nextObs = p.observacoes || ''
    if (status === 'paused') {
      if (!nextObs.includes('ESGOTADO')) {
        nextObs = `${nextObs} [ESGOTADO HOJE]`.trim()
      }
    } else if (status === 'published') {
      nextObs = nextObs.replace('[ESGOTADO HOJE]', '').trim()
    }

    return {
      ...p,
      status,
      isCommercial: status === 'archived' ? false : p.classification === 'commercial' ? true : p.isCommercial,
      observacoes: nextObs || null,
    }
  })
}

/**
 * Extrai todos os códigos de produtos presentes no histórico local de pedidos.
 */
export function getExistingOrderProductCodesFromStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return []
    const orders = JSON.parse(raw) as { itens?: { codigo?: string }[] }[]
    const codes = new Set<string>()
    for (const order of orders) {
      for (const item of order.itens || []) {
        if (item.codigo) {
          codes.add(item.codigo.trim().toUpperCase())
        }
      }
    }
    return Array.from(codes)
  } catch {
    return []
  }
}

/**
 * Exclui um produto com segurança:
 * Impede a exclusão definitiva caso o código conste em pedidos históricos
 * (sugerindo arquivamento), e remove apenas se não houver vínculo.
 */
export function deleteProductSafely(
  products: ExtendedProduct[],
  code: string,
  existingOrderProductCodes: string[] = []
): {
  success: boolean
  blockedByHistory: boolean
  suggestedAction?: 'archive'
  error?: string
  products: ExtendedProduct[]
} {
  const normalizedCode = code.trim().toUpperCase()
  const existsInCatalog = products.some(
    (p) => p.codigo.trim().toUpperCase() === normalizedCode
  )

  if (!existsInCatalog) {
    return {
      success: false,
      blockedByHistory: false,
      error: `Produto ${code} não encontrado no catálogo.`,
      products,
    }
  }

  const hasOrderHistory = existingOrderProductCodes.some(
    (orderCode) => orderCode.trim().toUpperCase() === normalizedCode
  )

  if (hasOrderHistory) {
    return {
      success: false,
      blockedByHistory: true,
      suggestedAction: 'archive',
      error: `O produto ${normalizedCode} possui histórico em pedidos registrados e não pode ser excluído definitivamente. Recomendamos arquivá-lo.`,
      products,
    }
  }

  const remainingProducts = products.filter(
    (p) => p.codigo.trim().toUpperCase() !== normalizedCode
  )

  return {
    success: true,
    blockedByHistory: false,
    products: remainingProducts,
  }
}

/**
 * Descrições padrão para categorias do Brasa Caipira.
 */
const DEFAULT_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Espetinhos: 'Espetinhos tradicionais assados na brasa de quarta a sábado.',
  'Espetinhos especiais': 'Montagens especiais na brasa com acompanhamentos cremosos.',
  'X-Espeto': 'Lanches no pão baguete recheados com espetinho na brasa.',
  Porções:
    'Porções comerciais: Batata frita, Amendoim, Picles, Espeto de picles com ovo de codorna, salsicha e azeitona, Salames e Tábuas de frios.',
  'Porções quentes': 'Porções quentes fritas na hora.',
  'Porções frias': 'Petiscos, conservas, salames e tábuas de frios.',
  Salgados: 'Empadas artesanais com diversos recheios.',
  Doces: 'Sobremesas artesanais da casa.',
  Bebidas: 'Refrigerantes lata, 1L, 2L e águas.',
  'Bebidas alcoólicas': 'Cervejas em garrafa 600ml e latas geladas.',
  Assados: 'Assados especiais de domingo (Frango assado, Combo Família).',
  Massas: 'Massas artesanais (Talharim, Lasanha e Conchiglione).',
  Pizzas: 'Pizzas médias pré-assadas estilo padaria.',
  'Churrasco Grego — Sábado': 'Tradição de sábado com Fraldinha Extra Grill e bacon Pamplona.',
  'Churrasco Grego — Quinta': 'Quinta do Grego com receita especial da semana.',
  'Grego — receitas históricas': 'Acervo interno de receitas históricas do Churrasco Grego.',
  'Acompanhamentos e adicionais': 'Itens complementares e adicionais de pratos.',
  'Ideias futuras — não publicar': 'Banco de ideias em avaliação (oculto do público).',
}

const NON_PUBLIC_CATEGORIES = new Set([
  'Grego — receitas históricas',
  'Acompanhamentos e adicionais',
  'Ideias futuras — não publicar',
])

/**
 * Extrai as categorias iniciais a partir da lista de produtos e garante a presença
 * da categoria comercial "Porções".
 */
export function getInitialCategories(
  products: ExtendedProduct[] = INITIAL_PRODUCTS
): CategoryRecord[] {
  const seenNames = new Set<string>()
  const orderedNames: string[] = []

  for (const prod of products) {
    const catName = prod.categoria?.trim()
    if (!catName) continue

    // Insere "Porções" imediatamente antes da primeira categoria de porções encontrada
    if (
      (catName === 'Porções quentes' || catName === 'Porções frias') &&
      !seenNames.has('Porções')
    ) {
      seenNames.add('Porções')
      orderedNames.push('Porções')
    }

    if (!seenNames.has(catName)) {
      seenNames.add(catName)
      orderedNames.push(catName)
    }
  }

  if (!seenNames.has('Porções')) {
    orderedNames.push('Porções')
    seenNames.add('Porções')
  }

  return orderedNames.map((nome, idx) => {
    const isInternal = NON_PUBLIC_CATEGORIES.has(nome)
    const isFutureIdea = nome === 'Ideias futuras — não publicar'

    return {
      id: slugifyCategoryId(nome),
      nome,
      descricao:
        DEFAULT_CATEGORY_DESCRIPTIONS[nome] ||
        `Categoria ${nome} do cardápio Brasa Caipira.`,
      ordem: idx + 1,
      visivel: !isInternal,
      arquivada: isFutureIdea,
    }
  })
}

/**
 * Cria uma nova categoria garantindo nome único e ordem sequencial.
 */
export function createCategory(
  categories: CategoryRecord[],
  data: { nome: string; descricao?: string; visivel?: boolean }
): {
  success: boolean
  categories: CategoryRecord[]
  category?: CategoryRecord
  error?: string
} {
  const nomeTrimmed = data.nome?.trim()
  if (!nomeTrimmed) {
    return {
      success: false,
      categories,
      error: 'O nome da categoria é obrigatório.',
    }
  }

  const alreadyExists = categories.some(
    (c) => c.nome.trim().toLowerCase() === nomeTrimmed.toLowerCase()
  )

  if (alreadyExists) {
    return {
      success: false,
      categories,
      error: `A categoria "${nomeTrimmed}" já existe.`,
    }
  }

  const maxOrder = categories.reduce(
    (max, c) => (c.ordem > max ? c.ordem : max),
    0
  )

  let candidateId = slugifyCategoryId(nomeTrimmed)
  if (categories.some((c) => c.id === candidateId)) {
    candidateId = `${candidateId}-${Date.now()}`
  }

  const newCategory: CategoryRecord = {
    id: candidateId,
    nome: nomeTrimmed,
    descricao:
      data.descricao?.trim() || `Categoria ${nomeTrimmed} do Brasa Caipira.`,
    ordem: maxOrder + 1,
    visivel: data.visivel ?? true,
    arquivada: false,
  }

  return {
    success: true,
    categories: [...categories, newCategory],
    category: newCategory,
  }
}

/**
 * Atualiza dados de uma categoria (nome, descrição, visibilidade, arquivamento).
 * Se a lista de produtos for informada e o nome mudar, atualiza o vínculo nos produtos.
 */
export function updateCategory(
  categories: CategoryRecord[],
  id: string,
  data: Partial<Omit<CategoryRecord, 'id'>>,
  products?: ExtendedProduct[]
): {
  success: boolean
  categories: CategoryRecord[]
  category?: CategoryRecord
  products?: ExtendedProduct[]
  error?: string
} {
  const targetIndex = categories.findIndex((c) => c.id === id)
  if (targetIndex === -1) {
    return {
      success: false,
      categories,
      products,
      error: 'Categoria não encontrada.',
    }
  }

  const currentCat = categories[targetIndex]
  const nextName =
    data.nome !== undefined ? data.nome.trim() : currentCat.nome

  if (!nextName) {
    return {
      success: false,
      categories,
      products,
      error: 'O nome da categoria não pode ser vazio.',
    }
  }

  const duplicateName = categories.some(
    (c, idx) =>
      idx !== targetIndex &&
      c.nome.trim().toLowerCase() === nextName.toLowerCase()
  )

  if (duplicateName) {
    return {
      success: false,
      categories,
      products,
      error: `Já existe outra categoria chamada "${nextName}".`,
    }
  }

  const updatedCategory: CategoryRecord = {
    ...currentCat,
    ...data,
    nome: nextName,
    descricao:
      data.descricao !== undefined
        ? data.descricao.trim()
        : currentCat.descricao,
  }

  const nextCategories = [...categories]
  nextCategories[targetIndex] = updatedCategory

  let nextProducts = products
  if (products && nextName !== currentCat.nome) {
    nextProducts = products.map((p) =>
      p.categoria === currentCat.nome ? { ...p, categoria: nextName } : p
    )
  }

  return {
    success: true,
    categories: nextCategories,
    category: updatedCategory,
    products: nextProducts,
  }
}

/**
 * Reordena uma categoria para cima ('up') ou para baixo ('down')
 * mantendo a numeração de `ordem` contínua (1..N).
 */
export function reorderCategory(
  categories: CategoryRecord[],
  id: string,
  direction: 'up' | 'down'
): CategoryRecord[] {
  const sorted = [...categories].sort((a, b) => a.ordem - b.ordem)
  const index = sorted.findIndex((c) => c.id === id)

  if (index === -1) return sorted

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return sorted
  }

  const temp = sorted[index]
  sorted[index] = sorted[swapIndex]
  sorted[swapIndex] = temp

  return sorted.map((cat, idx) => ({
    ...cat,
    ordem: idx + 1,
  }))
}

/**
 * Exclui uma categoria somente se ela NÃO possuir produtos vinculados.
 * Bloqueia a exclusão caso existam produtos associados.
 */
export function deleteCategorySafely(
  categories: CategoryRecord[],
  categoryName: string,
  products: ExtendedProduct[]
): {
  success: boolean
  blockedByProducts: boolean
  linkedProductsCount: number
  error?: string
  categories: CategoryRecord[]
} {
  const normalizedTarget = categoryName.trim().toLowerCase()

  const targetCat = categories.find(
    (c) =>
      c.nome.trim().toLowerCase() === normalizedTarget ||
      c.id.toLowerCase() === normalizedTarget
  )

  if (!targetCat) {
    return {
      success: false,
      blockedByProducts: false,
      linkedProductsCount: 0,
      error: `Categoria "${categoryName}" não encontrada.`,
      categories,
    }
  }

  const linkedProducts = products.filter(
    (p) => p.categoria.trim().toLowerCase() === targetCat.nome.trim().toLowerCase()
  )

  if (linkedProducts.length > 0) {
    return {
      success: false,
      blockedByProducts: true,
      linkedProductsCount: linkedProducts.length,
      error: `Não é possível excluir a categoria "${targetCat.nome}" pois existem ${linkedProducts.length} produto(s) vinculado(s) a ela. Reclassifique os produtos ou arquive a categoria.`,
      categories,
    }
  }

  const remaining = categories
    .filter((c) => c.id !== targetCat.id)
    .sort((a, b) => a.ordem - b.ordem)
    .map((c, idx) => ({ ...c, ordem: idx + 1 }))

  return {
    success: true,
    blockedByProducts: false,
    linkedProductsCount: 0,
    categories: remaining,
  }
}

/**
 * Organiza e consolida a categoria comercial "Porções":
 * - Garante a existência da categoria "Porções" ativa e visível;
 * - Reclassifica itens de "Porções quentes" e "Porções frias" (como Batata frita BC-042,
 *   Amendoim BC-044, Tábua de frios BC-045, Salames BC-046..049, Azeitonas BC-050, Cebolinha BC-051)
 *   para "Porções" SEM duplicar registros;
 * - Garante que os itens comerciais solicitados ("Picles" e
 *   "Espeto de picles com ovo de codorna, salsicha e azeitona") estejam presentes em "Porções"
 *   sem duplicação caso a função seja executada múltiplas vezes.
 */
export function organizePorcoesCategory(
  products: ExtendedProduct[],
  categories: CategoryRecord[]
): {
  products: ExtendedProduct[]
  categories: CategoryRecord[]
  unifiedCount: number
  addedCount: number
} {
  let nextCategories = [...categories]

  // 1. Garantir que a categoria "Porções" exista e esteja visível/ativa
  const porcoesIndex = nextCategories.findIndex(
    (c) => c.nome.trim().toLowerCase() === 'porções'
  )

  if (porcoesIndex === -1) {
    const created = createCategory(nextCategories, {
      nome: 'Porções',
      descricao: DEFAULT_CATEGORY_DESCRIPTIONS['Porções'],
      visivel: true,
    })
    nextCategories = created.categories
  } else {
    nextCategories[porcoesIndex] = {
      ...nextCategories[porcoesIndex],
      visivel: true,
      arquivada: false,
      descricao:
        nextCategories[porcoesIndex].descricao ||
        DEFAULT_CATEGORY_DESCRIPTIONS['Porções'],
    }
  }

  // 2. Reclassificar produtos de "Porções quentes" e "Porções frias" para "Porções" sem duplicar códigos
  const seenCodes = new Set<string>()
  let unifiedCount = 0
  const nextProducts: ExtendedProduct[] = []

  for (const prod of products) {
    const normalizedCode = prod.codigo.trim().toUpperCase()
    if (seenCodes.has(normalizedCode)) {
      continue // Previne qualquer duplicidade preexistente de código
    }
    seenCodes.add(normalizedCode)

    if (
      prod.categoria === 'Porções quentes' ||
      prod.categoria === 'Porções frias'
    ) {
      unifiedCount += 1
      nextProducts.push({
        ...prod,
        categoria: 'Porções',
      })
    } else {
      nextProducts.push({ ...prod })
    }
  }

  // 3. Garantir itens específicos de Porções sem duplicar se já existirem
  const requiredPorcoesItems: Array<{
    produto: string
    matchPattern: RegExp
    descricao: string
    ingredientes: string
    unidade: string
  }> = [
    {
      produto: 'Picles em conserva',
      matchPattern: /^picles(\s+em\s+conserva)?$/i,
      descricao: 'Porção fria de picles crocante em conserva',
      ingredientes: 'Pepino em conserva e especiarias',
      unidade: 'porção',
    },
    {
      produto: 'Espeto de picles com ovo de codorna, salsicha e azeitona',
      matchPattern: /espeto\s+de\s+picles.*codorna/i,
      descricao: 'Petisco frio montado no espeto com picles, ovo de codorna, salsicha e azeitona',
      ingredientes: 'Picles; ovo de codorna; salsicha; azeitona',
      unidade: 'espeto / porção',
    },
  ]

  let addedCount = 0
  for (const reqItem of requiredPorcoesItems) {
    const existingIndex = nextProducts.findIndex((p) =>
      reqItem.matchPattern.test(p.produto.trim())
    )

    if (existingIndex !== -1) {
      // Se já existe em outra categoria, garante que esteja em "Porções" sem duplicar
      if (nextProducts[existingIndex].categoria !== 'Porções') {
        nextProducts[existingIndex] = {
          ...nextProducts[existingIndex],
          categoria: 'Porções',
        }
        unifiedCount += 1
      }
    } else {
      const newCode = generateNextProductCode(nextProducts)
      const created: ExtendedProduct = {
        codigo: newCode,
        categoria: 'Porções',
        produto: reqItem.produto,
        descricao: reqItem.descricao,
        ingredientes: reqItem.ingredientes,
        unidade: reqItem.unidade,
        preco: null,
        dia_periodo: 'Quarta a sábado',
        evidencia: 'Organização da categoria Porções',
        observacoes: null,
        isCommercial: true,
        classification: 'commercial',
        status: 'published',
        variantes: [],
        adicionaisDisponiveis: [],
        diasAtivos: [],
        horarioInicio: '',
        horarioFim: '',
        ordemExibicao: nextProducts.length + 1,
      }
      nextProducts.push(created)
      seenCodes.add(newCode)
      addedCount += 1
    }
  }

  // 4. Ocultar/arquivar categorias antigas "Porções quentes" e "Porções frias" se ficaram vazias
  nextCategories = nextCategories.map((cat) => {
    if (cat.nome === 'Porções quentes' || cat.nome === 'Porções frias') {
      const stillHasProducts = nextProducts.some((p) => p.categoria === cat.nome)
      if (!stillHasProducts) {
        return {
          ...cat,
          visivel: false,
          arquivada: true,
        }
      }
    }
    return cat
  })

  return {
    products: nextProducts,
    categories: nextCategories,
    unifiedCount,
    addedCount,
  }
}

/**
 * Helpers de persistência em localStorage para produtos e categorias.
 */
export function loadCatalogFromStorage(): ExtendedProduct[] {
  if (typeof window === 'undefined') {
    return getInitialExtendedProducts()
  }
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY)
    if (!raw) return getInitialExtendedProducts()
    const parsed = JSON.parse(raw) as ExtendedProduct[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getInitialExtendedProducts()
    }
    return parsed
  } catch {
    return getInitialExtendedProducts()
  }
}

export function saveCatalogToStorage(products: ExtendedProduct[]): void {
  if (typeof window === 'undefined') return
  pushToCloud(CATALOG_STORAGE_KEY, products, { immediate: true })
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products))
  } catch {
    // Falha silenciosa caso storage esteja indisponível
  }
}

export function loadCategoriesFromStorage(
  products: ExtendedProduct[] = INITIAL_PRODUCTS
): CategoryRecord[] {
  if (typeof window === 'undefined') {
    return getInitialCategories(products)
  }
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) return getInitialCategories(products)
    const parsed = JSON.parse(raw) as CategoryRecord[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getInitialCategories(products)
    }
    return parsed
  } catch {
    return getInitialCategories(products)
  }
}

export function saveCategoriesToStorage(categories: CategoryRecord[]): void {
  if (typeof window === 'undefined') return
  pushToCloud(CATEGORIES_STORAGE_KEY, categories, { immediate: true })
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // Falha silenciosa caso storage esteja indisponível
  }
}

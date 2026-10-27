import { describe, it, expect } from 'vitest'
import { INITIAL_PRODUCTS } from '@/data/initialCatalog'
import {
  generateNextProductCode,
  isProductCodeUnique,
  createProduct,
  updateProduct,
  setProductStatus,
  deleteProductSafely,
  getInitialCategories,
  createCategory,
  updateCategory,
  reorderCategory,
  deleteCategorySafely,
  organizePorcoesCategory,
  getInitialExtendedProducts,
} from '@/lib/catalogManager'

describe('Fase 3 — Agente 1: Gestão de Produtos e Categorias (Brasa Caipira)', () => {
  describe('1. Código BC-XXX e Validação de Unicidade', () => {
    it('deve gerar automaticamente BC-088 após o último item inicial BC-087', () => {
      const initial = getInitialExtendedProducts()
      expect(initial[initial.length - 1].codigo).toBe('BC-087')

      const nextCode = generateNextProductCode(initial)
      expect(nextCode).toBe('BC-088')
    })

    it('deve validar unicidade de código BC-XXX e permitir o próprio código ao editar', () => {
      const initial = getInitialExtendedProducts()

      expect(isProductCodeUnique(initial, 'BC-001')).toBe(false)
      expect(isProductCodeUnique(initial, 'bc-042')).toBe(false)
      expect(isProductCodeUnique(initial, 'BC-088')).toBe(true)

      // Ao editar o próprio BC-001, ignorar 'BC-001' deve retornar true
      expect(isProductCodeUnique(initial, 'BC-001', 'BC-001')).toBe(true)
    })
  })

  describe('2. CRUD Completo de Produtos e Proteção de Histórico de Pedidos', () => {
    it('deve criar novo produto com código automático, variações e adicionais', () => {
      const initial = getInitialExtendedProducts()

      const res = createProduct(initial, {
        produto: 'Espetinho de Cupim Especial',
        categoria: 'Espetinhos',
        unidade: 'espeto',
        preco: 14.5,
        descricao: 'Cupim macio assado na brasa',
        ingredientes: 'Cupim bovino; sal grosso',
        status: 'published',
        variantes: [{ id: 'v1', nome: 'No prato com mandioca', preco: 22.0 }],
        adicionaisDisponiveis: [
          { codigo: 'BC-075', nome: 'Farofa especial', preco: 4.0 },
        ],
      })

      expect(res.success).toBe(true)
      expect(res.product?.codigo).toBe('BC-088')
      expect(res.product?.preco).toBe(14.5)
      expect(res.product?.variantes).toHaveLength(1)
      expect(res.product?.adicionaisDisponiveis).toHaveLength(1)
      expect(res.products).toHaveLength(initial.length + 1)
    })

    it('deve impedir criação de produto com código BC-XXX duplicado', () => {
      const initial = getInitialExtendedProducts()

      const res = createProduct(initial, {
        codigo: 'BC-001',
        produto: 'Produto Duplicado',
        categoria: 'Espetinhos',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('BC-001')
      expect(res.products).toHaveLength(initial.length)
    })

    it('deve editar produto existente, pausar e arquivar corretamente', () => {
      const initial = getInitialExtendedProducts()

      const edited = updateProduct(initial, 'BC-001', {
        produto: 'Espetinho Bovino Tradicional',
        preco: 11.0,
        horarioInicio: '18:00',
        horarioFim: '23:00',
      })

      expect(edited.success).toBe(true)
      expect(edited.product?.produto).toBe('Espetinho Bovino Tradicional')
      expect(edited.product?.preco).toBe(11.0)

      // Pausar produto
      const pausedList = setProductStatus(edited.products, 'BC-001', 'paused')
      const pausedItem = pausedList.find((p) => p.codigo === 'BC-001')
      expect(pausedItem?.status).toBe('paused')
      expect(pausedItem?.observacoes).toContain('[ESGOTADO HOJE]')

      // Arquivar produto
      const archivedList = setProductStatus(pausedList, 'BC-001', 'archived')
      const archivedItem = archivedList.find((p) => p.codigo === 'BC-001')
      expect(archivedItem?.status).toBe('archived')
      expect(archivedItem?.isCommercial).toBe(false)
    })

    it('deve bloquear exclusão definitiva se o produto estiver em pedidos históricos e excluir se não houver vínculo', () => {
      const initial = getInitialExtendedProducts()

      // Tentativa de excluir BC-001 que consta em pedidos históricos
      const blocked = deleteProductSafely(initial, 'BC-001', ['BC-001', 'BC-013'])
      expect(blocked.success).toBe(false)
      expect(blocked.blockedByHistory).toBe(true)
      expect(blocked.suggestedAction).toBe('archive')
      expect(blocked.products).toHaveLength(initial.length)

      // Exclusão permitida quando não há vínculo em pedidos
      const allowed = deleteProductSafely(initial, 'BC-087', ['BC-001', 'BC-013'])
      expect(allowed.success).toBe(true)
      expect(allowed.blockedByHistory).toBe(false)
      expect(allowed.products).toHaveLength(initial.length - 1)
      expect(allowed.products.some((p) => p.codigo === 'BC-087')).toBe(false)
    })
  })

  describe('3. CRUD de Categorias, Ordenação e Bloqueio de Exclusão', () => {
    it('deve criar categoria, reordenar e atualizar visibilidade', () => {
      const categories = getInitialCategories(INITIAL_PRODUCTS)
      expect(categories.some((c) => c.nome === 'Porções')).toBe(true)

      const created = createCategory(categories, {
        nome: 'Combos de Inverno',
        descricao: 'Promoções especiais de inverno',
        visivel: true,
      })

      expect(created.success).toBe(true)
      expect(created.category?.nome).toBe('Combos de Inverno')

      const newId = created.category!.id
      const movedUp = reorderCategory(created.categories, newId, 'up')
      const movedItem = movedUp.find((c) => c.id === newId)
      expect(movedItem!.ordem).toBe(created.categories.length - 1)

      const toggled = updateCategory(movedUp, newId, { visivel: false })
      expect(toggled.success).toBe(true)
      expect(toggled.category?.visivel).toBe(false)
    })

    it('deve bloquear exclusão de categoria com produtos associados e permitir excluir categoria vazia', () => {
      const products = getInitialExtendedProducts()
      const categories = getInitialCategories(products)

      // Tentar excluir "Espetinhos" que possui produtos vinculados
      const blocked = deleteCategorySafely(categories, 'Espetinhos', products)
      expect(blocked.success).toBe(false)
      expect(blocked.blockedByProducts).toBe(true)
      expect(blocked.linkedProductsCount).toBeGreaterThan(0)

      // Criar categoria vazia e excluí-la com sucesso
      const created = createCategory(categories, { nome: 'Categoria Temporária Vazia' })
      const deleted = deleteCategorySafely(
        created.categories,
        'Categoria Temporária Vazia',
        products
      )
      expect(deleted.success).toBe(true)
      expect(deleted.blockedByProducts).toBe(false)
      expect(
        deleted.categories.some((c) => c.nome === 'Categoria Temporária Vazia')
      ).toBe(false)
    })
  })

  describe('4. Organização da Categoria Comercial "Porções" sem Duplicação', () => {
    it('deve consolidar Batata frita (BC-042), Amendoim, Picles, Espeto de picles com ovo de codorna, salsicha e azeitona, Salames e Tábua de frios sem duplicar códigos', () => {
      const initialProducts = getInitialExtendedProducts()
      const initialCategories = getInitialCategories(initialProducts)

      const firstRun = organizePorcoesCategory(initialProducts, initialCategories)

      const porcoesProducts = firstRun.products.filter(
        (p) => p.categoria === 'Porções'
      )

      // Verifica presença dos itens essenciais na categoria Porções
      expect(porcoesProducts.some((p) => p.codigo === 'BC-042')).toBe(true) // Batata frita 350 g
      expect(porcoesProducts.some((p) => p.codigo === 'BC-044')).toBe(true) // Amendoim 100 g
      expect(porcoesProducts.some((p) => p.codigo === 'BC-045')).toBe(true) // Tábua de frios
      expect(porcoesProducts.some((p) => p.codigo === 'BC-046')).toBe(true) // Salame 150 g
      expect(
        porcoesProducts.some((p) => /picles/i.test(p.produto))
      ).toBe(true)
      expect(
        porcoesProducts.some((p) =>
          /espeto\s+de\s+picles.*codorna/i.test(p.produto)
        )
      ).toBe(true)

      // Verifica que nenhum código BC-XXX foi duplicado no catálogo inteiro
      const allCodes = firstRun.products.map((p) => p.codigo)
      const uniqueCodes = new Set(allCodes)
      expect(uniqueCodes.size).toBe(allCodes.length)

      // Executa uma segunda vez (idempotência) e comprova que não duplica registros
      const secondRun = organizePorcoesCategory(
        firstRun.products,
        firstRun.categories
      )
      expect(secondRun.products.length).toBe(firstRun.products.length)
      expect(secondRun.addedCount).toBe(0)
    })
  })
})

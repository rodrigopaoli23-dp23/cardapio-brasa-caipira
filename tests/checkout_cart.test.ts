import { describe, it, expect } from 'vitest'
import {
  addItemToCart,
  buildStructuredWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  canProductBePurchased,
  createCartItemSnapshot,
  createOrderIdempotent,
  removeCartItem,
  updateCartItemQuantity,
  validateAndCalculateOrderTotals,
  validateCustomerCheckoutData,
} from '@/lib/checkoutAndCart'
import { ExtendedProduct } from '@/types/phase3.types'

const SAMPLE_CATALOG: ExtendedProduct[] = [
  {
    codigo: 'BC-001',
    categoria: 'Espetinhos',
    produto: 'Espetinho bovino',
    descricao: 'Espetinho na brasa',
    ingredientes: 'Carne bovina',
    unidade: 'espeto',
    preco: 12.0,
    dia_periodo: 'Quarta a sábado',
    evidencia: 'Confirmado',
    observacoes: null,
    isCommercial: true,
    classification: 'commercial',
    status: 'published',
    variantes: [
      { id: 'v1', nome: 'Ao ponto', preco: 12.0 },
      { id: 'v2', nome: 'Com queijo gratinado', preco: 15.0 },
    ],
  },
  {
    codigo: 'BC-002',
    categoria: 'Espetinhos',
    produto: 'Espetinho sem preço definido',
    descricao: 'Aguardando preço',
    ingredientes: 'Linguiça',
    unidade: 'espeto',
    preco: null,
    dia_periodo: 'Quarta a sábado',
    evidencia: 'Histórico',
    observacoes: null,
    isCommercial: true,
    classification: 'commercial',
    status: 'published',
  },
  {
    codigo: 'BC-003',
    categoria: 'Espetinhos',
    produto: 'Espetinho com preço zero',
    descricao: 'Preço inválido',
    ingredientes: 'Coração',
    unidade: 'espeto',
    preco: 0,
    dia_periodo: 'Quarta a sábado',
    evidencia: 'Histórico',
    observacoes: null,
    isCommercial: true,
    classification: 'commercial',
    status: 'published',
  },
  {
    codigo: 'BC-016',
    categoria: 'Salgados',
    produto: 'Empada de frango',
    descricao: 'Empada individual',
    ingredientes: 'Frango',
    unidade: 'unidade',
    preco: 8.0,
    dia_periodo: 'Quarta a sábado',
    evidencia: 'Histórico confirmado',
    observacoes: null,
    isCommercial: true,
    classification: 'commercial',
    status: 'published',
  },
  {
    codigo: 'BC-073',
    categoria: 'Acompanhamentos e adicionais',
    produto: 'Arroz caipira',
    descricao: 'Porção adicional',
    ingredientes: 'Arroz caipira',
    unidade: 'porção',
    preco: 10.0,
    dia_periodo: null,
    evidencia: 'Confirmado',
    observacoes: null,
    isCommercial: false,
    classification: 'addon',
    status: 'published',
  },
  {
    codigo: 'BC-078',
    categoria: 'Acompanhamentos e adicionais',
    produto: 'Molho especial',
    descricao: 'Adicional da casa',
    ingredientes: 'Molho',
    unidade: 'porção',
    preco: 3.5,
    dia_periodo: null,
    evidencia: 'Confirmado',
    observacoes: null,
    isCommercial: false,
    classification: 'addon',
    status: 'published',
  },
]

describe('Agente 4 — Carrinho, Modalidades e Checkout', () => {
  describe('1. Bloqueio estrito de produtos sem preço aprovado ou indisponíveis', () => {
    it('bloqueia produto com preco: null ou preco <= 0', () => {
      const prodNull = SAMPLE_CATALOG.find((p) => p.codigo === 'BC-002')!
      const prodZero = SAMPLE_CATALOG.find((p) => p.codigo === 'BC-003')!
      const prodNeg: ExtendedProduct = { ...prodZero, preco: -5 }

      expect(canProductBePurchased(prodNull)).toBe(false)
      expect(canProductBePurchased(prodZero)).toBe(false)
      expect(canProductBePurchased(prodNeg)).toBe(false)
      expect(createCartItemSnapshot({ product: prodNull, quantidade: 1 })).toBeNull()
      expect(createCartItemSnapshot({ product: prodZero, quantidade: 1 })).toBeNull()
    })

    it('bloqueia produto esgotado ou com status paused, archived ou unp_draft', () => {
      const validProd = SAMPLE_CATALOG[0]

      expect(canProductBePurchased(validProd)).toBe(true)
      expect(
        canProductBePurchased({
          ...validProd,
          observacoes: 'Item [ESGOTADO HOJE]',
        })
      ).toBe(false)
      expect(canProductBePurchased({ ...validProd, status: 'paused' })).toBe(false)
      expect(canProductBePurchased({ ...validProd, status: 'archived' })).toBe(false)
      expect(canProductBePurchased({ ...validProd, status: 'unp_draft' })).toBe(false)
    })

    it('gerencia itens do carrinho com variantes, múltiplos adicionais e quantidades', () => {
      const prod = SAMPLE_CATALOG[0]
      const snap = createCartItemSnapshot({
        product: prod,
        quantidade: 2,
        varianteNome: 'Com queijo gratinado', // R$ 15,00 = 1500 cents
        adicionais: [
          { codigo: 'BC-073', nome: 'Arroz caipira', precoCents: 1000 },
          { codigo: 'BC-078', nome: 'Molho especial', precoCents: 350 },
        ],
        observacao: 'Sem cebola',
      })

      expect(snap).not.toBeNull()
      expect(snap!.precoUnitarioCents).toBe(1500)
      // (1500 + 1000 + 350) * 2 = 5700 cents
      expect(snap!.subtotalItemCents).toBe(5700)

      let cart = addItemToCart([], snap!)
      expect(cart).toHaveLength(1)

      // Incrementar quantidade
      cart = updateCartItemQuantity(cart, snap!.id, 1)
      expect(cart[0].quantidade).toBe(3)
      expect(cart[0].subtotalItemCents).toBe(8550)

      // Remover item
      cart = removeCartItem(cart, snap!.id)
      expect(cart).toHaveLength(0)
    })
  })

  describe('2. Rejeição e correção de preço adulterado pelo navegador (validateAndCalculateOrderTotals)', () => {
    it('detecta e corrige preços unitários e de adicionais manipulados pelo navegador', () => {
      // Cliente tenta pagar R$ 0,01 (1 centavo) no Espetinho de R$ 12,00 (1200 centavos)
      // e R$ 0,00 no adicional de Arroz Caipira de R$ 10,00 (1000 centavos)
      const tamperedItems = [
        {
          codigo: 'BC-001',
          quantidade: 2,
          precoUnitarioCents: 1, // Adulterado! Oficial é 1200
          subtotalItemCents: 2, // Adulterado!
          adicionais: [
            {
              codigo: 'BC-073',
              nome: 'Arroz caipira',
              precoCents: 0, // Adulterado! Oficial é 1000
            },
          ],
        },
      ]

      // Modo de correção + sinalização
      const calcResult = validateAndCalculateOrderTotals(
        tamperedItems,
        SAMPLE_CATALOG,
        'delivery',
        500
      )

      expect(calcResult.priceTampered).toBe(true)
      expect(calcResult.tamperDetails.length).toBeGreaterThan(0)
      // Recalculado com os valores oficiais: (1200 + 1000) * 2 = 4400 centavos
      expect(calcResult.items[0].precoUnitarioCents).toBe(1200)
      expect(calcResult.items[0].adicionais[0].precoCents).toBe(1000)
      expect(calcResult.subtotalCents).toBe(4400)
      expect(calcResult.taxaEntregaCents).toBe(500)
      expect(calcResult.totalCents).toBe(4900)

      // Modo estrito de rejeição (usado na rota de API)
      const strictResult = validateAndCalculateOrderTotals(
        tamperedItems,
        SAMPLE_CATALOG,
        {
          modalidade: 'delivery',
          taxaEntregaCents: 500,
          rejectOnPriceTamper: true,
        }
      )
      expect(strictResult.valid).toBe(false)
      expect(strictResult.priceTampered).toBe(true)
    })

    it('rejeita pedido contendo produto com preco: null', () => {
      const invalidItems = [
        {
          codigo: 'BC-002', // preco: null
          quantidade: 1,
        },
      ]

      const res = validateAndCalculateOrderTotals(
        invalidItems,
        SAMPLE_CATALOG,
        'retirada',
        0
      )
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('BC-002'))).toBe(true)
    })

    it('aplica taxa de entrega exclusivamente na modalidade delivery', () => {
      const items = [{ codigo: 'BC-016', quantidade: 2 }] // 2x R$ 8,00 = 1600 cents

      const deliveryTotals = validateAndCalculateOrderTotals(
        items,
        SAMPLE_CATALOG,
        'delivery',
        600
      )
      expect(deliveryTotals.subtotalCents).toBe(1600)
      expect(deliveryTotals.taxaEntregaCents).toBe(600)
      expect(deliveryTotals.totalCents).toBe(2200)

      const mesaTotals = validateAndCalculateOrderTotals(
        items,
        SAMPLE_CATALOG,
        'mesa',
        600
      )
      expect(mesaTotals.taxaEntregaCents).toBe(0)
      expect(mesaTotals.totalCents).toBe(1600)

      const retiradaTotals = validateAndCalculateOrderTotals(
        items,
        SAMPLE_CATALOG,
        'retirada',
        600
      )
      expect(retiradaTotals.taxaEntregaCents).toBe(0)
      expect(retiradaTotals.totalCents).toBe(1600)
    })
  })

  describe('3. Validação de dados do cliente conforme as 3 modalidades (delivery, mesa, retirada)', () => {
    it('valida campos obrigatórios na modalidade delivery (nome, telefone, rua, numero, bairro)', () => {
      const incompleteDelivery = validateCustomerCheckoutData({
        clienteNome: 'Maria Souza',
        clienteTelefone: '19998107666',
        modalidade: 'delivery',
        rua: 'Rua dos Crisântemos',
        // faltando numero e bairro
      })
      expect(incompleteDelivery.valid).toBe(false)
      expect(incompleteDelivery.fieldErrors.numero).toBeDefined()
      expect(incompleteDelivery.fieldErrors.bairro).toBeDefined()

      const completeDelivery = validateCustomerCheckoutData({
        clienteNome: 'Maria Souza',
        clienteTelefone: '(19) 99810-7666',
        modalidade: 'delivery',
        rua: 'Rua dos Crisântemos',
        numero: '350',
        bairro: 'Jd. Nova Leme',
        complemento: 'Casa B',
        referencia: 'Em frente ao Mercado do Angu',
      })
      expect(completeDelivery.valid).toBe(true)
      expect(completeDelivery.sanitized?.enderecoEntrega?.rua).toBe(
        'Rua dos Crisântemos'
      )
    })

    it('valida campos obrigatórios na modalidade mesa (nome, telefone, numeroMesa)', () => {
      const missingTable = validateCustomerCheckoutData({
        clienteNome: 'Carlos Lima',
        clienteTelefone: '19999998888',
        modalidade: 'mesa',
      })
      expect(missingTable.valid).toBe(false)
      expect(missingTable.fieldErrors.numeroMesa).toBeDefined()

      const validTable = validateCustomerCheckoutData({
        clienteNome: 'Carlos Lima',
        clienteTelefone: '19999998888',
        modalidade: 'mesa',
        numeroMesa: 'Mesa 07',
      })
      expect(validTable.valid).toBe(true)
      expect(validTable.sanitized?.numeroMesa).toBe('Mesa 07')
    })

    it('valida campos obrigatórios na modalidade retirada (nome e telefone)', () => {
      const missingPhone = validateCustomerCheckoutData({
        clienteNome: 'Ana Paula',
        clienteTelefone: '123', // curto demais
        modalidade: 'retirada',
      })
      expect(missingPhone.valid).toBe(false)
      expect(missingPhone.fieldErrors.clienteTelefone).toBeDefined()

      const validRetirada = validateCustomerCheckoutData({
        clienteNome: 'Ana Paula',
        clienteTelefone: '(19) 98877-6655',
        modalidade: 'retirada',
      })
      expect(validRetirada.valid).toBe(true)
      expect(validRetirada.sanitized?.modalidade).toBe('retirada')
    })
  })

  describe('4. Geração da mensagem estruturada do WhatsApp e URL wa.me', () => {
    it('inclui todos os campos exigidos na mensagem estruturada do WhatsApp', () => {
      const fixedNow = new Date('2026-10-26T22:00:00.000Z')
      const { order } = createOrderIdempotent({
        clienteNome: 'Roberto Caipira',
        clienteTelefone: '(19) 99810-7666',
        modalidade: 'delivery',
        enderecoEntrega: {
          rua: 'Rua das Palmeiras',
          numero: '45',
          bairro: 'Centro',
          complemento: 'Ap 12',
          referencia: 'Próximo à padaria',
        },
        itens: [
          {
            id: 'item-1',
            codigo: 'BC-001',
            produto: 'Espetinho bovino',
            quantidade: 2,
            precoUnitarioCents: 1500,
            varianteNome: 'Com queijo gratinado',
            adicionais: [
              { codigo: 'BC-078', nome: 'Molho especial', precoCents: 350 },
            ],
            subtotalItemCents: 3700,
            observacao: 'Carne bem passada',
          },
        ],
        subtotalCents: 3700,
        taxaEntregaCents: 500,
        totalCents: 4200,
        observacoesCliente: 'Trazer troco para R$ 50,00',
        existingOrders: [],
        now: fixedNow,
        persistToStorage: false,
      })

      const msg = buildStructuredWhatsAppOrderMessage(order)
      expect(msg).toContain('#BC-1001')
      expect(msg).toContain('Roberto Caipira')
      expect(msg).toContain('(19) 99810-7666')
      expect(msg).toContain('Delivery')
      expect(msg).toContain('Rua das Palmeiras, 45 — Centro')
      expect(msg).toContain('Ap 12')
      expect(msg).toContain('Próximo à padaria')
      expect(msg).toContain('2x Espetinho bovino')
      expect(msg).toContain('Com queijo gratinado')
      expect(msg).toContain('Molho especial')
      expect(msg).toContain('Carne bem passada')
      expect(msg).toContain('Trazer troco para R$ 50,00')
      expect(msg).toContain('Aguardando confirmação do estabelecimento')

      const url = buildWhatsAppOrderUrl('5519998107666', order)
      expect(url).toContain('https://wa.me/5519998107666?text=')
      expect(decodeURIComponent(url)).toContain('#BC-1001')
    })
  })

  describe('5. Status inicial aguardando_confirmacao e proteção contra duplicidade (createOrderIdempotent)', () => {
    it('registra pedido com status aguardando_confirmacao e evita duplicar em cliques múltiplos', () => {
      const t0 = new Date('2026-10-26T22:10:00.000Z')
      const baseParams = {
        clienteNome: 'Fernanda Costa',
        clienteTelefone: '(19) 99111-2233',
        modalidade: 'mesa' as const,
        numeroMesa: '05',
        itens: [
          {
            id: 'item-empada',
            codigo: 'BC-016',
            produto: 'Empada de frango',
            quantidade: 3,
            precoUnitarioCents: 800,
            adicionais: [],
            subtotalItemCents: 2400,
          },
        ],
        subtotalCents: 2400,
        taxaEntregaCents: 0,
        totalCents: 2400,
        persistToStorage: false,
      }

      // Primeiro clique
      const firstAttempt = createOrderIdempotent({
        ...baseParams,
        existingOrders: [],
        now: t0,
      })

      expect(firstAttempt.deduplicated).toBe(false)
      expect(firstAttempt.order.status).toBe('aguardando_confirmacao')
      expect(firstAttempt.order.numeroPedido).toBe('#BC-1001')
      expect(firstAttempt.orders).toHaveLength(1)

      // Segundo clique 2 segundos depois com o mesmo pedido
      const t1 = new Date(t0.getTime() + 2000)
      const secondAttempt = createOrderIdempotent({
        ...baseParams,
        existingOrders: firstAttempt.orders,
        now: t1,
      })

      expect(secondAttempt.deduplicated).toBe(true)
      expect(secondAttempt.order.id).toBe(firstAttempt.order.id)
      expect(secondAttempt.order.numeroPedido).toBe('#BC-1001')
      expect(secondAttempt.orders).toHaveLength(1)
    })
  })
})

# BRASA CAIPIRA — CARDÁPIO DIGITAL E PAINEL ADMINISTRATIVO

> **Slogan:** O verdadeiro sabor da brasa.  
> **Localização:** Rua dos Crisântemos, 350 — Jardim Nova Leme — Leme/SP (Em frente ao Mercado do Angu).  
> **WhatsApp Oficial:** (19) 99810-7666 | **Instagram:** [@brasa.caipira](https://instagram.com/brasa.caipira)

---

## 📌 Visão Geral do Projeto

Sistema comercial profissional de cardápio digital mobile-first e painel administrativo sob medida para o estabelecimento **BRASA CAIPIRA**. Desenvolvido com foco em velocidade de carregamento para celulares (via QR Code e redes sociais), facilidade operacional pelo smartphone para o proprietário e custo operacional fixo de **R$ 0,00** no início.

---

## 🚀 Tecnologias e Versões Auditadas (Fase 1)

- **Framework Web:** [Next.js](https://nextjs.org/) `v16.4.3` (App Router, Turbopack, Server Actions)
- **Biblioteca Base:** [React](https://react.dev/) `v19.3.1` + [React DOM](https://react.dev/) `v19.3.1`
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) `v5.8.2` (Modo estrito ativado)
- **Estilização e Design:** [Tailwind CSS](https://tailwindcss.com/) `v3.4.17` + [Lucide React](https://lucide.dev/) `v1.61.0`
- **Validação de Esquemas:** [Zod](https://zod.dev/) `v4.6.7` (Versão segura sem vulnerabilidades de memória)
- **Banco de Dados e Auth:** [Supabase](https://supabase.com/) (`@supabase/supabase-js` `v2.118.0`, `@supabase/ssr` `v0.12.7`)
- **Suíte de Testes:** [Vitest](https://vitest.dev/) `v5.0.5` (Versão estável com 16 testes aprovados)
- **Controle de Versão:** Git `2.51.0`

---

## 🛡️ Regras de Negócio e Segurança Implementadas

1. **Catálogo Original Preservado:** Todos os 87 itens originais da planilha (`BC-001` a `BC-087`) e as 17 categorias (`CAT-01` a `CAT-17`) foram mapeados com rastreabilidade total em `supabase/seed.sql`.
2. **Nenhum Produto Publicado Automaticamente:** 100% dos produtos começam em status `'draft'` para revisão e precificação pelo proprietário.
3. **Disponibilidade e Horários Rígidos:** Produtos sem dia/horário definido **NÃO** são considerados abertos todos os dias; recebem o status "Horário sob consulta" e bloqueio de compra direta.
4. **Cálculos Financeiros em Centavos:** Todas as operações monetárias ocorrem em inteiros (`cents`), eliminando erros de arredondamento de ponto flutuante.
5. **Separação de Estados do Pedido:** O sistema diferencia categoricamente checkout iniciado, pedido registrado aguardando WhatsApp, pedido confirmado pela cozinha, em preparo e concluído.

---

## 🧪 Execução de Testes Locais

Para executar os testes unitários da aplicação:

```bash
npm test
```

Para rodar o servidor de desenvolvimento:

```bash
npm run dev
```

Para compilar para produção:

```bash
npm run build
```

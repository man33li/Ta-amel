#!/usr/bin/env node
/**
 * MindForge MCP server. Exposes the local encrypted note store to any MCP
 * client (Claude Desktop, Codex, custom agents) over stdio.
 *
 * Usage:
 *   MINDFORGE_PASSPHRASE=... mindforge-mcp
 *
 * If MINDFORGE_DISABLE_ENCRYPTION=1, the passphrase is ignored and a
 * plaintext DB is opened (useful for tests / dev only).
 *
 * Tools:
 *   list_wings, list_rooms, list_cards, search_cards,
 *   get_card, create_card, update_card
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { unlockDb, isDbUnlocked } from '../src/lib/db/sqlite'
import {
  listWings,
  listRooms,
  listCards,
  getCard,
  createCard,
  updateCard,
} from '../src/lib/db/repo'
import { bm25Search } from '../src/lib/memory/bm25'
import { extractTextFromTiptap } from '../src/lib/utils'

async function main() {
  const passphrase = process.env.MINDFORGE_PASSPHRASE ?? ''
  const disabled = process.env.MINDFORGE_DISABLE_ENCRYPTION === '1'

  if (!disabled && !passphrase) {
    console.error('mindforge-mcp: MINDFORGE_PASSPHRASE is required')
    process.exit(1)
  }

  if (!unlockDb(passphrase)) {
    console.error('mindforge-mcp: could not unlock database (wrong passphrase or missing file)')
    process.exit(1)
  }
  if (!isDbUnlocked()) {
    console.error('mindforge-mcp: database did not open')
    process.exit(1)
  }

  const server = new McpServer({
    name: 'mindforge',
    version: '0.1.0',
  })

  server.tool(
    'list_wings',
    'List all wings in the memory palace.',
    {},
    async () => {
      const wings = listWings()
      return {
        content: [{ type: 'text', text: JSON.stringify({ wings }, null, 2) }],
      }
    }
  )

  server.tool(
    'list_rooms',
    'List rooms, optionally filtered by wing_id.',
    { wing_id: z.string().optional() },
    async ({ wing_id }) => {
      const rooms = listRooms({ wingId: wing_id })
      return {
        content: [{ type: 'text', text: JSON.stringify({ rooms }, null, 2) }],
      }
    }
  )

  server.tool(
    'list_cards',
    'List cards, optionally filtered by room_id.',
    {
      room_id: z.string().nullable().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ room_id, limit }) => {
      const cards = listCards({ roomId: room_id ?? undefined })
      const sliced = limit ? cards.slice(0, limit) : cards
      return {
        content: [{ type: 'text', text: JSON.stringify({ cards: sliced }, null, 2) }],
      }
    }
  )

  server.tool(
    'get_card',
    'Fetch a single card by id.',
    { id: z.string() },
    async ({ id }) => {
      const card = getCard(id)
      if (!card) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'not_found' }) }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ card }, null, 2) }],
      }
    }
  )

  server.tool(
    'search_cards',
    'BM25 keyword search over all cards. Returns the top-k matches with scores.',
    {
      query: z.string(),
      k: z.number().int().min(1).max(50).optional(),
    },
    async ({ query, k = 10 }) => {
      const cards = listCards()
      const ranked = bm25Search(
        cards,
        (c) => `${c.title}\n${extractTextFromTiptap(c.content)}`,
        query,
        k
      )
      const results = ranked.map((r) => ({ score: r.score, card: r.doc }))
      return {
        content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
      }
    }
  )

  server.tool(
    'create_card',
    'Create a new card. Title is required; content is a Tiptap JSON doc (optional).',
    {
      title: z.string(),
      content: z.record(z.string(), z.unknown()).optional(),
      room_id: z.string().nullable().optional(),
    },
    async ({ title, content, room_id }) => {
      const card = createCard({ title, content: content ?? {}, roomId: room_id ?? null })
      return {
        content: [{ type: 'text', text: JSON.stringify({ card }, null, 2) }],
      }
    }
  )

  server.tool(
    'update_card',
    'Update a card by id. Only supplied fields are changed.',
    {
      id: z.string(),
      title: z.string().optional(),
      content: z.record(z.string(), z.unknown()).optional(),
      room_id: z.string().nullable().optional(),
    },
    async ({ id, title, content, room_id }) => {
      const card = updateCard(id, { title, content, room_id })
      if (!card) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'not_found' }) }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ card }, null, 2) }],
      }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('mindforge-mcp: fatal error:', err)
  process.exit(1)
})

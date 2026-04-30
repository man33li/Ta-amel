// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'

/**
 * Spawn-style smoke test for the MCP server. Boots `tsx bin/mindforge-mcp.ts`
 * with encryption disabled and a fresh tmp DB, sends initialize + tools/list,
 * asserts the seven tools are advertised. Skipped on non-CI workers if tsx
 * isn't installed (it's a dev dep, so installed locally).
 */

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: { tools?: Array<{ name: string }> }
  error?: { message: string }
}

function rpc(id: number, method: string, params: unknown = {}) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
}

describe('MCP server smoke', () => {
  it('boots, advertises the expected tools, and shuts down cleanly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mindforge-mcp-'))
    const dbPath = join(dir, 'test.db')

    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        join(process.cwd(), 'bin', 'mindforge-mcp.ts'),
      ],
      {
        env: {
          ...process.env,
          MINDFORGE_DISABLE_ENCRYPTION: '1',
          MINDFORGE_DB_PATH: dbPath,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )

    try {
      let stderr = ''
      child.stderr.on('data', (d) => (stderr += d.toString()))

      const buffer: string[] = []
      const pending = new Map<number, (msg: JsonRpcResponse) => void>()
      let leftover = ''
      child.stdout.on('data', (chunk) => {
        leftover += chunk.toString('utf8')
        let nl: number
        while ((nl = leftover.indexOf('\n')) >= 0) {
          const line = leftover.slice(0, nl).trim()
          leftover = leftover.slice(nl + 1)
          if (!line) continue
          buffer.push(line)
          try {
            const msg = JSON.parse(line) as JsonRpcResponse
            const cb = pending.get(msg.id)
            if (cb) {
              pending.delete(msg.id)
              cb(msg)
            }
          } catch {
            // notification or partial line, ignore
          }
        }
      })

      const send = <T extends JsonRpcResponse>(
        id: number,
        method: string,
        params: unknown = {}
      ): Promise<T> =>
        new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(id)
            reject(new Error(`timeout waiting for id=${id}; stderr=${stderr}`))
          }, 30_000)
          pending.set(id, (msg) => {
            clearTimeout(timer)
            resolve(msg as T)
          })
          child.stdin.write(rpc(id, method, params))
        })

      const init = await send(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mindforge-test', version: '0' },
      })
      expect(init.error).toBeUndefined()

      child.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) +
          '\n'
      )

      const tools = await send(2, 'tools/list')
      const names = (tools.result?.tools ?? []).map((t) => t.name).sort()
      expect(names).toEqual(
        [
          'create_card',
          'get_card',
          'list_cards',
          'list_rooms',
          'list_wings',
          'search_cards',
          'update_card',
        ].sort()
      )
    } finally {
      child.stdin.end()
      child.kill()
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // tmp cleanup best-effort
      }
    }
  }, 60_000)
})

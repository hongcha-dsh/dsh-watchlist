/**
 * Host half of the watchlist bundle.
 *
 * The Client half derives most of a conversation's state from its own stores.
 * The one signal it cannot see is a failed turn of a background Session, so this
 * half records failure notices raised by the Host and serves them as a small
 * read-only JSON route next to the page.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 */
export const name = 'dsh-watchlist'
export const inject = ['webServer']

/** How many distinct failed Sessions are kept; the oldest notice is dropped first. */
const FAILURE_LIMIT = 64

/**
 * Convert an unknown error value into display text.
 * @param {unknown} error - value carried by the Host event.
 * @returns {string} a short message.
 */
function messageOf(error) {
  if (error === undefined || error === null) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Serve the recorded failures as JSON.
 * @param {Map<string, { at: number, message: string }>} failures - recorded notices.
 * @param {{ polls: number, at: number, version: string }} meter - Client liveness meter.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void} route handler.
 */
function createFailureHandler(failures, meter) {
  return (req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { allow: 'GET' })
      res.end()
      return
    }
    const site = req.headers['sec-fetch-site']
    if (typeof site === 'string' && site !== 'same-origin' && site !== 'none') {
      res.writeHead(403)
      res.end()
      return
    }
    meter.polls += 1
    meter.at = Date.now()
    const url = typeof req.url === 'string' ? req.url : ''
    const version = /[?&]v=([^&]+)/.exec(url)
    if (version !== null) meter.version = version[1].slice(0, 40)
    const status = /[?&]st=(\d+)\.(\d+)/.exec(url)
    if (status !== null) {
      meter.statusCount = Number(status[1])
      meter.pendingCount = Number(status[2])
    }
    const debug = /[?&]d=([^&]*)/.exec(url)
    if (debug !== null) {
      try {
        meter.debug = decodeURIComponent(debug[1]).slice(0, 2000)
      } catch {
        /* an unreadable diagnosis must not break the poll */
      }
    }
    const body = JSON.stringify({
      failures: Object.fromEntries(failures),
      clientPolls: meter.polls,
      clientLastPollAt: meter.at,
      clientVersion: meter.version,
      clientStatusCount: meter.statusCount,
      clientPendingCount: meter.pendingCount,
      clientDebug: meter.debug,
    })
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(body)
  }
}

/**
 * Mount the failure recorder and its route.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 */
export function apply(ctx) {
  /** @type {Map<string, { at: number, message: string }>} */
  const failures = new Map()
  /** Last Client poll, so the page's build generation is observable from outside. */
  const meter = { polls: 0, at: 0, version: '', statusCount: 0, pendingCount: 0, debug: '' }

  /**
   * Record one failure notice for a Session.
   * @param {unknown} sessionId - owning Session identity.
   * @param {unknown} error - failure value.
   */
  const record = (sessionId, error) => {
    if (typeof sessionId !== 'string' || sessionId === '') return
    failures.delete(sessionId)
    failures.set(sessionId, { at: Date.now(), message: messageOf(error) })
    while (failures.size > FAILURE_LIMIT) {
      const oldest = failures.keys().next()
      if (oldest.done === true) break
      failures.delete(oldest.value)
    }
  }

  ctx.on('agent/error', (payload) => {
    record(payload?.agent?.sessionId, payload?.error)
  })
  ctx.on('api-session/error', (sessionId, message) => {
    record(sessionId, message)
  })
  ctx.on('api-session/status', (sessionId, running) => {
    if (running === true) failures.delete(sessionId)
  })

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/plugins/dsh-watchlist/failures',
      handler: createFailureHandler(failures, meter),
    }),
    'dsh-watchlist: failure notices route',
  )
}

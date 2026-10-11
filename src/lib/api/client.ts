import type { Paginated, PaginationLinks, PaginationMeta } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
const TOKEN_KEY = 'sims-token'

// ---- Token storage: memory first, sessionStorage as the reload fallback ----
let memoryToken: string | null = null

export const tokenStore = {
  get(): string | null {
    if (memoryToken) return memoryToken
    try {
      memoryToken = sessionStorage.getItem(TOKEN_KEY)
    } catch {
      // storage blocked: memory only
    }
    return memoryToken
  },
  set(token: string) {
    memoryToken = token
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      // ignore
    }
  },
  clear() {
    memoryToken = null
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
  },
}

// ---- Errors ----
export class ApiError extends Error {
  status: number
  /** Field errors; only present on 422. */
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

let unauthorizedHandler: (() => void) | null = null

/** AuthProvider registers this so a 401 clears the session and routes to login. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

// ---- Request core ----
type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(`${BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

interface RequestOptions {
  query?: QueryParams
  body?: unknown
  /** Do not trigger the global 401 handling (used by login). */
  skipAuthRedirect?: boolean
}

export interface RawEnvelope<T> {
  success?: boolean
  message?: string
  data: T
  links?: PaginationLinks
  meta?: PaginationMeta
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<RawEnvelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  if (response.status === 204) return { data: undefined as T }

  let payload: Partial<RawEnvelope<T>> & { errors?: Record<string, string[]> } = {}
  try {
    payload = await response.json()
  } catch {
    // non-JSON body (e.g. a proxy error page)
  }

  if (!response.ok) {
    if (response.status === 401 && !options.skipAuthRedirect) {
      tokenStore.clear()
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, payload.message ?? 'Something went wrong.', payload.errors ?? {})
  }

  return payload as RawEnvelope<T>
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, 'skipAuthRedirect'>) =>
    request<T>('POST', path, { body, ...opts }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: (path: string) => request<void>('DELETE', path),
}

/** GET a single resource and unwrap `data`. */
export async function getOne<T>(path: string, query?: QueryParams): Promise<T> {
  return (await api.get<T>(path, query)).data
}

/** GET a paginated list and reshape the envelope into `{items, links, meta}`. */
export async function getList<T>(path: string, query?: QueryParams): Promise<Paginated<T>> {
  const body = await api.get<T[]>(path, query)
  const items = body.data
  return {
    items,
    links: body.links ?? { first: null, last: null, prev: null, next: null },
    meta: body.meta ?? {
      current_page: 1,
      from: items.length ? 1 : null,
      last_page: 1,
      per_page: items.length,
      to: items.length || null,
      total: items.length,
      path: '',
    },
  }
}

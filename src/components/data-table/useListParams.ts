import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { ListParams } from '@/lib/api/types'

const DEFAULT_PER_PAGE = 15

interface ListParamsOptions {
  /** Sort applied when the URL has none (e.g. `-start_date`). Picking it again removes it from the URL. */
  defaultSort?: string
}

/**
 * List state (page, per_page, sort, search, exact-match filters) lives in the URL query
 * string, so lists are linkable and survive a reload. `params` is ready to pass to the API.
 */
export function useListParams<F extends string = never>(
  filterKeys: readonly F[] = [],
  { defaultSort }: ListParamsOptions = {},
) {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => {
    const page = Number(searchParams.get('page')) || 1
    const per_page = Number(searchParams.get('per_page')) || DEFAULT_PER_PAGE
    const filters: Record<string, string> = {}
    for (const key of filterKeys) {
      const value = searchParams.get(key)
      if (value) filters[key] = value
    }
    return {
      page,
      per_page,
      sort: searchParams.get('sort') ?? defaultSort,
      search: searchParams.get('search') ?? undefined,
      ...filters,
    } as ListParams & Partial<Record<F, string>>
  }, [searchParams, filterKeys, defaultSort])

  /** True when search, a filter or a non-default sort is applied: drives the Clear button. */
  const hasActive = useMemo(() => {
    if (searchParams.get('search')) return true
    if (filterKeys.some((key) => searchParams.get(key))) return true
    const sort = searchParams.get('sort')
    return sort !== null && sort !== defaultSort
  }, [searchParams, filterKeys, defaultSort])

  /** Update keys; any change except `page` itself resets to page 1. */
  const update = useCallback(
    (changes: Record<string, string | number | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (!('page' in changes)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clear = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of ['search', 'sort', 'page', ...filterKeys]) next.delete(key)
        return next
      },
      { replace: true },
    )
  }, [setSearchParams, filterKeys])

  return {
    params,
    hasActive,
    clear,
    setPage: (page: number) => update({ page }),
    setPerPage: (per_page: number) => update({ per_page }),
    setSort: (sort: string | undefined) => update({ sort: sort === defaultSort ? undefined : sort }),
    setSearch: (search: string) => update({ search }),
    setFilter: (key: F, value: string | undefined) => update({ [key]: value }),
  }
}

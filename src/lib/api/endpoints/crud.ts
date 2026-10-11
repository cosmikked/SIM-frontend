import { api, getList, getOne, type QueryParams } from '../client'
import type { ListParams, Paginated } from '../types'

/** Builds list/get/create/update/remove for a standard apiResource route. */
export function crud<T, Filters extends QueryParams = QueryParams, Body = Partial<T>>(path: string) {
  return {
    // Filters arrive as strings from the URL, so accept `string` alongside the literal types.
    list: (params: ListParams & { [K in keyof Filters]?: Filters[K] | string } = {}): Promise<Paginated<T>> =>
      getList<T>(path, params as QueryParams),
    get: (id: number): Promise<T> => getOne<T>(`${path}/${id}`),
    create: async (body: Body): Promise<T> => (await api.post<T>(path, body)).data,
    update: async (id: number, body: Partial<Body>): Promise<T> => (await api.patch<T>(`${path}/${id}`, body)).data,
    remove: async (id: number): Promise<void> => {
      await api.delete(`${path}/${id}`)
    },
  }
}

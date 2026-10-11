import { api, getOne } from '../client'
import type { ForgotPasswordValues, LoginValues, ProfileValues, ResetPasswordValues } from '../schemas'
import type { User } from '../types'

export const authApi = {
  /** Wrong credentials / inactive accounts come back as a 422 on `email`. */
  login: async (values: LoginValues): Promise<string> => {
    const res = await api.post<{ token: string }>('/auth/login', values, { skipAuthRedirect: true })
    return res.data.token
  },
  logout: async (): Promise<void> => {
    await api.post<void>('/auth/logout')
  },
  me: (): Promise<User> => getOne<User>('/auth/me'),
  updateMe: async (values: Partial<ProfileValues>): Promise<User> => (await api.patch<User>('/auth/me', values)).data,
  forgotPassword: async (values: ForgotPasswordValues): Promise<string> =>
    (await api.post<void>('/auth/forgot-password', values, { skipAuthRedirect: true })).message ?? '',
  resetPassword: async (values: ResetPasswordValues): Promise<string> =>
    (await api.post<void>('/auth/reset-password', values, { skipAuthRedirect: true })).message ?? '',
}

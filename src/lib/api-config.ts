/**
 * Central API configuration.
 * Set NEXT_PUBLIC_API_URL in your .env file to point to the desired backend.
 *
 * .env.local   → development  (e.g. http://localhost:5000)
 * .env.production → production (e.g. https://trackademy.kz)
 */

export const API_HOST =
  (process.env.NEXT_PUBLIC_API_URL ?? 'https://trackademy.kz').replace(/\/$/, '');

/** Full base URL including /api — use this in most services */
export const API_BASE_URL = `${API_HOST}/api`;

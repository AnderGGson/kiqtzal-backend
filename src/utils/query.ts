export function parsePositiveInt(value: unknown): number | undefined {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0) return undefined
  return number
}

export function parseOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
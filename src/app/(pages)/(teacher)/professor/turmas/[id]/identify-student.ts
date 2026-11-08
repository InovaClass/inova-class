export const identifyStudent = (name: string, detail?: string | null) =>
  detail ? `${name} (${detail})` : name

export const pickRandom = <T>(items: T[], random = Math.random) =>
  items[Math.floor(random() * items.length)]

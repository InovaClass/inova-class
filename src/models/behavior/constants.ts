export const BEHAVIOR_NAME_MAX_LENGTH = 80
export const BEHAVIOR_XP_MAX = 100
export const BEHAVIOR_COINS_MAX = 100

export const DEFAULT_BEHAVIORS = [
  { name: 'Participou da aula', xp: 5, hp: 0, coins: 0 },
  { name: 'Entregou a tarefa', xp: 10, hp: 0, coins: 0 },
  { name: 'Ajudou um colega', xp: 10, hp: 0, coins: 5 },
  { name: 'Trabalhou bem em equipe', xp: 10, hp: 0, coins: 0 },
  { name: 'Superou um desafio', xp: 15, hp: 0, coins: 5 },
  { name: 'Chegou atrasado', xp: 0, hp: -5, coins: 0 },
  { name: 'Atrapalhou a aula', xp: 0, hp: -5, coins: 0 },
  { name: 'Usou o celular sem permissão', xp: 0, hp: -5, coins: 0 },
  { name: 'Não entregou a tarefa', xp: 0, hp: -10, coins: 0 },
  { name: 'Desrespeitou um colega', xp: 0, hp: -15, coins: 0 }
]

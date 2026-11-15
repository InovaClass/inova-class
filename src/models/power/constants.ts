import type { CharacterClass } from '@/models/avatar/layers'

export const POWER_NAME_MAX_LENGTH = 80
export const POWER_DESCRIPTION_MAX_LENGTH = 200
export const POWER_COST_MAX = 100
export const POWER_MIN_LEVEL_MAX = 20

type DefaultPower = {
  name: string
  description: string
  cost: number
  minLevel: number
}

export const DEFAULT_POWERS: Record<CharacterClass, DefaultPower[]> = {
  warrior: [
    {
      name: 'Prazo extra',
      description: 'Entregar uma tarefa um dia depois do prazo.',
      cost: 15,
      minLevel: 1
    },
    {
      name: 'Passar a vez',
      description: 'Não responder a uma pergunta do professor durante a aula.',
      cost: 20,
      minLevel: 2
    },
    {
      name: 'Escolher a dupla',
      description: 'Escolher com quem fazer o próximo trabalho em dupla.',
      cost: 30,
      minLevel: 3
    }
  ],
  mage: [
    {
      name: 'Dica do professor',
      description: 'Pedir uma dica em um exercício da aula.',
      cost: 10,
      minLevel: 1
    },
    {
      name: 'Consultar o caderno',
      description: 'Consultar o caderno por um minuto durante um exercício.',
      cost: 20,
      minLevel: 2
    },
    {
      name: 'Tema da prova',
      description: 'Saber o tema de uma questão da próxima prova.',
      cost: 40,
      minLevel: 4
    }
  ],
  healer: [
    {
      name: 'Ajudar um colega',
      description: 'Explicar a resposta de um exercício para um colega.',
      cost: 10,
      minLevel: 1
    },
    {
      name: 'Trocar de lugar',
      description: 'Sentar ao lado de um colega na próxima aula.',
      cost: 15,
      minLevel: 2
    },
    {
      name: 'Proteger a equipe',
      description:
        'Dar mais um dia de prazo à sua equipe em um trabalho em grupo.',
      cost: 35,
      minLevel: 4
    }
  ]
}

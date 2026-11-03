import type { Metadata } from 'next'
import Link from 'next/link'

import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_UPDATED_AT
} from '@/app/(pages)/(legal)/legal-info'

export const metadata: Metadata = { title: 'Termos de Uso' }

const TermsPage = () => (
  <>
    <h1>Termos de Uso</h1>
    <p className="text-muted-foreground">
      Última atualização em {LEGAL_UPDATED_AT}.
    </p>

    <p>
      O inova.class é uma plataforma de gestão de sala de aula gamificada,
      mantida por {LEGAL_CONTROLLER_NAME}. Ao criar uma conta, você aceita estes
      termos.
    </p>

    <h2>Sua conta</h2>
    <ul>
      <li>Informe dados verdadeiros ao se cadastrar.</li>
      <li>
        Mantenha sua senha em segredo: você responde pelo uso da sua conta.
      </li>
      <li>
        Se tiver menos de 18 anos, leia estes termos e a Política de Privacidade
        com o seu responsável antes de criar a conta.
      </li>
    </ul>

    <h2>Professores</h2>
    <p>
      O professor administra as turmas que cria e responde pelo que publica
      nelas e pelo uso que faz dos dados dos alunos, que deve servir apenas às
      atividades da turma.
    </p>

    <h2>Uso permitido</h2>
    <p>Não é permitido:</p>
    <ul>
      <li>acessar contas ou turmas de outras pessoas sem autorização;</li>
      <li>prejudicar o funcionamento da plataforma;</li>
      <li>publicar conteúdo ilegal, ofensivo ou que exponha outras pessoas.</li>
    </ul>

    <h2>Disponibilidade</h2>
    <p>
      A plataforma está em desenvolvimento: funções podem mudar e pode haver
      interrupções. Ela é oferecida como está, sem garantia de funcionamento
      contínuo.
    </p>

    <h2>Encerramento</h2>
    <p>
      Uma conta que descumpra estes termos pode ser suspensa ou encerrada. Para
      pedir a exclusão da sua conta, escreva para {LEGAL_CONTACT_EMAIL}.
    </p>

    <h2>Alterações e legislação</h2>
    <p>
      Avisaremos sobre mudanças importantes nestes termos. Eles seguem as leis
      brasileiras.
    </p>

    <h2>Dados pessoais</h2>
    <p>
      O tratamento dos seus dados está descrito na{' '}
      <Link href="/privacidade" className="underline underline-offset-4">
        Política de Privacidade
      </Link>
      .
    </p>
  </>
)

export default TermsPage

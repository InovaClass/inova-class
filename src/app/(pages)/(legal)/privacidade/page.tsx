import type { Metadata } from 'next'
import Link from 'next/link'

import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_UPDATED_AT
} from '@/app/(pages)/(legal)/legal-info'

export const metadata: Metadata = { title: 'Política de Privacidade' }

const PrivacyPage = () => (
  <>
    <h1>Política de Privacidade</h1>
    <p className="text-muted-foreground">
      Última atualização em {LEGAL_UPDATED_AT}.
    </p>

    <p>
      Esta política explica como o inova.class trata dados pessoais, nos termos
      da Lei Geral de Proteção de Dados (LGPD). O controlador é{' '}
      {LEGAL_CONTROLLER_NAME}, com contato em {LEGAL_CONTACT_EMAIL}.
    </p>

    <h2>Dados que coletamos</h2>
    <ul>
      <li>
        Cadastro: nome, e-mail, senha (guardada de forma que nem nós conseguimos
        lê-la) e papel na plataforma.
      </li>
      <li>Alunos: nome de usuário e as turmas em que estão matriculados.</li>
      <li>Professores: as turmas que criam, com nome e descrição.</li>
      <li>
        Google, se você escolher entrar por ele: nome e e-mail da sua conta. Não
        guardamos sua foto.
      </li>
      <li>Sessão: endereço IP e identificação do navegador.</li>
      <li>
        Aceite: a data em que você aceitou os Termos de Uso e esta política.
      </li>
    </ul>

    <h2>Para que usamos</h2>
    <ul>
      <li>criar sua conta e permitir que você entre nela;</li>
      <li>confirmar seu e-mail e redefinir sua senha;</li>
      <li>organizar as turmas entre professores e alunos;</li>
      <li>manter a plataforma segura.</li>
    </ul>
    <p>Não vendemos dados pessoais nem os usamos para publicidade.</p>

    <h2>Crianças e adolescentes</h2>
    <p>
      A plataforma é usada em sala de aula e pode tratar dados de menores de
      idade, sempre no interesse da atividade escolar. Se você é responsável por
      um aluno e tem alguma dúvida ou pedido, escreva para {LEGAL_CONTACT_EMAIL}
      .
    </p>

    <h2>Com quem compartilhamos</h2>
    <p>
      O professor de uma turma vê os dados dos alunos dela. Além disso, usamos
      fornecedores que tratam dados em nosso nome, alguns com sede ou
      infraestrutura fora do Brasil:
    </p>
    <ul>
      <li>Vercel: hospedagem;</li>
      <li>Neon: banco de dados;</li>
      <li>Resend: envio de e-mails;</li>
      <li>Google: entrada com conta Google, se você a escolher.</li>
    </ul>

    <h2>Cookies</h2>
    <p>
      Usamos apenas os cookies necessários para manter sua sessão. Não usamos
      cookies de publicidade.
    </p>

    <h2>Por quanto tempo guardamos</h2>
    <p>
      Guardamos os dados enquanto a conta existir. Depois da exclusão da conta,
      só mantemos o que a lei exigir.
    </p>

    <h2>Seus direitos</h2>
    <p>
      Você pode pedir a confirmação do tratamento, o acesso, a correção, a
      exclusão ou a portabilidade dos seus dados e revogar o seu consentimento.
      Para isso, escreva para {LEGAL_CONTACT_EMAIL}. Você também pode reclamar à
      Autoridade Nacional de Proteção de Dados (ANPD).
    </p>

    <h2>Alterações</h2>
    <p>
      Avisaremos sobre mudanças importantes nesta política. O uso da plataforma
      também segue os{' '}
      <Link href="/termos" className="underline underline-offset-4">
        Termos de Uso
      </Link>
      .
    </p>
  </>
)

export default PrivacyPage

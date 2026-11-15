import { appendFile, rm } from 'node:fs/promises'

export const CREDENTIALS_FILE = 'seed-credentials.md'

type Section = { title: string; header: string[]; rows: string[][] }

const sectionOf = ({ title, header, rows }: Section) =>
  [
    `### ${title}`,
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    ''
  ].join('\n')

export const appendCredentials = async (
  script: string,
  { password, sections }: { password: string; sections: Section[] }
) => {
  const date = new Date().toLocaleString('pt-BR')
  const content = [
    `## ${date} · ${script}`,
    '',
    `Senha de todas as contas: \`${password}\``,
    '',
    ...sections
      .filter(({ rows }) => rows.length > 0)
      .map((section) => sectionOf(section)),
    ''
  ].join('\n')
  await appendFile(CREDENTIALS_FILE, content)
  console.log(`Credentials appended to ${CREDENTIALS_FILE}`)
}

export const removeCredentials = () => rm(CREDENTIALS_FILE, { force: true })

# Local testing guide

How to go through every feature by hand on your machine, as a teacher in one browser and a student in another. Each feature that changes what a user sees or does updates this guide in the same branch (see Documentation Rules in [`AGENTS.md`](../AGENTS.md)).

Labels in quotes are the pt-BR text on the screen.

## 1. Start the app

With Docker running:

```bash
pnpm install
pnpm dev
```

- App: <http://localhost:3000>
- Emails (Mailpit): <http://localhost:8025>

Nothing leaves your machine: Mailpit catches every email, so any address works (e.g. `teacher@example.com`). The first visit to each page is slower, since `pnpm dev` compiles the route on its first request.

Use two browsers, or a browser and its private window, because each one keeps its own session. This guide calls them **browser A** (teacher) and **browser B** (student).

## 2. Create the accounts

**Browser A, teacher:**

1. Go to `/cadastro`, choose "Sou professor", fill in the form and accept the terms. The password needs at least 8 characters.
2. Open the confirmation email in Mailpit and open its link in browser A. It signs you in and lands on `/professor`.

**Browser B, student:**

1. Go to `/cadastro`, choose "Sou aluno", fill in the form, including the username, and accept the terms.
2. Open the confirmation email in Mailpit and open its link in browser B. It signs you in and lands on `/aluno`.

"Continuar com o Google" only shows up when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (see [Google sign-in](../README.md#google-sign-in)).

## 3. Classes and join codes

1. **A:** click "Nova turma", create a class and copy the code under "Código da turma".
2. **B:** type the code under "Entrar em uma turma" and click "Entrar na turma". The class shows up on `/aluno`. Its card has no link until the student class page exists (#22).
3. **A:** reload the class page. The student is listed under "Alunos" with their username.
4. **A:** click "Editar", change the name and save. **B:** reload `/aluno` and check the new name.

## 4. Change or turn off the code

1. **A:** click "Gerar novo código" and confirm. **B:** the old code is now rejected, but the student stays in the class.
2. **A:** click "Desativar". **B:** the code gets the same error as an invalid one.
3. **A:** click "Ativar" to turn it back on.

## 5. Limit of wrong codes

1. **B:** under "Entrar em uma turma", try a code with 6 characters that doesn't exist (e.g. `222222`) 10 times. Each one shows the invalid code error on the field. A code of another length doesn't count.
2. **B:** try again, even with the right code. It shows "Muitas tentativas com códigos inválidos." and how many minutes are left, for up to 15 minutes.
3. In a private window, create another student account and join with the right code. The limit of one student doesn't affect another.

## 6. Remove a student

1. **A:** click "Remover" next to the student and confirm.
2. **B:** reload `/aluno`. The class is gone, and the account still works.
3. **B:** enter the current code again. The student comes back to the class.

## 7. Archive and restore a class

1. **A:** on the class page, click "Arquivar" and confirm. You land on the dashboard, without the class.
2. **B:** reload `/aluno`. The class is gone.
3. **A:** open the old address of the class. It shows a 404 page.
4. **A:** on the dashboard, click "Turmas arquivadas", then "Restaurar". You land on the dashboard, with the class back.
5. **A:** check that the students and the code are the same.
6. **B:** reload `/aluno`. The class is back.

To see the error of a failed restore, open `/professor/turmas/arquivadas` in two tabs of browser A and restore the class in the first one. In the second, click "Restaurar" too: it shows "Não encontramos essa turma."

## 8. Invite a student by email

Use a new private window for the invited student, since the invite signs them in.

1. **A:** on the class page, click "Convidar alunos", paste a line such as `Ana Souza, ana@example.com` and click "Enviar convites".
2. **A:** reload the class page. Ana is listed with "Convite pendente" and the email.
3. Open the invite email in Mailpit and open its link in the private window.
4. **Private window:** the page shows the generated username. Set a password, accept the terms and click "Criar senha".
5. **A:** reload the class page. Ana is now listed with the username.

## 9. Sign-in and password

- **Sign-in:** sign out and go to `/entrar`. A student signs in with either the email or the username, and a teacher with the email. A wrong password shows the same message as an unknown account.
- **Unverified email:** sign up without opening the link and try to sign in. It's rejected, and Mailpit gets a new link.
- **Password reset:** go to `/esqueci-a-senha`, click "Enviar link", open the link in Mailpit and set a new password.
- **Pending student:** request a password reset for a student who hasn't accepted their invite. Mailpit gets a new invite instead of a reset link.

## 10. Role areas

- **B:** open `/professor`. You're sent back to `/aluno`.
- **A:** open `/aluno`. You're sent back to `/professor`.
- **A:** open the address of a class created by another teacher. It shows a 404 page.
- Signed out, open `/professor` or `/aluno`. You're sent to `/entrar`.

## 11. Stop

Press `Ctrl+C` in the terminal to stop the app. The containers keep running; `pnpm services:stop` stops them and keeps the data, so the same accounts work next time.

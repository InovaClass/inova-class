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

## 8. Behaviors and consequences

1. **A:** on the class page, click "Comportamentos". The default behaviors are listed under "Positivos" and "Negativos", each with what it gives or takes (e.g. "+10 XP, +5 moedas").
2. **A:** click "Novo comportamento", fill in "Nome", type `10` in "XP" and `-5` in "HP", and submit. "HP" shows that the values must be all positive or all negative. Clear "HP" and submit: the behavior shows up under "Positivos".
3. **A:** click "Editar" next to it, change the values and save. The list shows the new values.
4. **A:** click "Remover" next to it and confirm. It shows "Comportamento removido." and the behavior is gone.
5. **A:** create another class. It starts with the default behaviors, without the ones you changed in the first class.
6. **A:** on the page of a class with students, check "Selecionar todos" (or some of the students), click "Aplicar comportamento" and pick one. A toast confirms it, the selection clears and each student shows the new XP, HP and coins.
7. **A:** click "Desfazer" in the toast, within 15 seconds. It shows "Aplicação desfeita." and the values go back to what they were.
8. **A:** apply a behavior that takes a student across a level (100 XP for level 2) and undo it: the level and the coins of the level bonus go back too.
9. **A:** on the class page, click "Histórico". Each student of an award has a row with the behavior, the values, the date and who applied it, and an undone award shows "Revertido".
10. **A:** apply a behavior again, let the toast go, and click "Histórico" on that student's row. Only that student is listed. Click "Reverter" and confirm: it shows "Lançamento revertido.", the row shows "Revertido" and the values on the class page go back, level bonus included.
11. **A:** remove that student from the class and open "Histórico" on the class page: their rows are still listed, without "Reverter".
12. **A:** on the class page, click "Consequências". The default consequences are listed. Create one, edit it and remove it.
13. **A:** create a behavior with `-50` in "HP" and apply it to a student. The row shows "Sem HP" and a "Sortear consequência" button.
14. **A:** click it, then "Sortear". The page shows the consequence drawn, and the class page shows that student with `HP 50/50`.
15. **A:** on the "Histórico" of that student, the draw is listed as "Consequência: ...", with `+50 HP` and without "Reverter".
16. **A:** remove every consequence and take a student to zero HP again. The draw page says that there's nothing to draw and links to the list.

## 9. Invite a student by email

Use a new private window for the invited student, since the invite signs them in.

1. **A:** on the class page, click "Convidar alunos", paste a line such as `Ana Souza, ana@example.com` and click "Enviar convites".
2. **A:** reload the class page. Ana is listed with "Convite pendente" and the email.
3. Open the invite email in Mailpit and open its link in the private window.
4. **Private window:** the page shows the generated username. Set a password, accept the terms and click "Criar senha".
5. **A:** reload the class page. Ana is now listed with the username.

## 10. Sign-in and password

- **Sign-in:** sign out and go to `/entrar`. A student signs in with either the email or the username, and a teacher with the email. A wrong password shows the same message as an unknown account.
- **Unverified email:** sign up without opening the link and try to sign in. It's rejected, Mailpit gets a new link and "Reenviar e-mail" appears below the form.
- **Resend the link:** after signing up (or the rejected sign-in above), "Reenviar e-mail" counts down 60 seconds before it can be clicked. Click it once it's enabled: Mailpit gets a new link and the countdown starts again. A pending student gets a new invite instead.
- **Password reset:** go to `/esqueci-a-senha`, click "Enviar link", open the link in Mailpit and set a new password.
- **Pending student:** request a password reset for a student who hasn't accepted their invite. Mailpit gets a new invite instead of a reset link.

## 11. Role areas

- **B:** open `/professor`. You're sent back to `/aluno`.
- **A:** open `/aluno`. You're sent back to `/professor`.
- **A:** open the address of a class created by another teacher. It shows a 404 page.
- Signed out, open `/professor` or `/aluno`. You're sent to `/entrar`.

## 12. Stop

Press `Ctrl+C` in the terminal to stop the app. The containers keep running; `pnpm services:stop` stops them and keeps the data, so the same accounts work next time.

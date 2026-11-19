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

The screens of a class update by themselves when XP, HP, coins, a power request or a reward order change, so the steps below only reload where something else changed (e.g. a new reward, a disabled power).

## 2. Create the accounts

To skip signing up by hand, the seed scripts create verified accounts and write their credentials to `seed-credentials.md` at the root of the repository (git-ignored). Every account shares the password shown in the file, and a student signs in with the username too. They only run against the local database:

- `pnpm db:seed`: two teachers and their classes, with students who already have a character, a behavior history, a student who leveled up and is in two classes, one without HP, one without a character, one removed, a pending invite (its link is in the file) and an archived class.
- `pnpm db:seed:users 1 4`: one teacher and four students, without classes (1 and 1 without arguments).
- `pnpm db:seed:class <teacher-email> 5`: a new class for that teacher with five new students, each with a character.
- `pnpm db:seed:awards <class-id> 10`: ten random behaviors awarded in the class (the class id is in the file and in the URL of the class page).
- `pnpm db:reset`: empties every table and removes the file.

To go through sign-up itself:

**Browser A, teacher:**

1. Go to `/cadastro`, choose "Sou professor", fill in the form and accept the terms. The password needs at least 8 characters.
2. Open the confirmation email in Mailpit and open its link in browser A. It signs you in and lands on `/professor`.

**Browser B, student:**

1. Go to `/cadastro`, choose "Sou aluno", fill in the form, including the username, and accept the terms.
2. Open the confirmation email in Mailpit and open its link in browser B. It signs you in and lands on `/aluno`.

"Continuar com o Google" only shows up when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (see [Google sign-in](../README.md#google-sign-in)).

## 3. Classes and join codes

1. **A:** click "Nova turma", create a class and copy the code under "Código da turma".
2. **B:** type the code under "Entrar em uma turma" and click "Entrar na turma". You land on the class page, at "Escolha seu personagem". Click "Voltar ao painel": the class shows up on `/aluno`, and its card opens the class page again.
3. **A:** reload the class page. The student is listed under "Alunos" with their username, a dashed frame instead of the avatar and "Sem personagem".
4. **A:** click "Editar", change the name and save. **B:** reload `/aluno` and check the new name.

## 4. Character

1. **B:** on the class page, pick a class, a body, a skin tone, a hair style and colors. The big preview changes with each choice, and picking another class moves "Cor da roupa" to the colors of that class.
2. **B:** click "Confirmar personagem". It shows "Personagem escolhido.", and "Classe" is gone from the form.
3. **B:** pick "Sem cabelo" ("Cor do cabelo" disappears), change other options and click "Salvar aparência". It shows "Aparência salva.", and a reload keeps the choices.
4. **A:** reload the class page. The student shows the avatar standing still, with the class below the name.
5. **A:** click "Trocar classe" and pick another class. The roster shows "Classe trocada para ..." and the new class. **B:** reload. The new class shows in the preview, with the first outfit color of that class and the rest of the appearance as it was.

## 5. Change or turn off the code

1. **A:** click "Gerar novo código" and confirm. **B:** the old code is now rejected, but the student stays in the class.
2. **A:** click "Desativar". **B:** the code gets the same error as an invalid one.
3. **A:** click "Ativar" to turn it back on.

## 6. Limit of wrong codes

1. **B:** under "Entrar em uma turma", try a code with 6 characters that doesn't exist (e.g. `222222`) 10 times. Each one shows the invalid code error on the field. A code of another length doesn't count.
2. **B:** try again, even with the right code. It shows "Muitas tentativas com códigos inválidos." and how many minutes are left, for up to 15 minutes.
3. In a private window, create another student account and join with the right code. The limit of one student doesn't affect another.

## 7. Remove a student

1. **A:** click "Remover" next to the student and confirm.
2. **B:** reload `/aluno`. The class is gone, and the account still works.
3. **B:** enter the current code again. The student comes back to the class.

## 8. Archive and restore a class

1. **A:** on the class page, click "Arquivar" and confirm. You land on the dashboard, without the class.
2. **B:** reload `/aluno`. The class is gone.
3. **A:** open the old address of the class. It shows a 404 page.
4. **A:** on the dashboard, click "Turmas arquivadas", then "Restaurar". You land on the dashboard, with the class back.
5. **A:** check that the students and the code are the same.
6. **B:** reload `/aluno`. The class is back.

To see the error of a failed restore, open `/professor/turmas/arquivadas` in two tabs of browser A and restore the class in the first one. In the second, click "Restaurar" too: it shows "Não encontramos essa turma."

## 9. Behaviors, consequences, powers, rewards and items

1. **A:** on the class page, click "Comportamentos". The default behaviors are listed under "Positivos" and "Negativos", each with what it gives or takes (e.g. "+10 XP, +5 moedas").
2. **A:** click "Novo comportamento", fill in "Nome", type `10` in "XP" and `-5` in "HP", and submit. "HP" shows that the values must be all positive or all negative. Clear "HP" and submit: the behavior shows up under "Positivos".
3. **A:** click "Editar" next to it, change the values and save. The list shows the new values.
4. **A:** click "Remover" next to it and confirm. It shows "Comportamento removido." and the behavior is gone.
5. **A:** create another class. It starts with the default behaviors, without the ones you changed in the first class.
6. **A:** on the page of a class with students, check "Selecionar todos" (or some of the students), click "Aplicar comportamento" and pick one. A toast confirms it, the selection clears and each student shows the new XP, HP and coins, with the values floating over the avatar ("+10 XP", the coins, "Nv. 2!" across a level), which plays its `cast` animation once. A behavior that takes HP floats "-5 HP" and plays `hurt`.
7. **A:** click "Desfazer" in the toast, within 15 seconds. It shows "Aplicação desfeita." and the values go back to what they were.
8. **A:** apply a behavior that takes a student across a level (100 XP for level 2) and undo it: the level and the coins of the level bonus go back too.
9. **A:** on the class page, click "Histórico". Each student of an award has a row with the behavior, the values, the date and who applied it, and an undone award shows "Revertido".
10. **A:** apply a behavior again, let the toast go, and click "Histórico" on that student's row. Only that student is listed. Click "Reverter" and confirm: it shows "Lançamento revertido.", the row shows "Revertido" and the values on the class page go back, level bonus included.
11. **A:** remove that student from the class and open "Histórico" on the class page: their rows are still listed, without "Reverter".
12. **A:** on the class page, click "Consequências". The default consequences are listed. Create one, edit it and remove it.
13. **A:** create a behavior with `-50` in "HP" and apply it to a student. The row shows "Sem HP" and a "Sortear consequência" button.
14. **A:** click it, then "Sortear". The names of the consequences go by, slowing down, and stop on the one drawn, which the page then shows. The class page shows that student with `HP 50/50`.
15. **A:** open the draw page of a student with HP in a second tab: it says there's nothing to draw. In the first tab, apply the `-50` HP behavior to that student. Without reloading, the second tab shows "Sortear".
16. **A:** on the "Histórico" of that student, the draw is listed as "Consequência: ...", with `+50 HP` and without "Reverter".
17. **A:** remove every consequence and take a student to zero HP again. The draw page says that there's nothing to draw and links to the list.
18. **A:** on the class page, click "Poderes". The default powers are listed under "Guerreiro", "Mago" and "Curandeiro", each with its cost and "A partir do nível ...".
19. **A:** click "Novo poder", pick the character class of student B, fill in "Nome", "Custo em moedas" and "Nível mínimo", and submit. Edit it and save: the list shows the new values.
20. **B:** reload the class page. "Poderes" lists the powers of the character's class only, with "Moedas disponíveis" above them. A power below the minimum level shows "Disponível a partir do nível ...", one the coins don't cover shows "Moedas insuficientes" and the others have a "Usar poder" button.
21. **A:** click "Desativar" next to a power. It shows "Desativado" and the button turns into "Reativar". **B:** reload: the power is gone. **A:** click "Reativar", and it's back for B.
22. **A:** click "Remover" next to a power and confirm. It shows "Poder removido." and the power is gone for both.
23. **A:** apply a behavior that gives coins to student B (e.g. "Ajudou um colega"). **B:** without reloading, click "Usar poder" on a power the coins cover. It shows "Pedido enviado. Aguarde a resposta do professor.", the power shows "Pedido pendente", "Pedidos pendentes" lists it and "Moedas disponíveis" goes down by its cost, while the class page of A still shows the same coins.
24. **B:** click "Cancelar pedido". The coins are available again. Request the power once more.
25. **A:** without reloading the class page, the "Pedidos" button shows the count of pending requests. Click it: the request is listed with the student, the power, the cost and the date. Click "Aprovar" and confirm: it shows "Pedido aprovado. As moedas foram descontadas.", the class page shows the coins of B down by the cost and "Histórico" lists "Poder: ..." without "Reverter".
26. **B:** request a power again. **A:** click "Recusar" on "Pedidos": it shows "Pedido recusado. As moedas reservadas foram liberadas." and the coins of B don't change.
27. **B:** request a power. **A:** remove B from the class: the request leaves "Pedidos", and if B comes back through the join code the coins aren't reserved anymore.
28. **A:** on the class page, click "Recompensas". The default rewards are listed with their price and stock ("Sem limite de estoque" when blank).
29. **A:** click "Nova recompensa", fill in "Nome", type `5` in "Preço em moedas" and `1` in "Estoque (opcional)", and submit. Edit it and save: the list shows the new values.
30. **B:** reload the class page. "Loja" lists the rewards, with "Moedas disponíveis" above them, which already leave out the coins reserved by pending power requests (a note says how many when there are any). A reward the coins don't cover shows "Moedas insuficientes" and the others have a "Comprar" button; the new one shows "Última unidade". **A:** the list shows "1 unidade em estoque".
31. **B:** with enough coins (apply "Ajudou um colega" from A), click "Comprar" on the new reward and confirm. It shows "Recompensa comprada. Aguarde o professor entregar.", the coins go down by the price right away, the reward shows "Esgotada" and "Meus pedidos" lists it as "Aguardando entrega".
32. **A:** without reloading the class page, the "Entregas" button shows the count of pending orders. Click it, then "Cancelar" next to the order and confirm "Cancelar pedido": it shows "Pedido cancelado. As moedas voltaram para o aluno.". **B:** without reloading, the coins are back, the order shows "Cancelado, moedas devolvidas" and the reward has its unit back.
33. **B:** buy the reward again. **A:** click "Entregar" on "Entregas": it shows "Recompensa entregue." and B's order shows "Entregue". "Histórico" lists "Compra de recompensa: ..." and "Reembolso de recompensa: ...", without "Reverter".
34. **B:** buy a reward. **A:** remove B from the class: the order stays on "Entregas" with "Saiu da turma", and can still be delivered or canceled.
35. **B:** with the character chosen, reload the class page. "Itens" lists every item with a still preview of the character wearing it, its price and "Moedas disponíveis" above them. "Chapéu de mago" shows "Só para Mago" for a character of another class, and "Coroa" shows "Disponível a partir do nível 3" below that level.
36. **B:** with enough coins, click "Comprar" on "Bandana" and confirm. It shows "Item comprado. Ele é seu em todas as turmas.", the coins go down by the price right away, with a spinning coin and the price floating over the avatar of "Seu progresso" and the row shows "Comprado" with an "Equipar" button. "Ver histórico" lists "Compra de item: Bandana". **A:** "Histórico" lists it too, without "Reverter".
37. **B:** click "Equipar". The row shows "Equipado", the button turns into "Desequipar" and the avatar of "Seu progresso" and of the character form wears the bandana. Buy and equip another head item ("Chapéu de mago" as a mage at level 2, or "Coroa" at level 3): it takes the place of the bandana, while "Óculos redondos" stays next to either.
38. **B:** join a second class of A and choose a character there. "Itens" shows the bandana as "Comprado", without a price, ready to equip.
39. **A:** with B a mage wearing "Chapéu de mago", click "Trocar classe" on the roster and pick another class. **B:** reload: the hat left the character and shows "Só para Mago", and the other equipped items stay.
40. **A:** on "Recompensas", click "Fechar loja de itens": it reads "Fechada" and the button turns into "Abrir loja de itens". **B:** reload: "Itens" says the shop is closed, lists only the items B owns and still puts them on and takes them off. The second class keeps its shop open.

## 10. Progress, history and ranking

1. **B:** open the class page. "Seu progresso" shows the character moving in place, the class, the level, the coins and the XP and HP bars. Before choosing a character it shows the same values without the avatar.
2. **A:** apply a behavior to B that crosses a level (e.g. 100 XP). **B:** without reloading, the level goes up and the coins include the level bonus. A "Subiu de nível!" banner shows the new level over the page for a moment, without taking the focus, and the avatar of "Seu progresso" floats the XP and the coins.
3. **B:** click "Ver histórico". "Seu histórico" lists the behavior with its values, the level bonus and the date, without who applied it. **A:** reverse it from "Histórico". **B:** without reloading, the entry shows "Revertido em ..." and the values go back on the class page.
4. **A:** on the class page, click "Ranking". The students are listed by XP, with the position, the avatar, the level and the username (or the email, for a pending student). Students with the same XP share the position.
5. **B:** the class page has no "Ranking". **A:** click "Mostrar aos alunos": it reads "Visível" and the button turns into "Ocultar dos alunos". **B:** reload: "Ranking" lists the classmates with name, level and XP only, and B's own row shows "Você".
6. **A:** click "Ocultar dos alunos". **B:** reload: "Ranking" is gone.
7. **A:** with the sound on, click anywhere on the class page and apply a behavior to every student: a single power-up sound plays, however many students there are. A behavior that takes HP plays a hit, one that crosses a level plays a fanfare, and the draw result plays a chime. **B:** after a click on the class page, an award from A plays the same sounds over "Seu progresso", a refund of a reward order ("Cancelar" on "Entregas") plays a coin sound and a purchase plays nothing.
8. **A:** click the speaker button next to "Sair": the icon shows it muted, and no sound plays. Reload: it stays muted. Click it again to turn the sound back on. **B:** the student's header has the same button, with its own choice per browser.
9. Turn on "Reduce motion" in the system (or emulate `prefers-reduced-motion: reduce` in the browser's DevTools) and repeat the award and a draw: the numbers and the banner fade in and out without moving, the avatar stands still and the draw shows the result straight away.

## 11. Invite a student by email

Use a new private window for the invited student, since the invite signs them in.

1. **A:** on the class page, click "Convidar alunos", paste a line such as `Ana Souza, ana@example.com` and click "Enviar convites".
2. **A:** reload the class page. Ana is listed with "Convite pendente" and the email.
3. Open the invite email in Mailpit and open its link in the private window.
4. **Private window:** the page shows the generated username. Set a password, accept the terms and click "Criar senha".
5. **A:** reload the class page. Ana is now listed with the username.

## 12. Sign-in and password

- **Sign-in:** sign out and go to `/entrar`. A student signs in with either the email or the username, and a teacher with the email. A wrong password shows the same message as an unknown account.
- **Unverified email:** sign up without opening the link and try to sign in. It's rejected, Mailpit gets a new link and "Reenviar e-mail" appears below the form.
- **Resend the link:** after signing up (or the rejected sign-in above), "Reenviar e-mail" counts down 60 seconds before it can be clicked. Click it once it's enabled: Mailpit gets a new link and the countdown starts again. A pending student gets a new invite instead.
- **Password reset:** go to `/esqueci-a-senha`, click "Enviar link", open the link in Mailpit and set a new password.
- **Pending student:** request a password reset for a student who hasn't accepted their invite. Mailpit gets a new invite instead of a reset link.

## 13. Role areas

- **B:** open `/professor`. You're sent back to `/aluno`.
- **A:** open `/aluno`. You're sent back to `/professor`.
- **A:** open the address of a class created by another teacher. It shows a 404 page.
- Signed out, open `/professor` or `/aluno`. You're sent to `/entrar`.

## 14. Credits

- Open `/creditos` (also linked from the "Arte" section of `/termos`). Under "Personagens", three characters, a warrior, a mage and a healer, breathe in their idle animation, and every LPC asset is listed below them with its authors, licenses and links. "Efeitos sonoros" credits jsfxr and the CC0 license of the sounds.
- Turn on reduced motion in the system (or emulate `prefers-reduced-motion` in the browser's dev tools) and reload. The three characters stand still.

## 15. Stop

Press `Ctrl+C` in the terminal to stop the app. The containers keep running; `pnpm services:stop` stops them and keeps the data, so the same accounts work next time.

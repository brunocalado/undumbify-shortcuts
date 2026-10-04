# Undumbify Shortcuts

O Foundry marca um atalho em conflito com um ⚠ e um tooltip nomeando uma ação — mas não o pacote que a registrou. Este módulo preenche essa lacuna, permite resolver conflitos sem sair da linha, e pode carregar seus controles entre clientes, mundos e sessões.

---

## Apontando o Culpado

Todo atalho que compartilha sua combinação com outra ação ganha uma linha destacada e um botão extra em sua linha de controle. Clique no botão e um painel se abre logo abaixo, listando cada ação concorrente junto com o **módulo, sistema ou núcleo (core)** que a registrou.

Esse nome do pacote é o ponto principal. "Copiar" no tooltip do Foundry pode ser de qualquer um entre trinta módulos; aqui ele é explicitado.

---

## Resolvendo no Lugar

Cada linha no painel carrega seus próprios controles:

- **→** muda para a categoria daquela ação, rola até ela e a destaca com um flash.
- **✎** transforma a linha em um editor. Pressione uma nova combinação e o módulo responde imediatamente — livre, ou já ocupada por uma lista nomeada de ações. Salve para aplicar.
- **🗑** remove o atalho, deixando a ação sem atribuição.
- **🔒** aparece no lugar quando o pacote travou aquele atalho. Atalhos travados ainda contam como conflitos, só não podem ser alterados.

O editor avalia a combinação candidata do mesmo jeito que o Foundry dispara os atalhos: mover uma ação para **Shift + Q** aparece como ocupado quando o Descer do core está em **Q**, porque o Descer também dispara com Shift pressionado.

Toda resolução é aplicada imediatamente dentro da própria janela Configurar Controles — o rótulo nativo da tecla é atualizado sem precisar reabrir a janela.

![Configurar Controles com um conflito expandido, nomeando as ações concorrentes e seus pacotes](controls-configuration.webp)

---

## Buscando por Combinação

Clique no campo **"Pressione uma combinação…"** na barra lateral e pressione qualquer combinação — `Alt+Left`, `Shift+C`, `Q`.

- O campo se preenche sozinho; você nunca digita texto nele.
- Toda ação vinculada àquela combinação é listada, cada uma com seu pacote.
- As linhas correspondentes na lista principal ficam destacadas e as demais ficam esmaecidas.
- **→** pula para qualquer resultado.
- Pressione `Esc` ou clique no **×** para limpar.

---

## Enquanto Edita um Atalho

Quando você usa o próprio botão ✎ do Foundry, pressione a combinação candidata e o módulo adiciona uma linha abaixo do campo nomeando as ações e pacotes que já a utilizam — o detalhe que o tooltip nativo deixa de fora. Salvar continua sendo responsabilidade do Foundry.

---

## As Contagens por Categoria e o Indicador de Conflitos

Cada categoria na barra lateral mostra um pequeno ícone de alerta e uma contagem de quantas de suas ações estão envolvidas em um conflito — uma forma rápida de saber onde olhar antes de abrir qualquer coisa.

Abaixo do campo de busca, um indicador mostra o total corrente de **combinações disputadas** — quantas combinações de teclas distintas têm mais de uma ação reivindicando-as. Clique nele para abrir a **Visão Geral de Conflitos**. Quando não há conflitos, o mesmo botão fica verde em vez de desaparecer.

A visão geral também é acessível pelo cabeçalho da janela e por **Configurações do Jogo** → **Configurações de Módulos** → **Undumbify Shortcuts**.

Quando o mundo inicia, um conflito que não existia da última vez é sinalizado sozinho — mas só um novo. Um conflito já sinalizado num início anterior, ou marcado pelo mestre como **Can Coexist**, fica quieto; ele continua contando no indicador até ser resolvido ou aceito.

- **O mestre** recebe a Visão Geral de Conflitos, já que resolver é trabalho do mestre e a Sincronização leva o resultado a todos.
- **Um jogador** recebe só uma notificação curta, e apenas para conflitos que as correções do mestre não alcançam: quando a Sincronização está desligada, ou quando o conflito envolve um atalho que o próprio jogador definiu.

Pode ser desligado por cliente em **Configurações do Jogo** → **Configurar Configurações** → **Alert on New Conflicts** (ligado por padrão — o nome da opção aparece em inglês, já que este módulo ainda não tem tradução própria para a interface).

---

## A Visão Geral de Conflitos: Resolvendo Conflitos

A Visão Geral de Conflitos lista cada tecla disputada como seu próprio grupo, com toda ação concorrente nomeada junto com o pacote que a registrou.

As ações são numeradas na ordem em que o Foundry as executa. Ao pressionar a tecla, o Foundry roda a primeira e só passa para a próxima se a primeira não "tomar" a tecla — então ou as duas disparam, ou só a primeira dispara sempre, ou cada uma age numa situação diferente. Só o último caso é inofensivo, e só você sabe qual deles é.

Cada grupo recebe a etiqueta **Foundry** quando uma das ações é um controle do core — o caso para o qual este módulo existe, como o Quickdraw e o Descer do core, ambos no **Q** — ou **Packages** quando só módulos ou o sistema estão envolvidos, que é onde ficam a maioria das sobreposições propositais, que dependem da situação.

Cada reivindicação carrega:

- **👑 Manter esta** — remove toda outra reivindicação *editável* naquela combinação em uma única etapa, após uma confirmação nomeando exatamente o que será removido e quais reivindicações travadas permanecerão. É a forma mais rápida de resolver um conflito quando você já sabe qual ação deve prevalecer.
- **✎ Rebindar** — o mesmo editor inline "pressione uma combinação" da janela Configurar Controles.
- **🗑 Limpar** — remove apenas aquela reivindicação.
- **→** — pula para a ação em Configurar Controles.
- **🔒** — aparece no lugar de Rebindar/Limpar quando o pacote travou aquele atalho. "Manter esta" ainda funciona mesmo quando a reivindicação sobrevivente está ela própria travada.

Cada grupo também tem **Can Coexist** (somente mestre). Ele move o grupo para uma seção recolhida **Ignored**, para todos os clientes: o conflito deixa de contar, de alertar e de destacar linhas em Configurar Controles. Um grupo **Foundry** pede confirmação antes, mostrando a ordem de execução. Se outra ação passar a usar aquela tecla depois, o conflito volta sozinho. **Restore** na seção Ignored desfaz.

Resolver o último conflito muda a janela para "No keybinding conflict needs attention," e o indicador da barra lateral acompanha.

![A Visão Geral de Conflitos listando várias combinações disputadas, cada uma com suas ações concorrentes](keybinding-conflicts-view.webp)

---

## Sincronização: Mantendo os Controles de Todos Iguais aos do Mestre

Um interruptor de **Sincronização** fica na barra de ferramentas da Visão Geral de Conflitos — o mestre o vê como um interruptor; todos os demais veem um status somente leitura, "Sincronização ligada/desligada". Vem **ligado** por padrão.

Enquanto ligado:

- Toda ação que você customiza como mestre é espelhada em todo outro cliente conectado automaticamente — resolver um conflito aqui, rebindar pelo próprio editor ✎ do Foundry, qualquer coisa que altere seu `core.keybindings`. Não há nada para clicar para enviar; o espelhamento em si é o objetivo.
- Só ações que **você de fato customizou** são espelhadas. Uma ação que você nunca tocou não faz parte da sincronização de forma alguma, então o atalho do próprio jogador para ela — incluindo um atalho de um módulo que você não tem instalado — permanece exatamente como ele configurou. É isso que permite que "o jogador tem um atalho que o mestre não tem, e vice-versa" seja verdade ao mesmo tempo que "todos seguem o mestre".
- Entrar no mundo verifica e sincroniza automaticamente também, então um jogador não precisa esperar o mestre mudar algo depois que ele se conecta — o estado mais recentemente publicado pelo mestre é aplicado na hora.
- Apenas usuários **atualmente conectados** são alcançados em um dado momento; um atalho é armazenado por navegador, então não existe um repositório mundial para gravar diretamente. Porém, o espelho em si fica armazenado com o mundo, então já está esperando por um jogador mesmo que o mestre esteja offline quando esse jogador entrar.
- Jogadores recebem uma notificação quando seus controles realmente mudam; nada acontece silenciosamente.

Desligar a Sincronização interrompe a propagação futura, mas não desfaz nada que já foi espelhado — cada cliente mantém o que tinha por último.

---

## Perfis de Controles

**Configurações do Jogo** → **Configurações de Módulos** → **Undumbify Shortcuts** → **Gerenciar Perfis** (somente mestre) armazena conjuntos completos de atalhos como perfis nomeados na própria pasta do módulo — `undumbify-shortcuts/storage/profiles.json` — em vez de em um único mundo ou navegador. Como esse arquivo vive junto com o módulo, o mesmo perfil acompanha o módulo em qualquer lugar onde ele esteja ativo.

O perfil atualmente em vigor é marcado como **Ativo**, com sua linha destacada, então nunca fica ambíguo qual é. No gerenciador:

- **Novo a Partir dos Meus Controles Atuais** (cabeçalho) captura os atalhos deste cliente em um perfil novo.
- **✓ Ativar** — pede confirmação e então torna aquele perfil o ativo do mundo, aplicando-o a este cliente imediatamente. Não existe mais uma ação separada de "enviar para todos": ativar um perfil é uma gravação em `core.keybindings` no próprio cliente do mestre, exatamente o que a **Sincronização** (acima) já observa — se a Sincronização estiver ligada, ativar já alcança todo cliente conectado por conta própria; se estiver desligada, fica só local. O diálogo de confirmação avisa qual caso se aplica antes de você confirmar. Um pequeno indicador de **Sincronização Ligada/Desligada** no cabeçalho lembra qual dos dois é o caso atual.
- **💾 Salvar** sobrescreve o perfil armazenado com os controles atuais deste cliente, após confirmação.
- **📥 Carregar** aplica o perfil apenas a este cliente, sem mudar qual perfil é o ativo do mundo e sem propagar pela Sincronização — útil para testar um perfil localmente antes de se comprometer com ele.
- **🗑 Excluir** — o perfil `Default` nunca pode ser excluído.
- **Exportar**/**Importar** movem um documento inteiro de perfis como um arquivo `.json`, independente do armazenamento persistente — útil para mover um conjunto de controles entre instalações manualmente.

Cada cliente controla se isso se aplica a ele: **Configurações do Jogo** → **Configurar Configurações** → **Auto-Apply Control Profile** (ligado por padrão — o nome da opção aparece em inglês, já que este módulo ainda não tem tradução própria para a interface). Um perfil é aplicado uma vez por revisão por cliente — editar seus próprios atalhos entre recarregamentos nunca é sobrescrito silenciosamente, a menos que o mestre salve uma nova revisão.

![O gerenciador de Perfis de Controles, listando vários perfis salvos com o ativo destacado](manage-profiles.webp)

O armazenamento persistente precisa estar ativo para que salvar funcione (`persistentStorage` no manifesto — vem ativado por padrão, mas é necessário reiniciar o mundo após instalar ou atualizar o módulo antes do primeiro salvamento).

---

## O Que Conta Como Conflito

Uma tecla à qual duas ou mais ações registradas através de `game.keybindings.register()` responderiam, avaliada pelas mesmas regras que o Foundry usa para disparar atalhos:

- Uma ação também dispara com qualquer um dos seus **modificadores reservados** pressionado. O Descer do core está no **Q** mas reserva o **Shift**, então uma ação em **Shift + Q** ainda colide com ele.
- Ações **só do mestre** nunca rodam no cliente de um jogador, então nunca geram conflito ali.
- Os atalhos **travados** do próprio Foundry — Escape, Delete e Ctrl + A/Z/X/C/V — ficam de fora. Pacotes estendem essas teclas de propósito, e o lado do core nunca pode ser alterado. O Foundry continua mostrando o próprio ⚠ na linha do outro pacote.

> Uma tecla compartilhada não é automaticamente um bug. Muitas ações só agem numa situação específica — no canvas, com um token selecionado, com a própria janela aberta — e deixam a tecla passar no resto do tempo. É para isso que serve o **Can Coexist**.

> O próprio aviso do Foundry também cobre atalhos do navegador, como `Ctrl+C`. Esse é um sistema separado; este módulo reporta apenas colisões Foundry-com-Foundry.

---

## Acesso

Nomear conflitos, buscar por combinação e resolver conflitos localmente funcionam para todo jogador e mestre igualmente — nenhuma permissão é exigida. Ligar/desligar a Sincronização e gerenciar perfis são exclusivos do mestre, já que ativar ou resolver algo pode mudar o que o cliente de outra pessoa faz.

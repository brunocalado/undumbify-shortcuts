# Undumbify Shortcuts

> **Pare de adivinhar qual módulo roubou seu atalho.** O Foundry avisa que um atalho está em conflito. O Undumbify Shortcuts diz *com o quê*, *de qual módulo*, e deixa você resolver na hora.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/mestredigital) [![More Modules](https://img.shields.io/badge/Foundry%20VTT-More%20Modules-red?style=for-the-badge&logo=gamepad)](https://mestredigital.online/pages/projetos-en)

---

## O que é o Undumbify Shortcuts?

A janela **Configurar Controles** do Foundry marca um atalho em conflito com um ⚠ e um tooltip do tipo *"Possível conflito com Copiar"*. Esse tooltip nomeia uma ação — mas não o módulo de onde ela veio. Com trinta módulos instalados, "Copiar" pode ser de qualquer um deles, e descobrir o verdadeiro culpado significa abrir cada categoria e ler cada linha manualmente.

O Undumbify Shortcuts preenche essa lacuna. Todo conflito mostra a **ação e o pacote por trás dela**, e todo conflito pode ser resolvido direto na linha que você já está olhando.

---

## ✨ Funcionalidades

- **Aponte o culpado** — expanda qualquer atalho em conflito para ver todas as outras ações naquela combinação, cada uma identificada com o módulo, sistema ou núcleo (core) que a registrou.
- **Rebind no lugar** — mude um atalho em conflito direto dentro do painel expandido. Sem precisar caçar em categorias, sem perder o lugar onde estava.
- **Veredito ao vivo enquanto digita** — pressione uma combinação candidata e receba uma resposta imediata: livre, ou já ocupada por uma lista nomeada de ações e pacotes.
- **Busca por combinação** — clique no campo da barra lateral e pressione qualquer combinação. Toda ação vinculada a ela é listada, as linhas correspondentes ficam destacadas e as demais ficam esmaecidas.
- **Vá direto para qualquer ação** — um clique muda para a categoria certa, rola até a ação e a destaca com um flash.
- **Contagem de conflitos por categoria** — a barra de navegação lateral mostra quantas ações em cada categoria precisam de atenção, e um total geral abre o resolvedor completo.
- **Visão Geral de Conflitos & resolvedor** — uma janela independente listando cada combinação disputada, quem está competindo por ela, e um botão **"Manter esta"** que remove todas as outras reivindicações em uma única etapa confirmada. Só avisa sobre conflitos novos: o mestre recebe a visão geral, o jogador só uma notificação para o que as correções do mestre não alcançam, e o mestre pode marcar uma sobreposição proposital como **Can Coexist** para todos.
- **Sincronização ao vivo, ligada por padrão** — enquanto ativa, todo cliente conectado espelha os atalhos que o mestre customizou explicitamente, automaticamente, a cada edição — ações que só um jogador customizou permanecem intocadas, então nada é sobrescrito silenciosamente.
- **Perfis de controles** — salve conjuntos de atalhos nomeados no armazenamento persistente do próprio módulo, para que ativar o módulo em *qualquer* mundo possa trazer seus controles junto. Ativar um perfil o aplica imediatamente, e alcança todo usuário conectado também, se a Sincronização estiver ligada.
- **Visual nativo** — construído inteiramente sobre os tokens de design do próprio Foundry, então segue o tema escolhido em vez de brigar com ele.

---

## 🛠️ Como Usar

### Dentro de Configurar Controles

1. Abra **Configurações do Jogo** → **Configurar Controles**.
2. Qualquer atalho que compartilhe uma combinação ganha um botão extra em sua linha. Clique nele.
3. O painel abaixo nomeia cada ação concorrente e o pacote ao qual pertence.
4. A partir desse painel:

   | Botão | O que faz |
   |---|---|
   | **→** | Muda para a categoria daquela ação e rola até ela |
   | **✎** | Rebinda direto ali — pressione uma nova combinação e salve |
   | **🗑** | Remove o atalho, deixando a ação sem atribuição |
   | **🔒** | Aparece no lugar quando o pacote travou aquele atalho |

5. Para caçar uma combinação específica, clique no campo **"Pressione uma combinação…"** na barra lateral e pressione-a. Pressione `Esc` para limpar.

![Configurar Controles com um conflito expandido, nomeando as ações concorrentes e seus pacotes](controls-configuration.webp)

### A Visão Geral de Conflitos

Clique no indicador abaixo do campo de busca da barra lateral (ou no controle do cabeçalho da janela) para abrir a **Visão Geral de Conflitos** — cada combinação disputada como seu próprio grupo, com **Manter esta**, **Rebindar**, **Limpar** e **Ir até ela** para cada reivindicação. Sua barra de ferramentas traz um interruptor de **Sincronização** (ligado por padrão): enquanto ligado, toda ação que o mestre customiza — aqui ou em qualquer outro lugar — se espelha em todo cliente conectado automaticamente, sem nenhum botão para clicar. O mestre vê como um interruptor; todos os demais veem um status somente leitura. Também é acessível por **Configurações do Jogo** → **Configurações de Módulos** → **Undumbify Shortcuts**.

![A Visão Geral de Conflitos listando várias combinações disputadas, cada uma com suas ações concorrentes](keybinding-conflicts-view.webp)

### Perfis de Controles

**Configurações do Jogo** → **Configurações de Módulos** → **Undumbify Shortcuts** → **Gerenciar Perfis** (somente mestre) salva conjuntos completos de atalhos na própria pasta do módulo, para que viajem com o módulo entre mundos. Ativar um perfil o aplica a você imediatamente (e, se a Sincronização estiver ligada, a todos os conectados agora), e todo cliente que optar por isso (ligado por padrão, por cliente) o recebe automaticamente na próxima vez que se conectar — ativar o módulo já é suficiente para trazer os controles compartilhados junto.

![O gerenciador de Perfis de Controles, listando vários perfis salvos com o ativo destacado](manage-profiles.webp)

---

## ⚠️ O Que Conta Como Conflito?

Uma tecla à qual duas ou mais ações registradas através de `game.keybindings.register()` responderiam, avaliada **do jeito que o Foundry dispara os atalhos**: modificadores reservados contam (uma ação em Shift + Q colide com o Descer do core no Q), ações só do mestre ficam de fora no cliente do jogador, e os atalhos travados do próprio Foundry (Escape, Delete, Ctrl + A/Z/X/C/V) ficam de fora sempre. A visão geral mostra as ações na ordem em que o Foundry as executa.

> **Uma combinação compartilhada não é automaticamente um bug.** Atalhos só disparam no contexto para o qual foram registrados — no canvas, dentro de um editor de texto, durante o combate. Duas ações podem compartilhar uma combinação e nunca colidir na prática. O módulo avisa isso dentro da própria janela, e o aviso pode ser dispensado permanentemente.

> O próprio aviso *"Possível conflito com Copiar"* do Foundry também cobre atalhos do navegador, como `Ctrl+C`. Esse é um sistema separado; este módulo reporta apenas colisões Foundry-com-Foundry.

---

## 📦 Instalação

1. Abra o Foundry VTT e vá em **Módulos Adicionais**.
2. Clique em **Instalar Módulo**.
3. Cole a seguinte URL de manifesto no campo **URL do Manifesto**, na parte de baixo:

```
https://raw.githubusercontent.com/brunocalado/undumbify-shortcuts/main/module.json
```

4. Clique em **Instalar** e depois ative o módulo no seu mundo.

---

## 🧩 Compatibilidade

| Propriedade | Valor |
|---|---|
| Foundry VTT | V14 |
| Sistemas de jogo | Todos — agnóstico de sistema |
| Dependências | Nenhuma |
| Permissões | Nomear conflitos, buscar e resolvê-los localmente não exigem nenhuma. Ligar/desligar a Sincronização e gerenciar perfis são exclusivos do mestre. |

---

## 🐛 Relatar Bugs & Sugerir Funcionalidades

Encontrou um bug ou tem uma ideia para uma nova funcionalidade? Abra uma issue no GitHub:

👉 https://github.com/brunocalado/undumbify-shortcuts/issues

---

## Créditos e Licença

Este módulo é distribuído sob a [GNU General Public License v3](LICENSE).

Este módulo é um fork de [controls-config-conflict-resolver](https://github.com/jacksands/controls-config-conflict-resolver), de Jack Sands. Obrigado pelo trabalho original que tornou isso possível.

* (donkey)[https://publicdomainvectors.org/en/free-clipart/Outlined-donkey-toy/82208.html]

O módulo foi reconstruído para o Foundry VTT v14 em vez de simplesmente portado. O código original localizava linhas comparando o texto traduzido dos rótulos e adivinhando seletores; agora ele lê a estrutura que o próprio ControlsConfig renderiza — `data-action-id` e `data-binding-id` — e formata cada combinação através do próprio `ControlsConfig.humanizeBinding()` do Foundry, de modo que os rótulos sempre correspondam à lista nativa. As duas janelas foram reescritas como classes `ApplicationV2` com partes em Handlebars, substituindo strings HTML montadas à mão e as gambiarras de layout que vinham junto. Os temas de cores empacotados e suas paletas fixas foram descartados em favor de um único design construído sobre os próprios tokens de tema do Foundry. Dois bugs de correção foram corrigidos ao longo do caminho: atalhos travados por pacote estavam sendo oferecidos como editáveis, e salvar uma edição inline gravava os atalhos travados do núcleo de volta nas customizações do usuário.

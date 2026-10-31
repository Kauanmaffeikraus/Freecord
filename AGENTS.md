# 🤖 AGENTS.md — Diretrizes Oficiais para IAs e Desenvolvedores no Freecord PTB
**Versão das Diretrizes:** 2.0.0  
**Escopo:** Assistentes de IA (Antigravity, Claude Code, Cursor, Copilot, Codex, Aider) e Contribuidores Humanos.  
**Repositório:** [Freecord (v1.5.1+)](https://github.com/Kauanmaffeikraus/Freecord)  

---

## 🧭 1. Visão Geral e Filosofia Imutável (Core Philosophy)

O **Freecord PTB** é uma plataforma de comunicação moderna inspirada visualmente no Discord PTB, com uma regra fundamental e inegociável: **100% SERVERLESS, LOCAL-FIRST E DESCENTRALIZADO (P2P)**.

### 🚫 Princípios Intocáveis (Linhas Vermelhas da IA)
1. **ZERO SERVIDORES CENTRAIS:** Nunca sugira, introduza ou configure bancos de dados em nuvem (Firebase, Supabase, AWS, MongoDB Atlas) ou servidores corporativos de mídia/sinalização (SFUs proprietárias). Toda a comunicação ocorre via **UDP Multicast LAN, TCP Sockets locais e WebRTC P2P direto**.
2. **ZERO TELEMETRIA & PRIVACIDADE ABSOLUTA:** Nenhum dado de telemetria, IP, hábito de uso ou áudio pode ser enviado para servidores externos.
3. **IDENTIDADE SOBERANA:** Não existem "contas" nem login com e-mail/senha. Cada dispositivo gera e custodia seu par de chaves criptográficas (`Ed25519` / `ECDH P-256`) localmente.
4. **LOCAL-FIRST TOTAL:** O software deve ser plenamente funcional em rede local (LAN/Wi-Fi) mesmo se a conexão com a internet global cair por completo.
5. **PARIDADE MULTIPLATAFORMA:** O código deve preservar o funcionamento simétrico tanto no **Electron Desktop (Windows/Linux)** quanto no **Android Capacitor WebView**. Nunca aplique uma alteração no Desktop que quebre o cliente Android, e vice-versa.

---

## 📜 2. Regras de Negócio e Engenharia de Software

Toda IA que for escrever, refatorar ou auditar código no Freecord **DEVE** seguir estritamente as regras de engenharia abaixo:

### 2.1 Malha P2P e Prevenção de Loops (Broadcast Storm)
- **Deduplicação Obrigatória:** Todo pacote emitido na rede mesh DEVE conter um identificador determinístico (`dedupId` ou `message.id`).
- Antes de retransmitir qualquer pacote recebido (`broadcast` ou relay), o nó **DEVE** verificar `isDuplicatePacket(packet, senderId)`. Pacotes já vistos nos últimos minutos DEVEM ser descartados silenciosamente para evitar tempestades de broadcast (`Broadcast Storm`).
- **Tie-Breaker Determinístico:** Em conexões simultâneas (Cross-Dialing quando dois nós se discam ao mesmo tempo), utilize sempre a regra do `peerId`: o nó com menor `peerId` léxico assume o papel de cliente (mantém o socket de saída); o nó com maior `peerId` assume o papel de servidor (mantém o socket de entrada).

### 2.2 Criptografia Ponta a Ponta (E2EE) Genuína
- Nunca use derivação de chaves baseada apenas em dados públicos (`channelId` + chave pública). Isso é criptografia falsa.
- A derivação de segredo compartilhado para DMs **DEVE** utilizar **Diffie-Hellman real (ECDH P-256 ou X25519)** via Web Crypto API nativa (`window.crypto.subtle.deriveBits`), envolvendo a chave privada local.
- **Mascaramento de Rede:** Ao enviar mensagens criptografadas (`CHAT_MESSAGE`), o campo `text` do pacote na rede DEVE conter uma máscara genérica como `"🔒 [Mensagem Criptografada]"`, nunca o texto em claro original.

### 2.3 Sincronização e Sigilo de Histórico (History Sync)
- **Proibição de Vazamento de DMs:** No processamento de `HISTORY_SYNC_REQUEST`, NUNCA inclua DMs de terceiros (`dm_Alice__Bob`) na lista de canais autorizados para um solicitante estranho (`Charlie`). Apenas canais de servidores compartilhados e a DM exclusiva entre o usuário local e o peer solicitante podem ser sincronizados.
- **Silenciamento em Sync:** Sincronizações de histórico (`HISTORY_SYNC_RESPONSE`) jamais devem disparar alertas sonoros ou bipes de notificação na interface gráfica.

### 2.4 Persistência de Dados e Limites de Armazenamento
- O `localStorage` possui limite rígido de **5 MB**. Nunca armazene histórico infinito de mensagens, imagens em base64 ou áudios brutos diretamente no `localStorage`.
- No **Desktop Electron**, persista históricos de mensagens e arquivos em disco (`app.getPath("userData")`) usando arquivos JSON/JSONL ou banco embutido SQLite via IPC.
- No **Android/Web**, utilize **IndexedDB** (`Dexie.js` ou API nativa) para suportar gigabytes de dados offline.
- Blocos `try/catch` que lidam com escrita em disco **NUNCA** devem ser engolidos silenciosamente; utilize logs de advertência (`console.warn`) ou fallbacks estruturados.

### 2.5 Fragmentação de Arquivos WebRTC (Chunking)
- A especificação SCTP do `RTCDataChannel` suporta pacotes individuais de no máximo 64 KB a 256 KB.
- Qualquer envio de arquivos (imagens, áudios, anexos) maiores que 32 KB **DEVE** ser fragmentado em chunks binários (`FILE_TRANSFER_START` ➔ sequência de `FILE_TRANSFER_CHUNK` de 32 KB ➔ `FILE_TRANSFER_COMPLETE`). Nunca passe strings base64 gigantes diretamente para `dataChannel.send()`.

---

## 🛠️ 3. Como a IA Deve se Comportar ao Modificar o Projeto

1. **Investigar Antes de Alterar:**
   - Leia os arquivos correlatos antes de propor mudanças. Entenda se o código roda no processo Main do Electron (`electron/`), no Preload (`electron/preload.cjs`), no motor WebRTC (`src/services/`) ou no React (`src/App.jsx`).
2. **Compilação e Verificação Obrigatória (Quality Gate):**
   - Antes de considerar qualquer tarefa finalizada, a IA **DEVE** executar:
     ```bash
     npm run build
     ```
   - No caso de modificações nos arquivos Node.js do Electron (`electron/*.cjs`), execute a checagem sintática:
     ```bash
     node --check electron/main.cjs
     node --check electron/p2pNode.cjs
     ```
   - Nenhuma entrega com erros de compilação ou de sintaxe é aceitável.
3. **Preservação de Estilos e Layout:**
   - Mantenha a estética refinada do Discord PTB: tema escuro `#1e1f22`, `#2b2d31`, `#313338`, `#5865f2`, fontes legíveis, transições suaves, estados de foco e responsividade fluida para mobile.
4. **Desacoplamento e Performance do React 18:**
   - O arquivo `src/App.jsx` é volumoso. Evite adicionar estados globais desnecessários que forcem re-renders descontrolados da árvore inteira.
   - Para checagens rápidas de duplicatas ou controle de temporizadores, prefira `useRef` síncrono a `useState`.
   - Sempre que criar novas funcionalidades grandes, isole-as em componentes dedicados em `src/components/`.

---

## 📦 4. Convenção de Commits e Branches (Strict English & Best Practices)

Tanto os **commits** quanto os **nomes de branches** **DEVEM SER OBRIGATORIAMENTE EM INGLÊS**, seguindo rigorosamente a especificação do [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) e o padrão Git-Flow simplificado. Nenhum commit ou branch em português é permitido no repositório.

### 4.1 Nomenclatura Padrão de Branches:
Toda nova branch de trabalho DEVE ser criada a partir de `main` (ou branch de desenvolvimento ativa) utilizando o formato em minúsculas e hifens (`kebab-case`):

```text
<tipo>/<descrição-em-ingles-kebab-case>
```

#### Tipos Permitidos de Branch:
- `feat/`: Novas funcionalidades (ex: `feat/markdown-spoilers`, `feat/push-to-talk`, `feat/soundboard-p2p`)
- `fix/`: Correções de bugs (ex: `fix/broadcast-storm-loop`, `fix/dm-history-leak`, `fix/datachannel-chunking`)
- `refactor/`: Refatorações e limpezas arquiteturais (ex: `refactor/modularize-app-chat`, `refactor/p2p-tiebreaker`)
- `perf/`: Otimizações de desempenho e memória (ex: `perf/throttle-jpeg-relay`, `perf/vad-rerender-optimization`)
- `docs/`: Melhorias de documentação (ex: `docs/architecture-c4-diagram`, `docs/update-agent-guidelines`)
- `test/`: Adição ou correção de testes automatizados (ex: `test/p2p-dedup-suite`)
- `chore/`: Atualizações de dependências e tooling (ex: `chore/bump-vite-electron`, `chore/clean-gitignore`)

🚫 **Proibido em Branches:** `feat/nova-tela`, `correcao-bug`, `arrumando_coisas`, `teste`, `branch_kauan`.

---

### 4.2 Formato Obrigatório de Commits:
Todo commit DEVE ser redigido em inglês, no modo imperativo e conciso:

```text
<type>(<scope>): <clear, concise imperative description in English>

[optional body in English detailing technical motivation and changes]

[optional footer with issue references or breaking changes]
```

### Tipos Permitidos:
- **`feat`**: New user-facing feature or protocol enhancement.
- **`fix`**: Bug fix in mesh, UI, crypto, or voice engine.
- **`refactor`**: Code reorganization that neither fixes a bug nor adds a feature.
- **`perf`**: Performance, bandwidth, CPU, or memory optimization.
- **`docs`**: Documentation updates only (README, AGENTS.md, etc.).
- **`style`**: Formatting, white-space, semicolon fixes (no logic change).
- **`test`**: Adding or correcting unit/integration tests.
- **`build`**: Build system, vite, electron-builder, dependencies.
- **`ci`**: GitHub Actions workflows (`.github/workflows/`).
- **`chore`**: Maintenance, repo hygiene, `.gitignore` updates.

### Escopos Comuns do Freecord:
`p2p`, `voice`, `chat`, `crypto`, `electron`, `android`, `ui`, `webrtc`, `storage`, `settings`.

### Exemplos Válidos (Always in English):
```text
feat(chat): add full discord-flavored markdown parser with spoilers
fix(p2p): eliminate broadcast storm loop using deterministic dedupId
fix(crypto): prevent private DM history leak in HISTORY_SYNC_REQUEST
perf(voice): throttle JPEG canvas frame relay when native WebRTC is active
refactor(storage): migrate message persistence from localStorage to IndexedDB
docs(roadmap): update architectural parity analysis against Discord PTB
chore(git): ignore third-party test loaders and editor artifacts in gitignore
```

🚫 **Exemplos Inválidos (NUNCA FAÇA):**
- `arrumei o bug do chat` ❌ *(em português)*
- `fixed stuff` ❌ *(vago e sem escopo)*
- `Update App.jsx` ❌ *(genérico)*
- `feat: Adicionado suporte a markdown` ❌ *(misto/português)*

---

## 🗂️ 5. Estrutura de Arquivos e Mapa de Responsabilidades

```text
Freecord/
├── .github/
│   └── workflows/
│       └── build-and-release.yml    # CI/CD multiplataforma (Windows, Linux, APK)
├── android/                         # Projeto nativo Android Capacitor
│   └── app/src/main/java/           # Serviços de captura de tela e PiP nativo
├── electron/                        # Processo Principal do Electron (Node.js)
│   ├── main.cjs                     # Ciclo de vida da janela, IPC, Tray e capturas
│   ├── p2pNode.cjs                  # Nó de rede: UDP discovery, TCP mesh, routing
│   └── preload.cjs                  # ContextBridge seguro (expõe DiscordNative)
├── src/                             # Interface Gráfica (React 18 + Vite)
│   ├── services/
│   │   ├── p2pPhase1CryptoAndQr.js  # Identidade criptográfica, assinaturas e QR
│   │   └── webrtcVoiceEngine.js     # WebRTC, WebAudio DSP, streaming e mixers
│   ├── App.jsx                      # Componente de aplicação principal
│   ├── main.jsx                     # Entrypoint do React
│   └── styles.css                   # Folha de estilos completa do Discord PTB
├── public/                          # Ativos estáticos e ícones
├── AGENTS.md                        # ESTE ARQUIVO (Guia mestre de IAs e devs)
├── ANALISE_DISCORD_VS_FREECORD.md   # Mapeamento técnico detalhado vs Discord oficial
├── RELATORIO_BUGS_E_AUDITORIA.md    # Registro detalhado de auditoria e correção de bugs
└── package.json                     # Scripts, dependências e metadados do projeto
```

---

## 🔄 6. Protocolo de Mensageria P2P (Tipos de Pacotes Padrão)

Todo pacote trafegado entre os nós possui o seguinte formato básico:
```typescript
interface P2PPacket {
  type: string;             // Nome do comando (UPPERCASE)
  fromPeerId: string;       // Identificador único do remetente
  targetPeerId?: string;    // Destinatário específico (omitido em broadcasts)
  dedupId?: string;         // Identificador único para evitar loops em malha
  timestamp?: number;       // Unix timestamp em milissegundos
  [payloadKey: string]: any;
}
```

### Pacotes Essenciais:
- **`HELLO` / `HELLO_ACK`**: Handshake de identificação, perfil e portas de escuta.
- **`PING` / `PONG`**: Batimento cardíaco e cálculo de latência (RTT) entre peers.
- **`PEER_EXCHANGE`**: Compartilhamento de nós conhecidos na malha (Gossip discovery).
- **`ROOM_SYNC`**: Sincronização da estrutura de canais e servidores virtuais.
- **`CHAT_MESSAGE`**: Mensagem de texto/anexo enviada em canal ou DM.
- **`CHAT_EDIT` / `CHAT_DELETE`**: Edição ou remoção criptograficamente assinada.
- **`TYPING_STATE`**: Indicador de usuário digitando no canal.
- **`CHAT_REACTION`**: Adição ou remoção de emoji em mensagem.
- **`VOICE_STATE`**: Status de microfone mudo, fone ensurdecido, câmera e stream.
- **`VOICE_SPEAKING`**: Indicador de voz ativa (VAD) para acender o círculo verde.
- **`WEBRTC_SIGNAL`**: Oferta (SDP offer), resposta (SDP answer) e candidatos ICE.
- **`HISTORY_SYNC_REQUEST` / `HISTORY_SYNC_RESPONSE`**: Sincronização offline de chat.

---

## 📋 7. Checklist Obrigatório Pré-Finalização de Qualquer Tarefa

Antes de declarar qualquer modificação ou tarefa concluída, a IA **DEVE** validar os seguintes itens:

- [ ] **1. Build Limpo:** `npm run build` executou com sucesso sem erros de bundle.
- [ ] **2. Checagem Sintática:** `node --check` passou sem falhas em arquivos CJS do Electron.
- [ ] **3. Sem Regressão Serverless:** Nenhuma chamada a servidores externos ou APIs centralizadas foi adicionada.
- [ ] **4. Deduplicação Ativa:** Todo novo pacote emitido gera `dedupId` e passa por deduplicação.
- [ ] **5. Sem Vazamento de Dados:** Nenhuma informação privada (DMs, chaves privadas) trafega em broadcast.
- [ ] **6. Preservação de Documentação:** Comentários úteis e documentações existentes foram preservados.
- [ ] **7. Git Limpo:** Nenhum arquivo temporário, build quebrado ou segredo foi deixado na árvore de trabalho.

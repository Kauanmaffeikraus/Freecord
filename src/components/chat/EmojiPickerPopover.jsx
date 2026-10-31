import React, { useState, useMemo, memo } from "react";
import { Search, X, Smile, ThumbsUp, Heart, Flame, Gamepad2, Sparkles } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Rostos & Emoções",
    icon: Smile,
    emojis: [
      { char: "😀", name: "sorriso feliz grito" },
      { char: "😃", name: "sorrindo aberto feliz" },
      { char: "😄", name: "rindo olhos fechados feliz" },
      { char: "😁", name: "sorriso radiante dentes" },
      { char: "😆", name: "gargalhada rindo muito" },
      { char: "😅", name: "suor frio aliviado rindo" },
      { char: "😂", name: "chorando de rir risada lol haha" },
      { char: "🤣", name: "rolando no chao rindo rofl lol" },
      { char: "🥲", name: "sorriso com lagrima emocionado" },
      { char: "😊", name: "sorriso timido bochechas" },
      { char: "😇", name: "anjo aureola santo inocente" },
      { char: "🙂", name: "sorriso leve ok simpatico" },
      { char: "🙃", name: "invertido sarcasmo ironia" },
      { char: "😉", name: "piscadela piscando cumplicidade" },
      { char: "😌", name: "aliviado paz tranquilo" },
      { char: "😍", name: "apaixonado coracoes olhos amor" },
      { char: "🥰", name: "carinhoso coracoes fofo" },
      { char: "😘", name: "beijo piscando amor" },
      { char: "😗", name: "beijo assobio carinho" },
      { char: "😋", name: "delicia gostoso lambendo sabor" },
      { char: "😛", name: "lingua brincadeira zoacao" },
      { char: "😜", name: "lingua piscando doido loucura" },
      { char: "🤪", name: "maluco pirado doido zoeira" },
      { char: "😝", name: "olhos fechados lingua riso" },
      { char: "🤑", name: "dinheiro rico cifrao grana" },
      { char: "🤗", name: "abraco abracando carinho" },
      { char: "🤭", name: "mao na boca risinho opa" },
      { char: "🤫", name: "silencio calado segredo shh" },
      { char: "🤔", name: "pensando pensativo duvida hmm" },
      { char: "🤐", name: "boca fechada ziper segredo" },
      { char: "🤨", name: "sobrancelha desconfiado duvida" },
      { char: "😐", name: "neutro serio poker face" },
      { char: "😑", name: "inexpressivo sem graca cansado" },
      { char: "😶", name: "sem boca calado chocado" },
      { char: "😏", name: "sorriso de lado convencido maroto" },
      { char: "😒", name: "desgosto desapontado saco cheio" },
      { char: "🙄", name: "olhos revirando saco cheio af" },
      { char: "😬", name: "careta tenso constrangido eita" },
      { char: "🤥", name: "mentiroso nariz pinocchio" },
      { char: "😔", name: "triste chateado cabisbaixo" },
      { char: "😪", name: "sono cansado dormindo" },
      { char: "🤤", name: "babando vontade delicia" },
      { char: "😴", name: "dormindo sono zzz" },
      { char: "😷", name: "mascara doente protecao virus" },
      { char: "🤒", name: "termometro febre doente" },
      { char: "🤕", name: "curativo machucado dor" },
      { char: "🤢", name: "enjoado nauseas eca" },
      { char: "🤮", name: "vomitando nojo" },
      { char: "🤧", name: "espirrando resfriado lenco" },
      { char: "🥵", name: "calor quente suando abafado" },
      { char: "🥶", name: "frio gelado congelando" },
      { char: "🥴", name: "tonto bebado meio estranho" },
      { char: "😵", name: "tonto confuso morto" },
      { char: "🤯", name: "mente explodindo choque mind blown" },
      { char: "🤠", name: "cowboy vaqueiro chapeu" },
      { char: "🥳", name: "festa comemoracao aniversario parabens" },
      { char: "😎", name: "oculos escuros legal boss foda estilo" },
      { char: "🤓", name: "nerd estudioso oculos inteligente" },
      { char: "🧐", name: "monoculo elegante investigando" },
      { char: "🥺", name: "olhos pidões por favor fofo mendigando" },
      { char: "😦", name: "boca aberta surpreso o que" },
      { char: "😨", name: "assustado medo pavor" },
      { char: "😰", name: "ansioso suor nervoso tenso" },
      { char: "😥", name: "alivio triste suor" },
      { char: "😢", name: "choro triste lagrima" },
      { char: "😭", name: "chorando rios pranto luto" },
      { char: "😱", name: "grito panico choque medo scream" },
      { char: "😖", name: "frustrado bravo chateado" },
      { char: "😣", name: "aguentando dor persistente" },
      { char: "😞", name: "desapontado desanimado bad" },
      { char: "😓", name: "suor frio preocupado tenso" },
      { char: "😩", name: "exausto cansado cansei" },
      { char: "😫", name: "cansadissimo sem forcas" },
      { char: "🥱", name: "bocejo sono tedio preguica" },
      { char: "😤", name: "triunfo bravo fumaca nariz" },
      { char: "😡", name: "furioso bravo raiva puto" },
      { char: "😠", name: "irritado emburrado" },
      { char: "🤬", name: "xingamento palavrao furioso puto" },
      { char: "😈", name: "chifrinho diabo sorriso travesso" },
      { char: "👿", name: "diabo bravo malvado" },
      { char: "💀", name: "caveira morto skull ded morri" },
      { char: "☠️", name: "pirata caveira ossos perigo" },
      { char: "💩", name: "coco bosta poop divertido" },
      { char: "🤡", name: "palhaco clown bobo zoeira" },
      { char: "👻", name: "fantasma ghost susto bu" },
      { char: "👽", name: "alien extraterrestre ovni" },
      { char: "👾", name: "monstro espaco pixel retro game arcade" },
      { char: "🤖", name: "robo bot tecnologia ai ia" },
    ],
  },
  {
    id: "gestures",
    name: "Gestos & Pessoas",
    icon: ThumbsUp,
    emojis: [
      { char: "👍", name: "positivo like joinha beleza ok aprovar" },
      { char: "👎", name: "negativo dislike ruim reprovar" },
      { char: "👏", name: "palmas aplausos parabens bravo" },
      { char: "🙌", name: "maos para o alto celebracao amem viva" },
      { char: "👐", name: "maos abertas acolhimento" },
      { char: "🤝", name: "aperto de mao acordo parceria fechado" },
      { char: "🙏", name: "reza oracao por favor obrigado amem gratidao" },
      { char: "✌️", name: "paz e amor vitoria dois v" },
      { char: "🤞", name: "figas sorte torcendo tomara" },
      { char: "🤟", name: "te amo love rock metal" },
      { char: "🤘", name: "rock metal chifres guitarra" },
      { char: "🤙", name: "shaka hang loose liga nois tranquilo" },
      { char: "👈", name: "apontando esquerda ali" },
      { char: "👉", name: "apontando direita la" },
      { char: "👆", name: "apontando cima veja aqui" },
      { char: "👇", name: "apontando baixo olha" },
      { char: "👋", name: "aceno tchau oi ola hello bye" },
      { char: "✋", name: "pare mao aberta alto stop" },
      { char: "🖐️", name: "cinco espalmada" },
      { char: "🖖", name: "vulcano spock vida longa prospera" },
      { char: "👌", name: "ok perfeito certinho show top" },
      { char: "🤌", name: "italiano o que voce quer como assim ma" },
      { char: "🤏", name: "pouquinho pouco falta pouco" },
      { char: "✊", name: "punho cerrado forca luta resistencia" },
      { char: "👊", name: "soco toque brofist parceria" },
      { char: "🤛", name: "toca aqui esquerda" },
      { char: "🤜", name: "toca aqui direita" },
      { char: "💪", name: "musculo forca forte academia treino" },
      { char: "✍️", name: "escrevendo anotei assinado caneta" },
      { char: "👀", name: "olhos de olho olhada curioso vejo" },
      { char: "🧠", name: "cerebro mente inteligencia pensar big brain" },
    ],
  },
  {
    id: "reactions",
    name: "Corações & Especiais",
    icon: Heart,
    emojis: [
      { char: "❤️", name: "coracao vermelho amor love paixao" },
      { char: "🧡", name: "coracao laranja carinho" },
      { char: "💛", name: "coracao amarelo amizade luz" },
      { char: "💚", name: "coracao verde esperanca natureza" },
      { char: "💙", name: "coracao azul confianca freecord" },
      { char: "💜", name: "coracao roxo misterio estilo" },
      { char: "🖤", name: "coracao preto trevas dark gótico" },
      { char: "🤍", name: "coracao branco pureza paz" },
      { char: "🤎", name: "coracao marrom chocolate" },
      { char: "💔", name: "coracao quebrado dor termino bad desilusao" },
      { char: "❣️", name: "ponto de exclamacao coracao amor" },
      { char: "💕", name: "dois coracoes amor flutuante" },
      { char: "💞", name: "coracoes girando paixao" },
      { char: "💓", name: "coracao batendo palpitando pulso" },
      { char: "💗", name: "coracao crescendo amor carinho" },
      { char: "💖", name: "coracao brilhando brilho especial fofo" },
      { char: "💘", name: "cupido flecha flechado amor" },
      { char: "💝", name: "presente lacinho coracao carinho" },
    ],
  },
  {
    id: "gaming",
    name: "Games & Objetos",
    icon: Gamepad2,
    emojis: [
      { char: "🎮", name: "videogame controle gamer jogando game play" },
      { char: "🕹️", name: "joystick arcade retro fliperama" },
      { char: "🎲", name: "dado jogo sorte rpg tabuleiro" },
      { char: "🎯", name: "alvo certeiro foco acertou" },
      { char: "🏆", name: "trofeu campeao vitoria vencedor ouro" },
      { char: "🥇", name: "medalha ouro primeiro lugar top" },
      { char: "🥈", name: "medalha prata segundo lugar" },
      { char: "🥉", name: "medalha bronze terceiro lugar" },
      { char: "👑", name: "coroa rei rainha realeza dono boss" },
      { char: "⚔️", name: "espadas batalha combate pvp x1 duelo" },
      { char: "🛡️", name: "escudo defesa protecao tank" },
      { char: "🏹", name: "arco flecha ranger arqueiro" },
      { char: "💣", name: "bomba explosao c4 defuse" },
      { char: "💥", name: "colisao explosao bang pow" },
      { char: "🔥", name: "fogo fogo acendeu brabo hype top quente flame" },
      { char: "⚡", name: "raio eletrico energia choque flash rapido" },
      { char: "✨", name: "brilho estrelas magia sparkle especial" },
      { char: "⭐", name: "estrela star favorita nota dez" },
      { char: "🌟", name: "estrela brilhante glow sucesso" },
      { char: "💫", name: "vertigem tonto estrela giro" },
      { char: "🚀", name: "foguete voar lancamento lua hype rocket" },
      { char: "🛸", name: "disco voador ovni nave espaco" },
      { char: "☕", name: "cafe coffee quentinho pausa descanso" },
      { char: "🍕", name: "pizza comida lanche queijo" },
      { char: "🍔", name: "hamburguer comida burger lanche" },
      { char: "🍟", name: "batata frita lanche salgado" },
      { char: "🍻", name: "cervejas brinde chopp saude comemorar" },
      { char: "🥂", name: "tacas brinde champanhe festa" },
    ],
  },
  {
    id: "symbols",
    name: "Símbolos & Status",
    icon: Sparkles,
    emojis: [
      { char: "🔒", name: "cadeado seguro fechado trancado e2ee crypto" },
      { char: "🔓", name: "cadeado aberto destrancado livre" },
      { char: "🔑", name: "chave key acesso senha segredo" },
      { char: "🛡️", name: "escudo protecao firewall seguro" },
      { char: "⚠️", name: "atencao aviso alerta cuidado" },
      { char: "⛔", name: "pare proibido cancelado bloqueado" },
      { char: "✅", name: "correto check verde confirmado feito ok" },
      { char: "❌", name: "errado x vermelho cancelar falha nao" },
      { char: "💯", name: "cem por cento perfeito nota 100 gabaritou" },
      { char: "📌", name: "alfinete fixar pin mensagem fixada" },
      { char: "📍", name: "alfinete redondo localizacao lugar gps" },
      { char: "💬", name: "balao conversa mensagem chat dm texto" },
      { char: "💭", name: "balao pensamento sonhando pensando" },
      { char: "💤", name: "sono dormindo zzz silêncio" },
      { char: "🔔", name: "sino notificacao alerta chamar" },
      { char: "🔕", name: "sino mudo sem notificacao silenciado" },
      { char: "🎉", name: "festa confete comemoracao parabens viva" },
      { char: "🎈", name: "balao festa bexiga aniversario" },
    ],
  },
];

export const EmojiPickerPopover = memo(({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
      return cat ? cat.emojis : [];
    }
    // Search across all categories
    const results = [];
    const seen = new Set();
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (!seen.has(item.char) && (item.name.includes(q) || item.char === q)) {
          seen.add(item.char);
          results.push(item);
        }
      }
    }
    return results;
  }, [searchQuery, activeCategory]);

  return (
    <div className="discord-emoji-picker-popover" onClick={(e) => e.stopPropagation()}>
      {/* Search Header */}
      <div className="emoji-picker-search-bar">
        <Search size={14} className="emoji-search-icon" />
        <input
          type="text"
          placeholder="Buscar emojis (ex: rindo, fogo, coracao)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {searchQuery ? (
          <button
            type="button"
            className="emoji-clear-search"
            onClick={() => setSearchQuery("")}
            title="Limpar busca"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Category Tabs (shown when not actively searching) */}
      {!searchQuery && (
        <div className="emoji-picker-tabs">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                type="button"
                className={`emoji-tab-btn ${active ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="emoji-picker-grid">
        {filteredEmojis.length > 0 ? (
          filteredEmojis.map((item, idx) => (
            <button
              key={`${item.char}_${idx}`}
              type="button"
              className="emoji-cell-btn"
              onClick={() => onSelectEmoji(item.char)}
              title={item.name}
            >
              <span>{item.char}</span>
            </button>
          ))
        ) : (
          <div className="emoji-empty-state">
            <span>Nenhum emoji encontrado para "{searchQuery}"</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default EmojiPickerPopover;

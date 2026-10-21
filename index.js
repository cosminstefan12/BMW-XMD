const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const express = require('express');
const yts = require('yt-search');

const PHONE = process.env.PHONE || '40770811929';
const PORT = process.env.PORT || 3000;
const PREFIX = '.';

let pairCode = null;
let connected = false;
const antilink = new Set();
const tttGames = new Map();

// ================= WEB =================
const app = express();
app.get('/code', (_req, res) => res.json({ code: pairCode, connected, number: PHONE }));
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BMW-XMD V5 · Pair Code</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;
background-image:radial-gradient(circle at 50% 0%,#1a2e05 0%,#000 60%);font-family:ui-monospace,Menlo,monospace;color:#e5e5e5;padding:20px}
.card{width:100%;max-width:440px;border:1px solid #1f2d0a;border-radius:24px;padding:36px 28px;background:#0a0a0a;
box-shadow:0 0 80px rgba(163,230,53,.12);text-align:center}
h1{font-size:14px;letter-spacing:.3em;color:#a3e635;margin-bottom:6px}
p.sub{font-size:12px;color:#737373;margin-bottom:28px}
.code{font-size:44px;font-weight:800;letter-spacing:.12em;color:#a3e635;text-shadow:0 0 24px rgba(163,230,53,.5);
padding:22px 10px;border:1px dashed #3f6212;border-radius:16px;margin-bottom:20px;word-break:break-all}
button{width:100%;padding:16px;border:0;border-radius:14px;background:#a3e635;color:#000;font-weight:800;
font-family:inherit;font-size:15px;letter-spacing:.1em;cursor:pointer;transition:.2s}
button:hover{background:#bef264;transform:translateY(-1px)}
.st{margin-top:18px;font-size:12px;color:#737373}.ok{color:#a3e635}
ol{text-align:left;font-size:12px;color:#a3a3a3;margin-top:24px;padding-left:18px;line-height:1.9}
</style></head><body><div class="card">
<h1>BMW-XMD V5</h1><p class="sub">Pair code pentru +${PHONE}</p>
<div class="code" id="code">······</div>
<button id="btn">COPY</button>
<div class="st" id="st">Se reîncarcă la fiecare 5 secunde…</div>
<ol><li>WhatsApp → Dispozitive conectate</li><li>Conectează un dispozitiv</li><li>Conectează cu număr de telefon</li><li>Introdu codul de mai sus</li></ol>
</div><script>
const c=document.getElementById('code'),s=document.getElementById('st'),b=document.getElementById('btn');
async function load(){try{const r=await fetch('/code');const d=await r.json();
if(d.connected){c.textContent='CONECTAT ✓';s.innerHTML='<span class="ok">Bot online</span>';}
else{c.textContent=d.code||'Se generează…';}}catch(e){s.textContent='Eroare conexiune';}}
b.onclick=async()=>{const t=c.textContent.replace(/-/g,'');await navigator.clipboard.writeText(t);b.textContent='COPIAT ✓';setTimeout(()=>b.textContent='COPY',1500)};
load();setInterval(load,5000);
</script></body></html>`);
});
app.listen(PORT, () => console.log('🌐 Server pornit pe portul ' + PORT));

// ================= MENU =================
const MENU = `🤖 *BMW-XMD V5 MENU*

👑 GRUP ADMIN
- .tagall text - tag toti
- .hidetag text - tag invizibil
- .kick @user - scoate
- .add 40770xxx - adauga
- .promote @user - fa admin
- .demote @user - scoate admin
- .group open/close
- .link - link grup
- .setname / .setdesc
- .admins - lista admini
- .antilink on/off - anti link
- .leave - bot iese

🎧 DOWNLOAD
- .play / .video / .tiktok / .fb / .ig

💥 ANIME ANIMAT - GIF
- .slap @user / .kiss @user
- .hug / .pat / .cuddle / .bonk
- .kick / .kill / .bite / .poke
- .dance / .cry / .smile / .wave
- .highfive / .handhold / .yeet
- .blush / .wink / .nom / .glomp
- .cringe / .bully / .happy

🎌 RANDOM
- .waifu / .neko / .meme / .joke

😂 FUN
- .ppt / .xox / .s / .ai

Powered by BMW-XMD V5`;

const GIFS = ['slap','kiss','hug','pat','cuddle','bonk','kill','bite','poke','dance','cry','smile','wave',
  'highfive','handhold','yeet','blush','wink','nom','glomp','cringe','bully','happy'];
// nekos.best does not have every action; waifu.pics covers the rest
const NEKOS = ['slap','kiss','hug','pat','cuddle','bite','poke','dance','cry','smile','wave','highfive',
  'handhold','yeet','blush','wink','nom','happy','kick','bonk'];

const JOKES = [
  'De ce nu joacă peștii tenis? Le e frică de fileu. 🐟',
  'Programatorul și-a pus ochelari pentru că nu vedea C#. 🤓',
  'Am o glumă despre UDP, dar nu știu dacă o primești. 📡',
  'Ce face un vampir la calculator? Byte-uri. 🧛',
  'Bula: "Tată, ce e aia leneș?" — "Pune-te pe tine întrebarea." 😴',
];

// ================= HELPERS =================
const getBuffer = async (url) => (await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })).data;
const mentionedOf = (m) => m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
const quotedSender = (m) => m.message?.extendedTextMessage?.contextInfo?.participant;
const bodyOf = (m) =>
  m.message?.conversation ||
  m.message?.extendedTextMessage?.text ||
  m.message?.imageMessage?.caption ||
  m.message?.videoMessage?.caption || '';

async function animeGif(action) {
  if (NEKOS.includes(action)) {
    try {
      const { data } = await axios.get(`https://nekos.best/api/v2/${action}`, { timeout: 15000 });
      if (data?.results?.[0]?.url) return data.results[0].url;
    } catch {}
  }
  const map = { kill: 'kill', glomp: 'glomp', cringe: 'cringe', bully: 'bully', bonk: 'bonk', kick: 'kick' };
  const { data } = await axios.get(`https://api.waifu.pics/sfw/${map[action] || action}`, { timeout: 15000 });
  return data.url;
}

async function ytAudio(url) {
  try {
    const { data } = await axios.get('https://api.vreden.my.id/api/ytmp3?url=' + encodeURIComponent(url), { timeout: 60000 });
    const u = data?.result?.download?.url || data?.result?.url || data?.result?.download;
    if (u) return u;
  } catch {}
  const { data } = await axios.get('https://api.davidcyriltech.my.id/youtube/mp3?url=' + encodeURIComponent(url), { timeout: 60000 });
  return data?.result?.downloadUrl || data?.result?.download_url || data?.result?.url;
}

function tttBoard(b) {
  const e = { X: '❌', O: '⭕' };
  const n = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
  const c = b.map((v, i) => e[v] || n[i]);
  return `${c[0]}${c[1]}${c[2]}\n${c[3]}${c[4]}${c[5]}\n${c[6]}${c[7]}${c[8]}`;
}
function tttWinner(b) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, c, d] of L) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

// ================= BOT =================
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
  });

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE.replace(/\D/g, ''));
        pairCode = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('🔑 PAIR CODE: ' + pairCode);
      } catch (e) { console.log('Eroare pair code:', e.message); }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') { connected = true; pairCode = null; console.log('✅ BMW-XMD V5 conectat!'); }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) { console.log('♻️ Reconectare...'); start(); }
      else console.log('❌ Delogat. Șterge folderul auth și repornește.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0];
    if (!m?.message) return;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? m.key.participant : from;
    const body = bodyOf(m).trim();
    const reply = (text, extra = {}) => sock.sendMessage(from, { text, ...extra }, { quoted: m });

    let meta, admins = [], isAdmin = false, isBotAdmin = false;
    if (isGroup) {
      try {
        meta = await sock.groupMetadata(from);
        admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botLid = sock.user.lid ? sock.user.lid.split(':')[0] + '@lid' : null;
        isAdmin = admins.includes(sender) || m.key.fromMe;
        isBotAdmin = admins.includes(botId) || (botLid && admins.includes(botLid));
      } catch {}
    }

    // anti-link
    if (isGroup && antilink.has(from) && !isAdmin && /chat\.whatsapp\.com\/|https?:\/\//i.test(body)) {
      if (isBotAdmin) {
        await sock.sendMessage(from, { delete: m.key });
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        return reply('🚫 Link-urile nu sunt permise!');
      }
    }

    // tic tac toe moves
    if (/^[1-9]$/.test(body) && tttGames.has(from)) {
      const g = tttGames.get(from);
      const sym = g.players[g.turn];
      if (sender !== sym) return;
      const i = +body - 1;
      if (g.board[i]) return reply('Căsuța e ocupată!');
      g.board[i] = g.turn === 0 ? 'X' : 'O';
      const w = tttWinner(g.board);
      if (w) {
        tttGames.delete(from);
        return reply(`${tttBoard(g.board)}\n\n${w === 'draw' ? '🤝 Egalitate!' : `🏆 @${sender.split('@')[0]} a câștigat!`}`, { mentions: [sender] });
      }
      g.turn = 1 - g.turn;
      const next = g.players[g.turn];
      return reply(`${tttBoard(g.board)}\n\nRândul lui @${next.split('@')[0]}`, { mentions: [next] });
    }

    if (!body.startsWith(PREFIX)) return;
    const [cmdRaw, ...args] = body.slice(1).split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const text = args.join(' ');
    const target = mentionedOf(m)[0] || quotedSender(m);

    const needGroup = () => { if (!isGroup) { reply('❗ Doar în grupuri.'); return false; } return true; };
    const needAdmin = () => {
      if (!needGroup()) return false;
      if (!isAdmin) { reply('❗ Doar adminii pot folosi comanda.'); return false; }
      return true;
    };
    const needBotAdmin = () => { if (!isBotAdmin) { reply('❗ Botul trebuie să fie admin.'); return false; } return true; };

    try {
      // anime gif (kick with mention in group by admin = remove; otherwise gif)
      if (GIFS.includes(cmd) || (cmd === 'kick' && !(isGroup && isAdmin && target))) {
        const url = await animeGif(cmd);
        const buf = await getBuffer(url);
        const who = target ? ` @${target.split('@')[0]}` : '';
        const caption = `@${sender.split('@')[0]} ${cmd}${who} 💥`;
        const mentions = [sender, ...(target ? [target] : [])];
        const isGif = url.endsWith('.gif');
        return sock.sendMessage(from, isGif
          ? { video: buf, gifPlayback: true, caption, mentions, mimetype: 'video/mp4' }
          : { video: buf, gifPlayback: true, caption, mentions }, { quoted: m });
      }

      switch (cmd) {
        case 'menu': case 'help': return reply(MENU);

        // ---------- GROUP ----------
        case 'tagall': {
          if (!needAdmin()) return;
          const ids = meta.participants.map((p) => p.id);
          const list = ids.map((id) => `➤ @${id.split('@')[0]}`).join('\n');
          return sock.sendMessage(from, { text: `📢 ${text || 'Atenție toată lumea!'}\n\n${list}`, mentions: ids });
        }
        case 'hidetag': {
          if (!needAdmin()) return;
          return sock.sendMessage(from, { text: text || '‎', mentions: meta.participants.map((p) => p.id) });
        }
        case 'kick': {
          if (!needAdmin() || !needBotAdmin()) return;
          await sock.groupParticipantsUpdate(from, [target], 'remove');
          return reply('👢 Scos din grup.');
        }
        case 'add': {
          if (!needAdmin() || !needBotAdmin()) return;
          const num = text.replace(/\D/g, '');
          if (!num) return reply('Folosire: .add 40770xxxxxx');
          const r = await sock.groupParticipantsUpdate(from, [num + '@s.whatsapp.net'], 'add');
          return reply(r?.[0]?.status === '200' ? '✅ Adăugat.' : '⚠️ Nu am putut adăuga (status ' + r?.[0]?.status + ').');
        }
        case 'promote': case 'demote': {
          if (!needAdmin() || !needBotAdmin()) return;
          if (!target) return reply('Menționează un user.');
          await sock.groupParticipantsUpdate(from, [target], cmd);
          return reply(cmd === 'promote' ? '👑 Acum e admin.' : '⬇️ Nu mai e admin.', { mentions: [target] });
        }
        case 'group': {
          if (!needAdmin() || !needBotAdmin()) return;
          if (text === 'open') { await sock.groupSettingUpdate(from, 'not_announcement'); return reply('🔓 Grup deschis.'); }
          if (text === 'close') { await sock.groupSettingUpdate(from, 'announcement'); return reply('🔒 Grup închis.'); }
          return reply('Folosire: .group open/close');
        }
        case 'link': {
          if (!needGroup() || !needBotAdmin()) return;
          const code = await sock.groupInviteCode(from);
          return reply('🔗 https://chat.whatsapp.com/' + code);
        }
        case 'setname': {
          if (!needAdmin() || !needBotAdmin()) return;
          await sock.groupUpdateSubject(from, text); return reply('✅ Nume schimbat.');
        }
        case 'setdesc': {
          if (!needAdmin() || !needBotAdmin()) return;
          await sock.groupUpdateDescription(from, text); return reply('✅ Descriere schimbată.');
        }
        case 'admins': {
          if (!needGroup()) return;
          return reply('👑 *Admini:*\n' + admins.map((a) => `➤ @${a.split('@')[0]}`).join('\n'), { mentions: admins });
        }
        case 'antilink': {
          if (!needAdmin()) return;
          if (text === 'on') { antilink.add(from); return reply('🛡️ Antilink activat.'); }
          if (text === 'off') { antilink.delete(from); return reply('Antilink dezactivat.'); }
          return reply('Folosire: .antilink on/off');
        }
        case 'leave': {
          if (!needAdmin()) return;
          await reply('👋 La revedere!'); return sock.groupLeave(from);
        }

        // ---------- DOWNLOAD ----------
        case 'play': {
          if (!text) return reply('Folosire: .play nume melodie');
          await reply('🔎 Caut...');
          const r = await yts(text);
          const v = r.videos[0];
          if (!v) return reply('Nu am găsit nimic.');
          const dl = await ytAudio(v.url);
          if (!dl) return reply('❌ Descărcarea a eșuat.');
          const audio = await getBuffer(dl);
          await sock.sendMessage(from, { image: { url: v.thumbnail }, caption: `🎧 *${v.title}*\n⏱ ${v.timestamp}\n👤 ${v.author.name}` }, { quoted: m });
          return sock.sendMessage(from, { audio, mimetype: 'audio/mpeg', fileName: `${v.title}.mp3`, ptt: false }, { quoted: m });
        }
        case 'video': {
          if (!text) return reply('Folosire: .video nume/link');
          const url = /youtu/.test(text) ? text : (await yts(text)).videos[0]?.url;
          if (!url) return reply('Nu am găsit nimic.');
          const { data } = await axios.get('https://api.vreden.my.id/api/ytmp4?url=' + encodeURIComponent(url), { timeout: 60000 });
          const dl = data?.result?.download?.url || data?.result?.url;
          if (!dl) return reply('❌ Descărcarea a eșuat.');
          return sock.sendMessage(from, { video: { url: dl }, caption: data?.result?.metadata?.title || '🎬' }, { quoted: m });
        }
        case 'tiktok': case 'fb': case 'ig': {
          if (!text) return reply(`Folosire: .${cmd} link`);
          const ep = { tiktok: 'tiktok', fb: 'fbdl', ig: 'igdownload' }[cmd];
          const { data } = await axios.get(`https://api.vreden.my.id/api/${ep}?url=` + encodeURIComponent(text), { timeout: 60000 });
          const r = data?.result || {};
          const dl = r?.data?.find?.((x) => /nowatermark|hd/i.test(x.type))?.url || r?.data?.[0]?.url || r?.hd_url || r?.sd_url || r?.url || r?.response?.[0]?.url;
          if (!dl) return reply('❌ Descărcarea a eșuat.');
          return sock.sendMessage(from, { video: { url: dl }, caption: '✅ BMW-XMD V5' }, { quoted: m });
        }

        // ---------- RANDOM ----------
        case 'waifu': case 'neko': {
          const { data } = await axios.get(`https://nekos.best/api/v2/${cmd}`);
          return sock.sendMessage(from, { image: { url: data.results[0].url }, caption: `🎌 ${cmd}` }, { quoted: m });
        }
        case 'meme': {
          const { data } = await axios.get('https://meme-api.com/gimme');
          return sock.sendMessage(from, { image: { url: data.url }, caption: data.title }, { quoted: m });
        }
        case 'joke': return reply('😂 ' + JOKES[Math.floor(Math.random() * JOKES.length)]);

        // ---------- FUN ----------
        case 'ppt': {
          const opts = { piatra: '🪨', hartie: '📄', foarfeca: '✂️' };
          const alias = { rock: 'piatra', paper: 'hartie', scissors: 'foarfeca', p: 'piatra', h: 'hartie', f: 'foarfeca' };
          const you = alias[text.toLowerCase()] || text.toLowerCase();
          if (!opts[you]) return reply('Folosire: .ppt piatra/hartie/foarfeca');
          const keys = Object.keys(opts);
          const bot = keys[Math.floor(Math.random() * 3)];
          const wins = { piatra: 'foarfeca', hartie: 'piatra', foarfeca: 'hartie' };
          const res = you === bot ? '🤝 Egal!' : wins[you] === bot ? '🏆 Ai câștigat!' : '😈 Am câștigat eu!';
          return reply(`Tu: ${opts[you]}  vs  Bot: ${opts[bot]}\n\n${res}`);
        }
        case 'xox': {
          if (!needGroup()) return;
          if (text === 'stop') { tttGames.delete(from); return reply('Joc oprit.'); }
          if (tttGames.has(from)) return reply('Un joc e deja în curs. (.xox stop)');
          if (!target || target === sender) return reply('Folosire: .xox @adversar');
          tttGames.set(from, { players: [sender, target], turn: 0, board: Array(9).fill(null) });
          return reply(`🎮 X-O: @${sender.split('@')[0]} ❌ vs @${target.split('@')[0]} ⭕\n\n${tttBoard(Array(9).fill(null))}\n\nTrimite un număr 1-9.`, { mentions: [sender, target] });
        }
        case 's': case 'sticker': {
          const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const src = q ? { message: q, key: m.key } : m;
          const img = src.message?.imageMessage;
          if (!img) return reply('Răspunde la o imagine cu .s');
          const buf = await downloadMediaMessage(src, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
          return sock.sendMessage(from, { sticker: buf }, { quoted: m });
        }
        case 'ai': {
          if (!text) return reply('Folosire: .ai întrebare');
          const { data } = await axios.get('https://api.vreden.my.id/api/ai/gpt?query=' + encodeURIComponent(text), { timeout: 60000 });
          return reply('🤖 ' + (data?.result || 'Nu am răspuns acum.'));
        }
      }
    } catch (e) {
      console.log('Eroare comandă', cmd, e.message);
      reply('❌ Eroare: ' + e.message);
    }
  });
}

start();

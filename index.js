const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = '8769656490:AAGCOTdL7B3z36754HdQ3pC09hKZQ50f4e8';
const ADMIN_ID = 7262941693; // Sənin ID-n
const ADMIN_PHONE = '+994 99 710 52 42';
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const BIN_ID = '6a993a4a23a2f6593e5a1743';

const bot = new TelegramBot(TOKEN, {polling: true});
let products = [];
let userCarts = {}; // İstifadəçinin səbəti

// Məhsulları yüklə
async function loadProducts() {
  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_KEY } });
    products = res.data.record || [];
  } catch(e) { products = []; }
}
async function saveProducts() {
  await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, products, { headers: { 'X-Master-Key': JSONBIN_KEY, 'Content-Type': 'application/json' } });
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `Salam gözəlim 💖 \nNərgiz Butik rəsmi botuna xoş gəldin!\n\n👗 /kataloq - Bütün məhsullar\n🔥 /endirim - Endirimlər\n📏 /olcu - Ölçü cədvəli\n🛍️ /sebət - Səbətim\n📞 /elaqe - Əlaqə`, {
    reply_markup: { keyboard: [['/kataloq'], ['/sebət', '/elaqe']], resize_keyboard: true }
  });
});

bot.onText(/\/elaqe/, (msg) => {
  bot.sendMessage(msg.chat.id, `📞 Əlaqə: ${ADMIN_PHONE}\n📍 Çatdırılma: Bakı daxili pulsuz\n⏰ İş saatı: 10:00 - 20:00`);
});

bot.onText(/\/olcu/, (msg) => {
  bot.sendMessage(msg.chat.id, `📏 *ÖLÇÜ CƏDVƏLİ*\n\n44 - Sinə: 100, Bel: 80\n46 - Sinə: 104, Bel: 84\n48 - Sinə: 108, Bel: 88\n50 - Sinə: 112, Bel: 92\n52 - Sinə: 116, Bel: 96\n54 - Sinə: 120, Bel: 100\nŞübhən varsa /elaqe yazın 💬`, {parse_mode: 'Markdown'});
});

bot.onText(/\/kataloq/, (msg) => {
  if(products.length === 0) return bot.sendMessage(msg.chat.id, 'Hələ məhsul yoxdur 😔');
  products.forEach(p => {
    let text = `*${p.ad}*\nQiymət: ${p.qiymet} AZN\n${p.tesvir}`;
    bot.sendPhoto(msg.chat.id, p.foto, {caption: text, parse_mode: 'Markdown', reply_markup: {
      inline_keyboard: [[{text: 'Səbətə at 🛍️', callback_data: `add_${p.id}`}]
    ]}});
  });
});

bot.on('callback_query', (query) => {
  const id = query.data.split('_')[1];
  if(!userCarts[query.from.id]) userCarts[query.from.id] = [];
  userCarts[query.from.id].push(id);
  bot.answerCallbackQuery(query.id, 'Səbətə əlavə edildi ✅');
});

bot.onText(/\/sebət/, (msg) => {
  const cart = userCarts[msg.from.id] || [];
  if(cart.length === 0) return bot.sendMessage(msg.chat.id, 'Səbətin boşdur 😔');
  bot.sendMessage(msg.chat.id, `Səbətində ${cart.length} məhsul var.\nSifarişi təsdiqləmək üçün /sifaris yazın`);
});

bot.onText(/\/sifaris/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Sifarişi tamamlamaq üçün Ad Soyad | Nömrə | Ünvan yazın\nNümunə: Aygün Əliyeva | 0501234567 | Nəsimi r.');
  bot.once('message', (m) => {
    bot.sendMessage(ADMIN_ID, `🔔 YENİ SİFARİŞ!\n\n${m.text}\n\nMüştəri: @${m.from.username || m.from.first_name}`);
    bot.sendMessage(m.chat.id, `Sifarişin qəbul edildi ✅\nTezliklə ${ADMIN_PHONE} nömrəsi ilə əlaqə saxlayacağıq.`);
  });
});

// ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
  if(msg.from.id != ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, 'Admin Panel', { reply_markup: { keyboard: [['Məhsul Əlavə Et'], ['Sifarişləri Gör']], resize_keyboard: true }});
});

bot.on('message', async (msg) => {
  if(msg.from.id != ADMIN_ID) return;
  if(msg.text === 'Məhsul Əlavə Et') {
    bot.sendMessage(msg.chat.id, 'Format: ad|qiymet|tesvir|foto_link\nNümunə: Qara Don|75|46-54 ölçü|https://link.jpg');
    bot.once('message', async (m) => {
      const [ad, qiymet, tesvir, foto] = m.text.split('|');
      products.push({id: Date.now(), ad, qiymet, tesvir, foto});
      await saveProducts();
      bot.sendMessage(msg.chat.id, '✅ Məhsul əlavə edildi');
    });
  }
});

loadProducts();
console.log('Nargiz Butik Bot işləyir');

// UptimeRobot üçün
require('http').createServer((req, res) => res.end('OK')).listen(process.env.PORT || 3000);

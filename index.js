const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const TOKEN = '8769656490:AAGCOTdL7B3z36754HdQ3pC09hKZQ50f4e8';
const ADMIN_ID = 7262941693;

// BURANI ÖZÜNÜNKİ İLƏ DƏYİŞ
const SUPABASE_URL = 'https://xecgteqlwwskqfyxtojv.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_TzGahL2QbpM87R4WVM1cyg_QTYUoNef';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TOKEN, {polling: true});

let adminState = {};

// MƏHSULLARI ÇƏK
async function getProducts() {
  let { data } = await supabase.from('products').select('*').order('id', { ascending: false });
  return data || [];
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `Salam gözəlim 💖 \nNərgiz Butik rəsmi botuna xoş gəldin!\n\n👗 /kataloq - Bütün məhsullar\n🛍️ /sebət - Səbətim\n📞 /elaqe - Əlaqə`, {
    reply_markup: { keyboard: [['/kataloq'], ['/sebət', '/elaqe']], resize_keyboard: true }
  });
});

bot.onText(/\/kataloq/, async (msg) => {
  const products = await getProducts();
  if(products.length === 0) return bot.sendMessage(msg.chat.id, 'Hələ məhsul yoxdur 😔');
  products.forEach(p => {
    bot.sendPhoto(msg.chat.id, p.foto, {caption: `*${p.ad}*\nQiymət: ${p.qiymet} AZN\n${p.tesvir}`, parse_mode: 'Markdown'});
  });
});

// ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
  if(msg.from.id!= ADMIN_ID) return;
  adminState[msg.from.id] = null;
  bot.sendMessage(msg.chat.id, 'Admin Panel', { reply_markup: { keyboard: [['Məhsul Əlavə Et']], resize_keyboard: true }});
});

bot.on('message', async (msg) => {
  if(msg.from.id!= ADMIN_ID) return;
  const chatId = msg.chat.id;

  if(msg.text === 'Məhsul Əlavə Et'){
    adminState[chatId] = 'waiting_product';
    return bot.sendMessage(chatId, 'Format: ad|qiymet|tesvir|foto_link');
  }

  if(adminState[chatId] === 'waiting_product'){
    try {
      const [ad, qiymet, tesvir, foto] = msg.text.split('|');

      const { error } = await supabase.from('products').insert([{ ad, qiymet, tesvir, foto }]);

      if(error) throw error;

      adminState[chatId] = null;
      bot.sendMessage(chatId, `✅ Məhsul DB-yə yazıldı: *${ad}*`, {parse_mode: 'Markdown'});
    } catch(e){
      bot.sendMessage(chatId, `❌ Xəta: ${e.message}`);
      adminState[chatId] = null;
    }
  }
});

console.log('Nargiz Butik Bot işləyir - SUPABASE ilə');
require('http').createServer((req, res) => res.end('OK')).listen(process.env.PORT || 3000);

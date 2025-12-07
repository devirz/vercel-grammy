// api/bot.js

const { Bot, InlineKeyboard } = require("grammy");
// const { nanoid } = require("nanoid");
const DB = require('../services/storage');

const bot = new Bot(process.env.BOT_TOKEN);

// ۱. ایجاد یک Promise برای نگهداری وضعیت initialization
const initializationPromise = bot.init()
    .then(() => {
        // این لاگ در Cold Start دیده می‌شود
        console.log("Grammy bot initialized successfully!"); 
    })
    .catch(err => {
        // اگر توکن اشتباه باشد یا مشکل اتصال باشد، اینجا خطا می‌دهد
        console.error("Critical: Bot initialization failed!", err);
        throw err; 
    });

    bot.command("generate", async (ctx) => {
    const { nanoid } = await import("nanoid");
    const creatorId = ctx.from.id;
    const linkId = nanoid(10); 

    // ۱. ثبت لینک در دیتابیس (بدون شمارش)
    await DB.setLink(linkId, creatorId);

    // ساخت URL پایه
    const BASE_URL = "https://vercel-grammy-beryl.vercel.app/"; 
    const trackingLink = `${BASE_URL}/api/track?id=${linkId}`;
    
    await ctx.reply(
        `✅ لینک اطلاع‌رسانی شما ایجاد شد (اعتبار 15 دقیقه): \n\n${trackingLink}`,
        { reply_to_message_id: ctx.message.message_id }
    );
});

bot.command("start", async (ctx) => {
  await ctx.reply("Welcome To My Bot!\nsend /info command.");
});

bot.command("info", async ctx => {
  const { id, first_name, username, language_code, is_premium } = ctx.from
  await ctx.reply(`
    [+] ID: ${id}
    [+] Name: ${first_name || ""}
    [+] Username: ${username ? "@" + username : "No Username"}
    [+] Lang: ${language_code}
    [+] is Premium: ${is_premium ? "Yes" : "No"}
    `, {
      reply_markup: new InlineKeyboard().text(new Date().toLocaleTimeString())
    })
})
module.exports = { bot, initializationPromise };
// ۲. تابع هندلر (Handler) که منتظر اتمام Promise می‌ماند
// module.exports = async (req, res) => {
//     try {
//         // در Cold Start، اینجا منتظر اتمام initializationPromise می‌ماند.
//         // در Warm Start (درخواست‌های بعدی)، این عملیات بلافاصله انجام می‌شود.
//         await initializationPromise; 
//         const privateUserIP = req.headers['x-forwarded-for'];
//         const privateUserAgent = req.headers['user-agent'];
//         const update = req.body;
        
//         if (update) {
//             await bot.handleUpdate(update);
//         }

//         res.statusCode = 200;
//         res.end();

//     } catch (error) {
//         // اگر خطایی در init یا handleUpdate رخ دهد
//         console.error("Error processing request:", error);
//         res.statusCode = 500;
//         res.end();
//     }
// };
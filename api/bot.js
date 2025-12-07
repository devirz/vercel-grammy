// api/bot.js

const { Bot, InlineKeyboard } = require("grammy");
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

// ۲. تابع هندلر (Handler) که منتظر اتمام Promise می‌ماند
module.exports = async (req, res) => {
    try {
        // در Cold Start، اینجا منتظر اتمام initializationPromise می‌ماند.
        // در Warm Start (درخواست‌های بعدی)، این عملیات بلافاصله انجام می‌شود.
        await initializationPromise; 
        
        const update = req.body;
        
        if (update) {
            await bot.handleUpdate(update);
        }

        res.statusCode = 200;
        res.end();

    } catch (error) {
        // اگر خطایی در init یا handleUpdate رخ دهد
        console.error("Error processing request:", error);
        res.statusCode = 500;
        res.end();
    }
};
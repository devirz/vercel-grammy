const { Bot, webhookCallback } = require("grammy");

// توکن بات را از متغیر محیطی (Environment Variable) بخوانید
const bot = new Bot(process.env.BOT_TOKEN);

// دستور ساده برای تست
bot.command("start", async (ctx) => {
  await ctx.reply("سلام! بات شما با موفقیت روی Vercel اجرا شد.");
});

// این متد برای دریافت به‌روزرسانی‌ها از وب‌هوک استفاده می‌شود
// و پاسخ را به Vercel برمی‌گرداند.
module.exports = webhookCallback(bot, "aws-lambda");
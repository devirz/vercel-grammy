const { Bot, webhookCallback } = require("grammy");

// توکن بات را از متغیر محیطی (Environment Variable) بخوانید
const bot = new Bot(process.env.BOT_TOKEN);

// دستور ساده برای تست
bot.command("start", async (ctx) => {
  await ctx.reply("سلام! بات شما با موفقیت روی Vercel اجرا شد.");
});

// این تابع جایگزین webhookCallback می‌شود
module.exports = async (req, res) => {
    try {
        // برای توابع Serverless در Vercel، بدنه درخواست (req.body) 
        // معمولاً به صورت خودکار توسط runtime به JSON تبدیل می‌شود.
        const update = req.body;
        
        // هندل کردن به‌روزرسانی
        if (update) {
            await bot.handleUpdate(update);
        }

        // پاسخ ۲۰۰ (OK) به تلگرام برای جلوگیری از ارسال مجدد وب‌هوک
        res.statusCode = 200;
        res.end();

    } catch (error) {
        console.error("Error processing update:", error);
        res.statusCode = 500;
        res.end();
    }
};
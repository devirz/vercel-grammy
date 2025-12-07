const { Bot, webhookCallback } = require("grammy");

// توکن بات را از متغیر محیطی (Environment Variable) بخوانید
const bot = new Bot(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log("Initializing bot...");
        // این خط اطلاعات بات را از تلگرام دریافت و شیء bot را مقداردهی می‌کند
        await bot.init(); 
        console.log("Bot initialized successfully!");
    } catch (e) {
        console.error("Initialization failed:", e.message);
    }
})();
// ==============================================================================


bot.command("start", async (ctx) => {
  await ctx.reply("سلام! بات شما با موفقیت اجرا شد.");
});

// این تابع وب‌هوک را مدیریت می‌کند
module.exports = async (req, res) => {
    try {
        const update = req.body;
        
        console.log("Received update:", update ? update.update_id : "No update");
        
        if (update) {
            // اگر init() با موفقیت انجام شده باشد، اینجا دیگر خطا نخواهد داد
            await bot.handleUpdate(update);
        }

        res.statusCode = 200;
        res.end();

    } catch (error) {
        console.error("Error processing update:", error);
        res.statusCode = 500;
        res.end();
    }
};
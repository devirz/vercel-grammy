// api/track.js

const { Bot } = require("grammy");
const DB = require('../services/storage'); 

const bot = new Bot(process.env.BOT_TOKEN);

// این تابع مستقیماً توسط درخواست HTTP مرورگر فراخوانی می‌شود
module.exports = async (req, res) => {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const linkId = url.searchParams.get('id');

    if (!linkId) {
        res.statusCode = 400;
        return res.end("Missing link ID.");
    }

    try {
        // ۱. بازیابی اطلاعات خالق لینک
        const linkData = await DB.getLinkData(linkId);
        // console.log(linkData)
        if (!linkData) {
            res.statusCode = 404;
            return res.end("Link expired or not found.");
        }
        
        const { creatorId } = linkData;
        const privateUserIP = req.connection.remoteAddress;
        // const privateUserIP = req.headers['x-forwarded-for'];
        const privateUserAgent = req.headers['user-agent'];
        console.log(`IP: ${privateUserIP} | ${privateUserAgent}`)
        // ۲. ارسال اعلان به خالق لینک
        // از آنجایی که نیاز به IP یا موقعیت مکانی نداریم، این عملیات اخلاقی است
        bot.api.sendMessage(
            creatorId, 
            `🔔 اعلان کلیک! شخصی روی لینک شما (${linkId}) کلیک کرد.
            IP: ${privateUserIP}
            UserAgent: ${privateUserAgent}
            `
        ).catch(e => console.error("Error sending notification:", e));
        
        // ۳. حذف لینک پس از اولین استفاده (اگر فقط یک اعلان مد نظر باشد)
        await DB.deleteLink(linkId);

        // ۴. هدایت کاربر به یک مقصد نهایی
        res.writeHead(302, { Location: 'https://www.google.com' });
        res.end();

    } catch (error) {
        console.error("Tracking Error:", error);
        res.statusCode = 500;
        res.end("Internal Server Error.");
    }
};
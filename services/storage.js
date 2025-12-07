// services/storage.js

const { createClient } = require('redis'); // نصب شود: npm install redis

// ۱. ساخت Connection URL از اطلاعات ارائه شده
// const REDIS_CONNECTION_URL = 'redis://default:GCgXvHlUwU726tlLgleAOUXiKGHW3ZOT@redis-11519.c276.us-east-1-2.ec2.cloud.redislabs.com:11519';

const LINK_EXPIRY_SECONDS = 15 * 60; // 15 دقیقه

// ۲. ساخت کلاینت در سطح ماژول
const client = createClient({
    username: 'default',
    password: 'GCgXvHlUwU726tlLgleAOUXiKGHW3ZOT',
    socket: {
        host: 'redis-11519.c276.us-east-1-2.ec2.cloud.redislabs.com',
        port: 11519
    }
});

// پرچم برای جلوگیری از تلاش‌های مکرر اتصال در Cold Start
let isClientConnected = false;

/**
 * اتصال به Redis و مدیریت خطاها
 */
async function connectClient() {
    if (isClientConnected) {
        return;
    }
    
    // مدیریت خطا
    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // در محیط Vercel، اجازه می‌دهیم خطا در صورت نیاز به بیرون پرتاب شود
    });

    try {
        await client.connect();
        isClientConnected = true;
        console.log("Redis client connected successfully.");
    } catch (e) {
        console.error("Failed to connect Redis client:", e);
        throw e; // کرش کردن در Cold Start اگر اتصال برقرار نشود
    }
}


const DB = {
    
    // اطمینان از اتصال قبل از اجرای هر عملیات
    async ensureConnected() {
        if (!isClientConnected) {
            await connectClient();
        }
    },

    // ۱. ذخیره لینک و ID خالق با تعیین زمان انقضا (SET ... EX)
    async setLink(linkId, creatorId) {
        await this.ensureConnected(); // اتصال را تضمین می‌کنیم
        
        const linkKey = `link:${linkId}`;
        const value = JSON.stringify({ creatorId });
        
        // فرمان: SET link:id {"creatorId": 1234} EX 900
        await client.set(linkKey, value, {
            EX: LINK_EXPIRY_SECONDS, // زمان انقضا
        });
    },

    // ۲. بازیابی لینک (GET)
    async getLinkData(linkId) {
        await this.ensureConnected(); // اتصال را تضمین می‌کنیم
        
        const linkKey = `link:${linkId}`;
        
        // فرمان: GET link:id
        const jsonString = await client.get(linkKey); 

        if (!jsonString) {
            return null; // لینک یافت نشد یا منقضی شده
        }
        
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse Redis data:", jsonString);
            return null;
        }
    },
    
    // ۳. حذف لینک (DEL)
    async deleteLink(linkId) {
        await this.ensureConnected(); // اتصال را تضمین می‌کنیم
        
        const linkKey = `link:${linkId}`;
        // فرمان: DEL link:id
        await client.del(linkKey);
    }
};

module.exports = DB;
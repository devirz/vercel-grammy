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
client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

// ۳. شروع اتصال در سطح ماژول و ذخیره Promise آن (فقط یک بار)
// هر عملیات DB منتظر نتیجه این پرامیس می‌ماند.
const connectionPromise = client.connect()
    .then(() => console.log("Redis client connected successfully and ready for reuse."))
    .catch(e => {
        console.error("Failed to connect Redis client during Cold Start:", e);
        // در صورت عدم موفقیت در اتصال اولیه، تابع کرش می‌کند.
        throw e; 
    });


const DB = {
    
    // ۴. تابع تضمین اتصال (فقط منتظر حل Promise می‌ماند)
    // اگر پرامیس قبلاً حل شده باشد (Warm Start)، بلافاصله برمی‌گردد.
    async ensureConnected() {
        await connectionPromise;
    },

    // تمامی عملیات‌ها مانند setLink و getLinkData از ensureConnected استفاده می‌کنند
    async setLink(linkId, creatorId) {
        await this.ensureConnected(); // تنها منتظر حل Promise اتصال می‌ماند
        
        const linkKey = `link:${linkId}`;
        const value = JSON.stringify({ creatorId });
        
        await client.set(linkKey, value, {
            EX: LINK_EXPIRY_SECONDS,
        });
    },

    async getLinkData(linkId) {
        await this.ensureConnected(); // تنها منتظر حل Promise اتصال می‌ماند
        
        const linkKey = `link:${linkId}`;
        const jsonString = await client.get(linkKey); 

        if (!jsonString) {
            return null; 
        }
        
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse Redis data:", jsonString);
            return null;
        }
    },
    
    async deleteLink(linkId) {
        await this.ensureConnected(); // تنها منتظر حل Promise اتصال می‌ماند
        
        const linkKey = `link:${linkId}`;
        await client.del(linkKey);
    }
};

module.exports = DB;
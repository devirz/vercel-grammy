// services/storage.js
const LINK_EXPIRY_MS = 15 * 60 * 1000; // اعتبار لینک 15 دقیقه

const DB = {
    links: new Map(), 

    async setLink(linkId, creatorId) {
        const expiry = Date.now() + LINK_EXPIRY_MS;
        this.links.set(linkId, { creatorId, expiry });
    },

    async getLinkData(linkId) {
        const link = this.links.get(linkId);
        if (!link || link.expiry < Date.now()) {
            return null; // لینک نامعتبر یا منقضی شده
        }
        return link;
    },
    
    // پس از اولین کلیک، لینک باید حذف شود
    async deleteLink(linkId) {
        this.links.delete(linkId);
    }
};

module.exports = DB;
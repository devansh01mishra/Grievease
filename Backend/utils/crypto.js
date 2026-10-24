import { scrypt, timingSafeEqual } from "node:crypto"
 
export async function hashPassword(password, salt) {
    const hash = await scrypt(password, salt, 64).toString('hex');
    return `${salt}:${hash}`
}
export async function checkPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    const newHash = await scrypt(password, salt, 64).toString('hex');
    const oldHash = Buffer.from(hash, 'hex')
    return timingSafeEqual(newHash, oldHash)
}

import "dotenv/config";
import { encrypt, decrypt } from "../services/crypto.service";

const original = "my-super-secret-delta-api-secret-123";
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.log("Original :", original);
console.log("Encrypted:", encrypted);
console.log("Decrypted:", decrypted);
console.log("Roundtrip:", original === decrypted ? "✅ OK" : "❌ MISMATCH");
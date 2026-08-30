import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function parseKey(hex: string | undefined | null): Buffer | null {
  const h = String(hex ?? "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(h)) return null;
  return Buffer.from(h, "hex");
}

let cachedKey: Buffer | null = null;

function persistGeneratedKey(hex: string) {
  try {
    const p = join(process.cwd(), ".env.local");
    const cur = existsSync(p) ? readFileSync(p, "utf8") : "";
    if (/(^|\n)TOKEN_ENCRYPTION_KEY=[0-9a-fA-F]{64}(\r?\n|$)/.test(cur)) return;
    if (/(^|\n)TOKEN_ENCRYPTION_KEY=/.test(cur)) {
      writeFileSync(
        p,
        cur.replace(/(^|\n)TOKEN_ENCRYPTION_KEY=.*(?=\r?\n|$)/, `$1TOKEN_ENCRYPTION_KEY=${hex}`),
      );
      return;
    }
    appendFileSync(p, `${cur && !cur.endsWith("\n") ? "\n" : ""}TOKEN_ENCRYPTION_KEY=${hex}\n`);
  } catch {
    /* Cloud Run / read-only fs — set TOKEN_ENCRYPTION_KEY in the service env. */
  }
}

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const fromEnv = parseKey(process.env.TOKEN_ENCRYPTION_KEY);
  if (fromEnv) {
    cachedKey = fromEnv;
    return cachedKey;
  }
  const hex = randomBytes(32).toString("hex");
  persistGeneratedKey(hex);
  cachedKey = Buffer.from(hex, "hex");
  return cachedKey;
}

export function encrypt(plaintext: string): { cipher: string; iv: string; tag: string } {
  const iv = randomBytes(IV_LEN);
  const ciph = createCipheriv(ALGO, getEncryptionKey(), iv);
  const enc = Buffer.concat([ciph.update(plaintext, "utf8"), ciph.final()]);
  const tag = ciph.getAuthTag();
  return { cipher: enc.toString("hex"), iv: iv.toString("hex"), tag: tag.toString("hex") };
}

/** Combine cipher+tag for encrypted_access_token; iv is stored separately. */
export function packEncrypted(enc: { cipher: string; iv: string; tag: string }): { cipher: string; iv: string } {
  return { cipher: `${enc.cipher}:${enc.tag}`, iv: enc.iv };
}

export function decrypt(cipherAndTag: string, ivHex: string): string {
  const lastColon = cipherAndTag.lastIndexOf(":");
  let cipherHex = cipherAndTag;
  let tagHex = "";
  if (lastColon > 0) {
    cipherHex = cipherAndTag.slice(0, lastColon);
    tagHex = cipherAndTag.slice(lastColon + 1);
  } else if (cipherAndTag.length > 32) {
    tagHex = cipherAndTag.slice(-32);
    cipherHex = cipherAndTag.slice(0, -32);
  }
  if (!tagHex) throw new Error("missing_tag");
  const dec = createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivHex, "hex"));
  dec.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([dec.update(Buffer.from(cipherHex, "hex")), dec.final()]).toString("utf8");
}

export function encryptField(plaintext: string | undefined | null): { cipher: string; iv: string } | null {
  if (plaintext == null || plaintext === "") return null;
  return packEncrypted(encrypt(plaintext));
}

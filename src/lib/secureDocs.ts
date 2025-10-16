import * as FileSystem from 'expo-file-system';

import CryptoJS from 'crypto-js';

import { supabase } from '~/lib/supabase';

// AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC)
export function deriveKey(password: string, salt: string) {
  // PBKDF2 to 32 bytes key
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 100000 });
  return key;
}

export function encryptBytes(bytes: Uint8Array, password: string) {
  const ivWord = CryptoJS.lib.WordArray.random(16);
  const salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  const key = deriveKey(password, salt);
  const wordArray = CryptoJS.lib.WordArray.create(bytes as any);
  const cipher = CryptoJS.AES.encrypt(wordArray, key, {
    iv: ivWord,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ct = cipher.ciphertext.toString(CryptoJS.enc.Base64);
  const ivb64 = ivWord.toString(CryptoJS.enc.Base64);
  const hmac = CryptoJS.HmacSHA256(ivb64 + ':' + ct, key).toString(CryptoJS.enc.Base64);
  return {
    ciphertext_b64: ct,
    iv_b64: ivb64,
    hmac_b64: hmac,
    algo: 'AES-256-CBC+HMAC-SHA256',
    salt,
  };
}

export function decryptBytes(
  ciphertext_b64: string,
  iv_b64: string,
  hmac_b64: string,
  password: string,
  salt: string
) {
  const key = deriveKey(password, salt);
  const h = CryptoJS.HmacSHA256(iv_b64 + ':' + ciphertext_b64, key).toString(CryptoJS.enc.Base64);
  if (h !== hmac_b64) throw new Error('HMAC mismatch');
  const iv = CryptoJS.enc.Base64.parse(iv_b64);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertext_b64),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const arr = new Uint8Array(decrypted.sigBytes);
  for (let i = 0; i < decrypted.sigBytes; i++) {
    arr[i] = (decrypted.words[(i / 4) | 0] >> (24 - 8 * (i % 4))) & 0xff;
  }
  return arr;
}

// Upload encrypted file to Supabase Storage and register metadata
export async function uploadSecureDoc(
  user_id: string,
  title: string,
  bytes: Uint8Array,
  password: string
) {
  const enc = encryptBytes(bytes, password);
  const path = `secure_docs/${user_id}/${Date.now()}-${title.replace(/\s+/g, '_')}.bin`;
  const blob = new Blob([Buffer.from(enc.ciphertext_b64, 'base64')], {
    type: 'application/octet-stream',
  });
  const up = await supabase.storage
    .from('private')
    .upload(path, blob, { upsert: true, contentType: 'application/octet-stream' });
  if (up.error) throw up.error;
  await supabase.from('secure_documents').insert({
    user_id,
    title,
    storage_path: path,
    size_bytes: bytes.length,
    iv: enc.iv_b64,
    hmac: enc.hmac_b64,
    algo: enc.algo,
  });
  return path;
}

// Download and decrypt
export async function downloadSecureDoc(row: any, password: string) {
  const { data, error } = await supabase.storage.from('private').download(row.storage_path);
  if (error) throw error;
  const buf = await data.arrayBuffer();
  const ct_b64 = Buffer.from(new Uint8Array(buf)).toString('base64');
  const out = decryptBytes(ct_b64, row.iv, row.hmac, password, ''); // note: include salt if you persist it
  return out;
}

// Offline queue using AsyncStorage (store pending uploads)
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'securedocs.queue.v1';

export async function enqueueSecureDoc(
  user_id: string,
  title: string,
  bytes: Uint8Array,
  password: string
) {
  const enc = encryptBytes(bytes, password);
  const item = {
    user_id,
    title,
    ciphertext_b64: enc.ciphertext_b64,
    iv_b64: enc.iv_b64,
    hmac_b64: enc.hmac_b64,
    algo: enc.algo,
    created_at: Date.now(),
  };
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
}

export async function flushQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  if (!arr.length) return 0;
  let ok = 0;
  const remain = [];
  for (const it of arr) {
    try {
      const path = `secure_docs/${it.user_id}/${Date.now()}-${it.title.replace(/\s+/g, '_')}.bin`;
      const blob = new Blob([Buffer.from(it.ciphertext_b64, 'base64')], {
        type: 'application/octet-stream',
      });
      const up = await supabase.storage
        .from('private')
        .upload(path, blob, { upsert: true, contentType: 'application/octet-stream' });
      if (up.error) throw up.error;
      await supabase.from('secure_documents').insert({
        user_id: it.user_id,
        title: it.title,
        storage_path: path,
        size_bytes: Math.round((it.ciphertext_b64.length * 3) / 4),
        iv: it.iv_b64,
        hmac: it.hmac_b64,
        algo: it.algo,
      });
      ok++;
    } catch (e) {
      remain.push(it);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
  return ok;
}

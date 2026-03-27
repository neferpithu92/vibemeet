let sodiumPromise: Promise<any> | null = null;

/**
 * Inizializza asincronamente libsodium (versione SUMO) e restituisce l'istanza.
 */
export async function initSodium() {
  if (typeof window === 'undefined') return null;

  if (!sodiumPromise) {
    sodiumPromise = (async () => {
      try {
        const mod = await import('libsodium-wrappers-sumo') as any;
        // Alcuni bundler mettono l'oggetto in .default, altri no.
        // Cerchiamo l'oggetto che ha la proprietà 'ready' o le funzioni crypto.
        let s = mod.default && (mod.default.ready || mod.default.crypto_pwhash) ? mod.default : mod;
        
        await s.ready;
        
        if (typeof s.crypto_pwhash !== 'function') {
          console.error("VEL CRITICAL: libsodium caricata ma crypto_pwhash manca!", Object.keys(s));
          // Prova a recuperare dal modulo se s è sbagliato
          if (mod.crypto_pwhash) s = mod;
          else if (mod.default && mod.default.crypto_pwhash) s = mod.default;
        }

        console.log("VEL: libsodium-wrappers-sumo inizializzata correttamente.");
        return s;
      } catch (e) {
        console.error("VEL: Fallimento caricamento libsodium-wrappers-sumo:", e);
        throw e;
      }
    })();
  }
  return sodiumPromise;
}

/**
 * Deriva un KeyPair Asimmetrico (Curve25519) deterministico dalla password dell'utente.
 * Permette all'utente di non perdere i messaggi se cambia dispositivo, fintanto che ricorda la password.
 */
export async function generateKeyPairFromPassword(password: string, email: string) {
  const sodium = await initSodium();
  
  // Usiamo l'email come salt fisso per l'utente (deve essere almeno 16 bytes, riempiamo se necessario)
  const salt = sodium.from_string(email.padEnd(16, 'vibe-entropy-salt').substring(0, 16));
  
  // Deriviamo una chiave a 32 bytes (Seed) usando Argon2id (pw_hash)
  const seed = sodium.crypto_pwhash(
    32, 
    password, 
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  // Generiamo il keypair per i DMs asimmetrici
  const keypair = sodium.crypto_box_seed_keypair(seed);
  
  return {
    publicKey: sodium.to_base64(keypair.publicKey),
    privateKey: sodium.to_base64(keypair.privateKey)
  };
}

/**
 * Cifra un messaggio End-to-End. 
 * Richiede la CHIAVE PRIVATA del mittente e la CHIAVE PUBBLICA del destinatario.
 */
export async function encryptDirectMessage(message: string, recipientPublicKeyBase64: string, senderPrivateKeyBase64: string) {
  const sodium = await initSodium();
  
  const recipientPublicKey = sodium.from_base64(recipientPublicKeyBase64);
  const senderPrivateKey = sodium.from_base64(senderPrivateKeyBase64);
  
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const messageUint8 = sodium.from_string(message);
  
  // Authenticated encryption
  const encrypted = sodium.crypto_box_easy(messageUint8, nonce, recipientPublicKey, senderPrivateKey);
  
  // Combiniamo nonce e payload per facilitare lo storage
  const payload = new Uint8Array(nonce.length + encrypted.length);
  payload.set(nonce);
  payload.set(encrypted, nonce.length);
  
  return sodium.to_base64(payload);
}

/**
 * Decifra un messaggio End-to-End.
 * Richiede la CHIAVE PRIVATA del ricevente e la CHIAVE PUBBLICA del mittente (per garantire non-repudiation).
 */
export async function decryptDirectMessage(encryptedPayloadBase64: string, senderPublicKeyBase64: string, recipientPrivateKeyBase64: string) {
  const sodium = await initSodium();
  
  const payload = sodium.from_base64(encryptedPayloadBase64);
  const senderPublicKey = sodium.from_base64(senderPublicKeyBase64);
  const recipientPrivateKey = sodium.from_base64(recipientPrivateKeyBase64);
  
  const nonce = payload.slice(0, sodium.crypto_box_NONCEBYTES);
  const ciphertext = payload.slice(sodium.crypto_box_NONCEBYTES);
  
  try {
    const decryptedUint8 = sodium.crypto_box_open_easy(ciphertext, nonce, senderPublicKey, recipientPrivateKey);
    return sodium.to_string(decryptedUint8);
  } catch (error) {
    console.error("Errore di decifratura E2E. Chiavi scorrette o messaggio corrotto.", error);
    return "[Messaggio Illeggibile - Errore Sicurezza]";
  }
}

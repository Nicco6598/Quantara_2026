use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use rand::RngCore;
use sha2::{Digest, Sha256};

const NONCE_SIZE: usize = 12;
const KEY_SIZE: usize = 32;
const SALT_SIZE: usize = 16;

pub fn generate_key() -> [u8; KEY_SIZE] {
    let mut key = [0u8; KEY_SIZE];
    rand::rngs::OsRng.fill_bytes(&mut key);
    key
}

pub fn derive_key_from_passphrase(passphrase: &str, salt: &[u8]) -> [u8; KEY_SIZE] {
    let mut key = [0u8; KEY_SIZE];
    let mut hasher = Sha256::new();
    hasher.update(passphrase.as_bytes());
    hasher.update(salt);
    let mut digest = hasher.finalize();
    for _ in 0..9999 {
        let mut hasher = Sha256::new();
        hasher.update(digest);
        digest = hasher.finalize();
    }
    key.copy_from_slice(&digest[..KEY_SIZE]);
    key
}

pub fn encrypt_data(key: &[u8; KEY_SIZE], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    let mut nonce_bytes = [0u8; NONCE_SIZE];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

pub fn decrypt_data(key: &[u8; KEY_SIZE], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < NONCE_SIZE {
        return Err("Encrypted data too short".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    Ok(plaintext)
}

pub fn generate_salt() -> [u8; SALT_SIZE] {
    let mut salt = [0u8; SALT_SIZE];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    salt
}

pub fn compute_key_check(key: &[u8; KEY_SIZE]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"QuantaraBackupOK");
    hasher.update(key);
    hex_encode(&hasher.finalize())
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = generate_key();
        let plaintext = b"Hello, Quantara! This is sensitive data.";
        let encrypted = encrypt_data(&key, plaintext).expect("encryption failed");
        let decrypted = decrypt_data(&key, &encrypted).expect("decryption failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_decrypt_empty() {
        let key = generate_key();
        let plaintext = b"";
        let encrypted = encrypt_data(&key, plaintext).expect("encryption failed");
        let decrypted = decrypt_data(&key, &encrypted).expect("decryption failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_different_ciphertexts() {
        let key = generate_key();
        let plaintext = b"same data";
        let encrypted1 = encrypt_data(&key, plaintext).expect("encryption 1 failed");
        let encrypted2 = encrypt_data(&key, plaintext).expect("encryption 2 failed");
        assert_ne!(
            encrypted1, encrypted2,
            "two encryptions of same data should differ"
        );
    }

    #[test]
    fn test_wrong_key_fails() {
        let key1 = generate_key();
        let key2 = generate_key();
        let plaintext = b"secret message";
        let encrypted = encrypt_data(&key1, plaintext).expect("encryption failed");
        let result = decrypt_data(&key2, &encrypted);
        assert!(result.is_err(), "decryption with wrong key should fail");
    }

    #[test]
    fn test_derive_key_from_passphrase_deterministic() {
        let salt = generate_salt();
        let key1 = derive_key_from_passphrase("my passphrase", &salt);
        let key2 = derive_key_from_passphrase("my passphrase", &salt);
        assert_eq!(key1, key2, "same passphrase + salt should produce same key");
    }

    #[test]
    fn test_derive_key_different_salt() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();
        let key1 = derive_key_from_passphrase("pass", &salt1);
        let key2 = derive_key_from_passphrase("pass", &salt2);
        assert_ne!(key1, key2, "different salts should produce different keys");
    }

    #[test]
    fn test_derive_key_different_passphrase() {
        let salt = generate_salt();
        let key1 = derive_key_from_passphrase("pass1", &salt);
        let key2 = derive_key_from_passphrase("pass2", &salt);
        assert_ne!(
            key1, key2,
            "different passphrases should produce different keys"
        );
    }

    #[test]
    fn test_roundtrip_with_derived_key() {
        let salt = generate_salt();
        let passphrase = "my-strong-passphrase-123!";
        let key = derive_key_from_passphrase(passphrase, &salt);
        let plaintext = b"encrypted with derived key";
        let encrypted = encrypt_data(&key, plaintext).expect("encryption failed");
        let decrypted = decrypt_data(&key, &encrypted).expect("decryption failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_tampered_data_fails() {
        let key = generate_key();
        let plaintext = b"important data";
        let mut encrypted = encrypt_data(&key, plaintext).expect("encryption failed");
        if encrypted.len() > 13 {
            encrypted[12] ^= 0x01;
        }
        let result = decrypt_data(&key, &encrypted);
        assert!(result.is_err(), "decryption of tampered data should fail");
    }

    #[test]
    fn test_key_size_256_bits() {
        let key = generate_key();
        assert_eq!(key.len(), 32, "AES-256 requires 32-byte key");
    }

    #[test]
    fn test_nonce_size_12_bytes() {
        let key = generate_key();
        let plaintext = b"test";
        let encrypted = encrypt_data(&key, plaintext).expect("encryption failed");
        let nonce = &encrypted[..12];
        assert_eq!(nonce.len(), 12, "GCM nonce should be 12 bytes");
    }
}

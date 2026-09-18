import os
import struct
import time
import zlib
import json
import pickle
from typing import Dict, List, Optional, Tuple

class BitcaskWalEngine:
    """
    DDIA Chapter 3 Bitcask Log-Structured Append-Only Storage Engine.
    
    Features:
    - Sequential append-only WAL format:
      [CRC32: 4B][Timestamp: 8B][Tombstone: 1B][KeyLen: 2B][ValLen: 4B][Key][Value]
    - In-memory Keydir: {key -> (offset, size, timestamp)}
    - In-memory hot embeddings cache for O(1) in-memory vector similarity searches.
    - Crash-safe recovery by sequentially scanning the append log on startup.
    - CRC32 data integrity verification on every record.
    - Garbage collection & compaction to eliminate superseded vector records.
    - Auto-migration from legacy pickle storage on initial setup.
    """
    
    # 4 (CRC32) + 8 (Timestamp float) + 1 (Tombstone flag) + 2 (KeyLen) + 4 (ValLen) = 19 bytes
    HEADER_FORMAT = "!IdBHI"
    HEADER_SIZE = struct.calcsize(HEADER_FORMAT)
    
    def __init__(self, wal_path: str = "./embeddings/embeddings.wal", legacy_pickle_path: Optional[str] = "./embeddings/embs_facenet512.pkl"):
        self.wal_path = os.path.abspath(wal_path)
        self.legacy_pickle_path = os.path.abspath(legacy_pickle_path) if legacy_pickle_path else None
        
        os.makedirs(os.path.dirname(self.wal_path), exist_ok=True)
        
        self._keydir: Dict[str, Tuple[int, int, float]] = {} # key -> (offset, size, timestamp)
        self._cache: Dict[str, List[float]] = {}             # key -> embedding vector
        
        # Check if legacy migration is needed before opening
        if not os.path.exists(self.wal_path) and self.legacy_pickle_path and os.path.exists(self.legacy_pickle_path):
            self._migrate_legacy_pickle()
            
        self._file = open(self.wal_path, "a+b")
        self._recover()

    def _migrate_legacy_pickle(self):
        """Migrates legacy single-file pickle database into the append-only WAL."""
        print(f"[DDIA-WAL] Migrating legacy pickle {self.legacy_pickle_path} to WAL {self.wal_path}...")
        try:
            with open(self.legacy_pickle_path, "rb") as pf:
                legacy_data = pickle.load(pf)
            with open(self.wal_path, "wb") as wf:
                for key, emb in legacy_data.items():
                    val_bytes = json.dumps(emb).encode("utf-8")
                    k_bytes = str(key).encode("utf-8")
                    ts = time.time()
                    tombstone = 0
                    
                    # CRC calculated over header payload + key + val
                    raw_header_payload = struct.pack("!dBHI", ts, tombstone, len(k_bytes), len(val_bytes))
                    crc = zlib.crc32(raw_header_payload + k_bytes + val_bytes) & 0xffffffff
                    full_header = struct.pack("!I", crc) + raw_header_payload
                    wf.write(full_header + k_bytes + val_bytes)
                wf.flush()
                os.fsync(wf.fileno())
            print(f"[DDIA-WAL] Migration complete. Converted {len(legacy_data)} records to WAL.")
        except Exception as e:
            print(f"[DDIA-WAL] Migration skipped or failed: {e}")

    def _recover(self):
        """Crash-recovery: Rebuilds Keydir and memory cache by scanning WAL sequentially."""
        self._file.seek(0)
        valid_records = 0
        corrupt_records = 0
        
        while True:
            offset = self._file.tell()
            header_bytes = self._file.read(self.HEADER_SIZE)
            if not header_bytes or len(header_bytes) < self.HEADER_SIZE:
                break
                
            crc, ts, tombstone, k_len, v_len = struct.unpack(self.HEADER_FORMAT, header_bytes)
            raw_payload = self._file.read(k_len + v_len)
            if len(raw_payload) < (k_len + v_len):
                print(f"[DDIA-WAL] Warning: Truncated record detected at offset {offset}. Discarding.")
                corrupt_records += 1
                break
                
            raw_header_payload = header_bytes[4:]
            expected_crc = zlib.crc32(raw_header_payload + raw_payload) & 0xffffffff
            if crc != expected_crc:
                print(f"[DDIA-WAL] Error: CRC mismatch at offset {offset} (stored={crc}, calculated={expected_crc})")
                corrupt_records += 1
                continue
                
            key = raw_payload[:k_len].decode("utf-8")
            val_bytes = raw_payload[k_len:]
            
            record_size = self.HEADER_SIZE + k_len + v_len
            
            if tombstone == 1:
                # Deleted key
                self._keydir.pop(key, None)
                self._cache.pop(key, None)
            else:
                self._keydir[key] = (offset, record_size, ts)
                try:
                    self._cache[key] = json.loads(val_bytes.decode("utf-8"))
                    valid_records += 1
                except Exception as e:
                    print(f"[DDIA-WAL] Error deserializing value for key {key}: {e}")
                    
        print(f"[DDIA-WAL] Rebuilt index: {len(self._cache)} active keys recovered ({valid_records} valid, {corrupt_records} corrupt).")

    def put(self, key: str, embedding: List[float]) -> None:
        """Appends a new embedding record to the WAL and updates the memory index."""
        k_bytes = str(key).encode("utf-8")
        val_bytes = json.dumps(embedding).encode("utf-8")
        ts = time.time()
        tombstone = 0
        
        raw_header_payload = struct.pack("!dBHI", ts, tombstone, len(k_bytes), len(val_bytes))
        crc = zlib.crc32(raw_header_payload + k_bytes + val_bytes) & 0xffffffff
        full_header = struct.pack("!I", crc) + raw_header_payload
        
        record = full_header + k_bytes + val_bytes
        
        self._file.seek(0, os.SEEK_END)
        offset = self._file.tell()
        self._file.write(record)
        self._file.flush()
        try:
            os.fsync(self._file.fileno())
        except OSError:
            pass # Non-critical on some virtual file systems
            
        self._keydir[key] = (offset, len(record), ts)
        self._cache[key] = embedding

    def delete(self, key: str) -> bool:
        """Appends a tombstone record to remove a key."""
        if key not in self._keydir:
            return False
        k_bytes = str(key).encode("utf-8")
        val_bytes = b""
        ts = time.time()
        tombstone = 1
        
        raw_header_payload = struct.pack("!dBHI", ts, tombstone, len(k_bytes), len(val_bytes))
        crc = zlib.crc32(raw_header_payload + k_bytes + val_bytes) & 0xffffffff
        full_header = struct.pack("!I", crc) + raw_header_payload
        
        record = full_header + k_bytes + val_bytes
        self._file.seek(0, os.SEEK_END)
        self._file.write(record)
        self._file.flush()
        
        self._keydir.pop(key, None)
        self._cache.pop(key, None)
        return True

    def get(self, key: str) -> Optional[List[float]]:
        """Returns the embedding vector from the in-memory cache or WAL."""
        if key in self._cache:
            return self._cache[key]
        if key not in self._keydir:
            return None
        offset, size, _ = self._keydir[key]
        self._file.seek(offset)
        raw = self._file.read(size)
        if len(raw) < self.HEADER_SIZE:
            return None
        _, _, _, k_len, v_len = struct.unpack(self.HEADER_FORMAT, raw[:self.HEADER_SIZE])
        val_bytes = raw[self.HEADER_SIZE + k_len : self.HEADER_SIZE + k_len + v_len]
        vec = json.loads(val_bytes.decode("utf-8"))
        self._cache[key] = vec
        return vec

    def all_embeddings(self) -> Dict[str, List[float]]:
        """Returns all active key-embedding pairs."""
        return self._cache

    def compact(self) -> None:
        """
        Garbage collection & compaction (DDIA Chapter 3).
        Writes only active, latest records to a temporary file, then atomically renames it.
        """
        compact_path = self.wal_path + ".compact"
        with open(compact_path, "wb") as cf:
            for key, (offset, size, ts) in self._keydir.items():
                emb = self._cache.get(key)
                if emb is None:
                    continue
                k_bytes = key.encode("utf-8")
                val_bytes = json.dumps(emb).encode("utf-8")
                tombstone = 0
                
                raw_header_payload = struct.pack("!dBHI", ts, tombstone, len(k_bytes), len(val_bytes))
                crc = zlib.crc32(raw_header_payload + k_bytes + val_bytes) & 0xffffffff
                full_header = struct.pack("!I", crc) + raw_header_payload
                cf.write(full_header + k_bytes + val_bytes)
            cf.flush()
            try:
                os.fsync(cf.fileno())
            except OSError:
                pass
                
        self._file.close()
        os.replace(compact_path, self.wal_path)
        self._file = open(self.wal_path, "a+b")
        self._recover()
        print(f"[DDIA-WAL] Compaction finished. Current WAL size: {os.path.getsize(self.wal_path)} bytes.")

    def close(self):
        if self._file and not self._file.closed:
            self._file.close()

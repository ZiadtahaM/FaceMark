import os
import shutil
import unittest
from wal_engine import BitcaskWalEngine

class TestBitcaskWalEngine(unittest.TestCase):
    def setUp(self):
        self.test_dir = "./test_wal_storage_unit"
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        self.wal_path = os.path.join(self.test_dir, "embeddings.wal")
        self.engine = BitcaskWalEngine(self.wal_path)

    def tearDown(self):
        self.engine.close()
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_put_get(self):
        vec = [0.5, 0.25, -0.75]
        self.engine.put("std_100", vec)
        self.assertEqual(self.engine.get("std_100"), vec)
        self.assertIn("std_100", self.engine.all_embeddings())

    def test_crash_recovery(self):
        self.engine.put("std_A", [1.0, 2.0])
        self.engine.put("std_B", [3.0, 4.0])
        self.engine.put("std_A", [9.0, 9.0])
        self.engine.close()

        recovered = BitcaskWalEngine(self.wal_path)
        self.assertEqual(recovered.get("std_A"), [9.0, 9.0])
        self.assertEqual(recovered.get("std_B"), [3.0, 4.0])
        recovered.close()

    def test_compaction(self):
        for i in range(15):
            self.engine.put("heavy_key", [float(i)])
        size_before = os.path.getsize(self.wal_path)
        self.engine.compact()
        size_after = os.path.getsize(self.wal_path)
        self.assertLess(size_after, size_before)
        self.assertEqual(self.engine.get("heavy_key"), [14.0])

if __name__ == "__main__":
    unittest.main()

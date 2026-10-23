import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("verify_app_image", Path(__file__).parents[2] / "scripts/verify-app-image.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class ImageArchiveTests(unittest.TestCase):
    revision = "a" * 40

    def archive(self, directory, tag=None, revision=None, count=1):
        config = json.dumps({"config": {"Labels": {"org.opencontainers.image.revision": revision or self.revision}}}).encode()
        digest = hashlib.sha256(config).hexdigest()
        config_path = "blobs/sha256/" + digest
        manifest = [{"Config": config_path, "RepoTags": [tag or "lostark-party-app:" + self.revision]}] * count
        path = Path(directory) / "image.tar.gz"
        with tarfile.open(path, "w:gz") as archive:
            for name, content in [("manifest.json", json.dumps(manifest).encode()), (config_path, config)]:
                entry = tarfile.TarInfo(name)
                entry.size = len(content)
                archive.addfile(entry, io.BytesIO(content))
        return path, "sha256:" + digest

    def test_reads_config_digest_independently_of_engine_image_id(self):
        with tempfile.TemporaryDirectory(prefix="lostark-image-test-") as directory:
            path, digest = self.archive(directory)
            self.assertEqual(verifier.verify(path, self.revision), digest)

    def test_rejects_another_tag(self):
        with tempfile.TemporaryDirectory(prefix="lostark-image-test-") as directory:
            path, _ = self.archive(directory, tag="different-app:latest")
            with self.assertRaises(ValueError):
                verifier.verify(path, self.revision)

    def test_rejects_another_revision(self):
        with tempfile.TemporaryDirectory(prefix="lostark-image-test-") as directory:
            path, _ = self.archive(directory, revision="b" * 40)
            with self.assertRaises(ValueError):
                verifier.verify(path, self.revision)

    def test_rejects_multiple_images(self):
        with tempfile.TemporaryDirectory(prefix="lostark-image-test-") as directory:
            path, _ = self.archive(directory, count=2)
            with self.assertRaises(ValueError):
                verifier.verify(path, self.revision)


if __name__ == "__main__":
    unittest.main()

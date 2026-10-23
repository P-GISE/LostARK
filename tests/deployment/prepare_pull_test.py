import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).parents[2]
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-pull-install.py')
prepare=importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class PrepareTests(unittest.TestCase):
    def test_prepares_git_blobs_not_dirty_worktree_and_will_not_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/'source';source.mkdir()
            def git(*args):return subprocess.check_output(['git','-C',str(source),*args],stderr=subprocess.DEVNULL)
            git('init')
            for path in prepare.SOURCE_FILES.values():
                file=source/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(b'reviewed content\n')
            schema=source/'prisma/schema.prisma';schema.parent.mkdir();schema.write_bytes(b'synthetic schema\n')
            git('add','.')
            git('-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-m','fixture')
            revision=git('rev-parse','HEAD').decode().strip()
            (source/'scripts/pull-aws-app.py').write_bytes(b'unreviewed dirty change')
            target=Path(temp)/'stage'
            prepare.prepare(source,revision,'sha256:'+'b'*64,'c'*64,target)
            manifest=json.loads((target/'reviewed.json').read_text())
            self.assertEqual((target/'pull-aws-app.py').read_bytes(),b'reviewed content\n')
            self.assertEqual(manifest['installed']['pull-aws-app.py'],hashlib.sha256(b'reviewed content\n').hexdigest())
            self.assertIn('prisma/schema.prisma',manifest['protected'])
            with self.assertRaises(FileExistsError):prepare.prepare(source,revision,'sha256:'+'b'*64,'c'*64,target)


if __name__=='__main__':unittest.main()

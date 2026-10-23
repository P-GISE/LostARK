#!/usr/bin/env python3
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

spec = importlib.util.spec_from_file_location('pull', Path(__file__).with_name('pull-aws-app.py'))
pull = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pull)
SOURCE_FILES = {
    'pull-aws-app.py': 'scripts/pull-aws-app.py',
    'deploy-aws-app.sh': 'scripts/deploy-aws-app.sh',
    'verify-app-image.py': 'scripts/verify-app-image.py',
    'app-only.compose.yml': 'deploy/app-only.compose.yml',
    'lostark-deploy.service': 'deploy/lostark-deploy.service',
    'lostark-deploy.timer': 'deploy/lostark-deploy.timer',
}


def prepare(source, revision, initial_image, compose_digest, destination):
    pull.sha(revision)
    pull.require(re.fullmatch('sha256:[0-9a-f]{64}', initial_image), 'Invalid initial image')
    pull.require(re.fullmatch('[0-9a-f]{64}', compose_digest), 'Invalid runtime Compose digest')
    def git(*args):
        return subprocess.check_output(['git', '-C', str(source), *args], stderr=subprocess.DEVNULL)
    pull.require(git('rev-parse', revision + '^{commit}').decode().strip() == revision, 'Exact commit required')
    entries = []
    for row in git('ls-tree', '-rz', revision).split(b'\0'):
        if row:
            metadata, path = row.split(b'\t', 1)
            mode, kind, digest = metadata.decode().split()
            entries.append({'path': path.decode(), 'mode': mode, 'type': kind, 'sha': digest})
    files = {name: git('show', revision + ':' + path) for name, path in SOURCE_FILES.items()}
    manifest = {'reviewed_revision': revision, 'initial_image': initial_image,
                'runtime_compose_sha256': compose_digest,
                'protected': pull.protected_tree({'truncated': False, 'tree': entries}),
                'installed': {name: hashlib.sha256(content).hexdigest() for name, content in files.items()
                              if name in pull.FIXED_FILES | {'pull-aws-app.py'}}}
    destination.mkdir(mode=0o700)
    for name, content in files.items():
        (destination / name).write_bytes(content)
    (destination / 'reviewed.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    if len(sys.argv) != 6:
        sys.exit('Usage: prepare-pull-install.py SOURCE EXACT_REVIEWED_SHA INITIAL_IMAGE COMPOSE_SHA256 NEW_STAGE')
    prepare(Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], Path(sys.argv[5]))

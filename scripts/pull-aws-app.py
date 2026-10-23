#!/usr/bin/env python3
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
import zipfile

REPO = 'P-GISE/LostARK'
WORKFLOW = '.github/workflows/deploy-vps.yml'
INSTALL = Path('/usr/local/lib/lostark-deploy')
STATE = Path('/var/lib/lostark-deploy')
APP = Path('/opt/lostark-party')
FIXED_FILES = {'deploy-aws-app.sh', 'verify-app-image.py', 'app-only.compose.yml'}
BUNDLE_FILES = FIXED_FILES | {'image.tar.gz', 'image.tar.gz.sha256', 'ci-image-id.txt',
                             'image-size.txt', 'image-config-digest.txt', 'prisma.sha256'}
MAX_ARCHIVE = 2 * 1024**3
MAX_EXPANDED = 4 * 1024**3
RESERVE = 512 * 1024**2


class GateError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise GateError(message)


def sha(value):
    require(isinstance(value, str) and re.fullmatch('[0-9a-f]{40}', value), 'Invalid revision')
    return value


def gh_command(endpoint):
    return ['/usr/sbin/runuser', '-u', 'ubuntu', '--', '/usr/bin/env', '-i',
            'HOME=/home/ubuntu', 'PATH=/usr/bin:/bin', 'GH_PROMPT_DISABLED=1',
            '/usr/bin/gh', 'api', 'repos/' + REPO + '/' + endpoint]


def api(endpoint):
    result = subprocess.run(gh_command(endpoint), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            timeout=90, check=True)
    require(len(result.stdout) < 16 * 1024**2, 'Unexpected metadata size')
    return json.loads(result.stdout)


def download(endpoint, target, limit):
    with target.open('xb') as output:
        process = subprocess.Popen(gh_command(endpoint), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        deadline = threading.Timer(600, process.kill)
        deadline.start()
        try:
            for block in iter(lambda: process.stdout.read(1024**2), b''):
                require(output.tell() + len(block) <= limit, 'Artifact exceeds declared limit')
                output.write(block)
            require(process.wait() == 0, 'Artifact download failed')
        finally:
            deadline.cancel()
            if process.poll() is None:
                process.kill()
                process.wait()
            process.stdout.close()


def validate_run(run, revision):
    require(run.get('head_sha') == sha(revision) and run.get('head_branch') == 'main'
            and run.get('event') == 'push' and run.get('status') == 'completed'
            and run.get('conclusion') == 'success' and run.get('path') == WORKFLOW
            and run.get('repository', {}).get('full_name') == REPO
            and run.get('head_repository', {}).get('full_name') == REPO,
            'Run is not the successful current main push')
    require(isinstance(run.get('id'), int) and run['id'] > 0, 'Invalid run ID')


def protected_tree(tree):
    require(tree.get('truncated') is False, 'Incomplete source tree')
    protected = {}
    for item in tree['tree']:
        path = item['path']
        guarded = (any(path == p[:-1] or path.startswith(p) for p in ('.github/', 'deploy/', 'scripts/', 'prisma/'))
                   or path in ('Dockerfile', '.dockerignore') or path.startswith('docker-compose'))
        if guarded and item['type'] != 'tree':
            require(item['type'] == 'blob' and item.get('mode', '100644') in ('100644', '100755'),
                    'Unsupported protected source entry')
            protected[path] = sha(item['sha'])
    return protected


def select_artifact(data, run_id, revision):
    require(data.get('total_count', len(data['artifacts'])) <= 100, 'Artifact pagination requires review')
    matches = [a for a in data['artifacts'] if a['name'] == 'lostark-aws-' + revision]
    require(len(matches) == 1, 'Expected one release artifact')
    a = matches[0]
    require(not a.get('expired', True) and isinstance(a.get('id'), int) and a['id'] > 0
            and 0 < a.get('size_in_bytes', 0) <= MAX_ARCHIVE
            and re.fullmatch('sha256:[0-9a-f]{64}', a.get('digest') or '')
            and a.get('workflow_run', {}).get('id') == run_id
            and a['workflow_run'].get('head_sha') == revision
            and a['workflow_run'].get('head_branch') == 'main', 'Invalid release artifact identity')
    return a


def check_digest(path, expected):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024**2), b''):
            digest.update(block)
    require('sha256:' + digest.hexdigest() == expected, 'Artifact digest mismatch')


def extract_bundle(archive, destination, install):
    with zipfile.ZipFile(archive) as z:
        entries = z.infolist()
        names = [entry.filename for entry in entries]
        require(len(names) == len(BUNDLE_FILES) and set(names) == BUNDLE_FILES, 'Unexpected or duplicate ZIP entry')
        require(sum(entry.file_size for entry in entries) <= MAX_EXPANDED, 'Expanded artifact too large')
        for entry in entries:
            mode = entry.external_attr >> 16
            require(not entry.is_dir() and stat.S_IFMT(mode) in (0, stat.S_IFREG)
                    and not entry.flag_bits & 1, 'Unsupported ZIP entry')
            require(entry.filename == 'image.tar.gz' or entry.file_size <= 1024**2, 'Metadata too large')
        for name in FIXED_FILES:
            require(z.read(name) == (install / name).read_bytes(), 'Downloaded deploy tooling requires review')
        destination.mkdir(mode=0o700)
        for entry in entries:
            with z.open(entry) as source, (destination / entry.filename).open('xb') as target:
                shutil.copyfileobj(source, target, 1024**2)


def atomic_json(path, value):
    temporary = path.with_suffix('.tmp')
    with temporary.open('w', encoding='utf-8') as output:
        json.dump(value, output, sort_keys=True)
        output.write('\n')
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)
    sync_directory(path.parent)


def sync_directory(path):
    if os.name == 'posix':
        directory = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)


def current_image():
    images = []
    for name in ('web', 'worker', 'character-worker'):
        value = subprocess.check_output(['/usr/bin/docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}',
                                         'lostark-party-' + name + '-1'], stderr=subprocess.DEVNULL, text=True).strip()
        require(re.fullmatch('sha256:[0-9a-f]{64} true', value), 'Current app is not running')
        images.append(value.split()[0])
    require(len(set(images)) == 1, 'Current app images differ')
    return images[0]


def execute_deployer(command):
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   env={'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root', 'LANG': 'C.UTF-8'})


def poll(install=INSTALL, state=STATE, app=APP):
    marker = state / 'recovery-required'
    require(not marker.exists() and not (app / '.app-deployment-in-progress').exists(), 'Recovery review required')
    manifest = json.loads((install / 'reviewed.json').read_text())
    check_digest(app / 'docker-compose.vps.yml', 'sha256:' + manifest['runtime_compose_sha256'])
    previous = json.loads((state / 'deployed.json').read_text()) if (state / 'deployed.json').exists() else None
    require(current_image() == (previous['image'] if previous else manifest['initial_image']), 'Runtime baseline drift')
    revision = sha(api('git/ref/heads/main')['object']['sha'])
    if previous and previous['revision'] == revision:
        print('UP_TO_DATE')
        return
    require(protected_tree(api('git/trees/' + revision + '?recursive=1')) == manifest['protected'], 'Protected source changed; installation review required')
    runs = api('actions/workflows/deploy-vps.yml/runs?branch=main&event=push&head_sha=' + revision + '&per_page=100')['workflow_runs']
    if not runs:
        print('WAITING_FOR_CI')
        return
    run = max(runs, key=lambda item: item['id'])
    if run.get('status') != 'completed':
        print('WAITING_FOR_CI')
        return
    validate_run(run, revision)
    artifact = select_artifact(api('actions/runs/' + str(run['id']) + '/artifacts?per_page=100'), run['id'], revision)
    require(shutil.disk_usage(state)[2] > artifact['size_in_bytes'] + MAX_EXPANDED + RESERVE, 'Insufficient staging disk')
    with tempfile.TemporaryDirectory(prefix='candidate-', dir=state) as temporary:
        directory = Path(temporary)
        archive = directory / 'artifact.zip'
        download('actions/artifacts/' + str(artifact['id']) + '/zip', archive, artifact['size_in_bytes'])
        require(archive.stat().st_size == artifact['size_in_bytes'], 'Artifact byte count mismatch')
        check_digest(archive, artifact['digest'])
        bundle = directory / 'bundle'
        extract_bundle(archive, bundle, install)
        size = (bundle / 'image-size.txt').read_text().strip()
        require(re.fullmatch('[0-9]{1,12}', size) and 0 < int(size) <= MAX_EXPANDED, 'Invalid image size')
        require(shutil.disk_usage(app)[2] > int(size) * 2 + RESERVE, 'Insufficient image and rollback disk')
        require(api('git/ref/heads/main')['object']['sha'] == revision, 'Main advanced during verification')
        atomic_json(marker, {'revision': revision, 'run': run['id'], 'status': 'deployment-started'})
        execute_deployer(['/bin/bash', str(install / 'deploy-aws-app.sh'), revision, str(bundle)])
        fields = (app / '.last-app-deployment').read_text().split()
        require(len(fields) == 3 and fields[0] == revision and re.fullmatch('sha256:[0-9a-f]{64}', fields[1]), 'Deployment state mismatch')
        atomic_json(state / 'deployed.json', {'revision': revision, 'image': fields[1], 'run': run['id'], 'artifact': artifact['id']})
        marker.unlink()
        sync_directory(state)
        print('DEPLOYED ' + revision)


def validate_install():
    require(os.geteuid() == 0, 'Root-owned deployment service required')
    manifest = json.loads((INSTALL / 'reviewed.json').read_text())
    require(set(manifest['installed']) == FIXED_FILES | {'pull-aws-app.py'}, 'Incomplete installed manifest')
    require(re.fullmatch('sha256:[0-9a-f]{64}', manifest['initial_image']), 'Invalid baseline image')
    sha(manifest['reviewed_revision'])
    for path in [INSTALL, STATE, INSTALL / 'reviewed.json'] + [INSTALL / name for name in manifest['installed']]:
        metadata = path.lstat()
        require(not stat.S_ISLNK(metadata.st_mode) and metadata.st_uid == 0 and not metadata.st_mode & 0o022, 'Installed deployment path is writable or untrusted')
    for name, digest in manifest['installed'].items():
        check_digest(INSTALL / name, 'sha256:' + digest)


if __name__ == '__main__':
    try:
        import fcntl
        os.umask(0o077)
        validate_install()
        with (STATE / 'poll.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            poll()
    except GateError as failure:
        print('PULL_DEPLOY_BLOCKED: ' + str(failure), file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Raw tool errors can contain authenticated download URLs or environment values.
        print('PULL_DEPLOY_FAILED: inspect CI metadata and recovery markers', file=sys.stderr)
        sys.exit(1)

"""Discovery imports only this trusted launcher; target tests run exclusively in Docker."""
import hashlib
import json
import os
from pathlib import Path
import resource
import stat
import subprocess
import tempfile
import unittest
import uuid

IMAGE = 'docker.io/library/python@sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9'
CONFIG_ID = 'sha256:b7ddb46f14cdb6312b0ac3816e0513fe55904bd66e4525b8845058d3c1aa0f79'
MANIFEST_ID = 'sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9'
IMAGE_IDS = frozenset((CONFIG_ID, MANIFEST_ID))
LABEL = 'lostark-event-ci.sandbox=1'
ROOT = Path(__file__).resolve().parents[2]
FILES = ('scripts/deploy/event_ssm.py', 'tests/deployment/fixture_event_ssm.py',
         'tests/deployment/lostark-event-document.json')


def docker(*args, timeout=30):
    result = subprocess.run(['docker', *args], capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('isolated_event_test_docker_failed')
    if len(result.stdout) + len(result.stderr) > 131072:
        raise RuntimeError('isolated_event_test_output_limit')
    return result.stdout


def inspect_container(name):
    reply = subprocess.run(['docker', 'container', 'inspect', name], capture_output=True, timeout=30)
    if len(reply.stdout) + len(reply.stderr) > 131072:
        raise RuntimeError('sandbox_inspect_output_limit')
    if reply.returncode:
        missing = (('Error response from daemon: No such container: ' + name).encode(),
                   ('Error: No such container: ' + name).encode())
        if reply.returncode == 1 and reply.stderr.strip() in missing and reply.stdout.strip() in (b'', b'[]'):
            return None
        raise RuntimeError('sandbox_inspect_failed_not_proven_absent')
    records = json.loads(reply.stdout)
    if not isinstance(records, list) or len(records) != 1:
        raise RuntimeError('sandbox_inspect_invalid')
    return records[0]


def cleanup_owned(name, source, container_id=None):
    owned = inspect_container(name)
    if owned is not None:
        mounts = owned.get('Mounts', [])
        expected = (owned.get('Name') == '/' + name
            and owned.get('Config', {}).get('Labels', {}).get('lostark-event-ci.sandbox') == '1'
            and owned.get('Image') in IMAGE_IDS
            and len(mounts) == 1 and mounts[0].get('Source') == str(source.resolve())
            and mounts[0].get('Destination') == '/fixture' and mounts[0].get('RW') is False
            and isinstance(owned.get('Id'), str) and len(owned['Id']) == 64
            and all(char in '0123456789abcdef' for char in owned['Id'])
            and (container_id is None or owned['Id'] == container_id))
        if not expected:
            raise RuntimeError('sandbox_cleanup_ownership_not_proven')
        docker('rm', '--force', owned['Id'])
    if inspect_container(name) is not None:
        raise RuntimeError('own_sandbox_cleanup_failed')


class EventSSMIsolatedTest(unittest.TestCase):
    def test_event_contract_in_os_sandbox(self):
        self.assertEqual(os.name, 'posix', 'Linux Docker runner required; never run target tests on host')
        # Only the trusted launcher fetches an immutable toolchain; target execution has no network.
        docker('pull', '--quiet', '--platform', 'linux/amd64', IMAGE, timeout=180)
        image = json.loads(docker('image', 'inspect', IMAGE))[0]
        self.assertTrue(any(value in (IMAGE, IMAGE.removeprefix('docker.io/library/')) for value in image['RepoDigests']))
        self.assertIn(image['Id'], IMAGE_IDS)
        self.assertEqual((image['Os'], image['Architecture']), ('linux', 'amd64'))
        user = str(os.getuid()) + ':' + str(os.getgid())
        self.assertFalse(image['Config'].get('Volumes'), 'anonymous image volumes are forbidden')
        name = 'lostark-event-ci-' + uuid.uuid4().hex
        container_id = None
        with tempfile.TemporaryDirectory(prefix='lostark-event-ci-') as temporary:
            stage = Path(temporary)
            stage.chmod(0o700)
            source = stage / 'source'
            source.mkdir(mode=0o700)
            for relative in FILES:
                origin = ROOT / relative
                self.assertEqual(origin.resolve(), origin, 'source symlink parents forbidden')
                before = origin.lstat()
                self.assertTrue(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and 0 < before.st_size < 131072)
                with os.fdopen(os.open(origin, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as stream:
                    self.assertEqual((before.st_dev, before.st_ino), (os.fstat(stream.fileno()).st_dev, os.fstat(stream.fileno()).st_ino))
                    raw = stream.read(131072)
                self.assertEqual(len(raw), before.st_size)
                target = source / relative
                target.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
                target.write_bytes(raw)
                target.chmod(0o600)
                self.assertEqual(hashlib.sha256(target.read_bytes()).digest(), hashlib.sha256(raw).digest())
            try:
                args = ['create', '--name', name, '--label', LABEL, '--pull', 'never', '--network', 'none',
                    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                    '--cpus', '0.25', '--memory', '128m', '--memory-swap', '128m', '--pids-limit', '32',
                    '--ulimit', 'fsize=1048576:1048576', '--ulimit', 'nofile=128:128', '--ulimit', 'cpu=20:20',
                    '--ipc', 'none', '--log-driver', 'none', '--user', user, '--workdir', '/scratch',
                    '--tmpfs', '/scratch:rw,nosuid,nodev,noexec,size=16m,mode=700,uid=' + str(os.getuid()) + ',gid=' + str(os.getgid()),
                    '--mount', 'type=bind,src=' + str(source.resolve()) + ',dst=/fixture,readonly',
                    '--entrypoint', '/usr/bin/env', IMAGE, '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
                    'HOME=/scratch', 'TMPDIR=/scratch', 'XDG_CACHE_HOME=/scratch/cache', 'LANG=C.UTF-8',
                    '/usr/local/bin/python3', '-I', '-B', '/fixture/tests/deployment/fixture_event_ssm.py']
                container_id = docker(*args).decode().strip()
                self.assertRegex(container_id, r'^[0-9a-f]{64}$')
                data = json.loads(docker('inspect', container_id))[0]
                host = data['HostConfig']
                self.assertEqual(data['Image'], image['Id'])
                self.assertEqual(host['NetworkMode'], 'none')
                self.assertTrue(host['ReadonlyRootfs'])
                self.assertEqual(host['CapDrop'], ['ALL'])
                self.assertFalse(host.get('CapAdd') or host.get('Privileged'))
                self.assertEqual(host['Memory'], 128 * 1024**2)
                self.assertEqual(host['MemorySwap'], host['Memory'])
                self.assertEqual(host['NanoCpus'], 250000000)
                self.assertEqual(host['PidsLimit'], 32)
                self.assertEqual(host['SecurityOpt'], ['no-new-privileges'])
                self.assertEqual(data['Config']['User'], user)
                self.assertEqual(len(data['Mounts']), 1)
                self.assertEqual(data['Mounts'][0]['Source'], str(source.resolve()))
                self.assertEqual(data['Mounts'][0]['Destination'], '/fixture')
                self.assertFalse(data['Mounts'][0]['RW'])
                def bound_output():
                    resource.setrlimit(resource.RLIMIT_FSIZE, (131072, 131072))
                with (stage / 'stdout').open('w+b') as output, (stage / 'stderr').open('w+b') as errors:
                    result = subprocess.run(['docker', 'start', '--attach', container_id], stdout=output, stderr=errors,
                                            timeout=60, preexec_fn=bound_output)
                    output.seek(0); errors.seek(0)
                    raw, diagnostic = output.read(131073), errors.read(131073)
                self.assertLessEqual(len(raw), 131072)
                self.assertLessEqual(len(diagnostic), 131072)
                state = json.loads(docker('inspect', container_id))[0]['State']
                self.assertEqual(result.returncode, 0, 'isolated fixture failed')
                self.assertEqual(state['ExitCode'], 0)
                self.assertFalse(state['OOMKilled'])
                receipt = json.loads(raw.decode().strip().splitlines()[-1])
                self.assertTrue(receipt['passed'])
                self.assertEqual(receipt['tests'], 14)
                self.assertEqual((receipt['failures'], receipt['errors'], receipt['skips']), (0, 0, 0))
                print('LostARK event contract:14 isolated tests passed')
            finally:
                # A failed/ambiguous create response still requires full ownership evidence.
                cleanup_owned(name, source, container_id)

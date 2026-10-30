"""Parent sandbox only: synthetic metadata/API replies, no network or AWS calls."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('candidate_event_ssm', HERE.parents[1] / 'scripts/deploy/event_ssm.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
SHA = 'a' * 40
RUN = 123
ARTIFACT = 456
DIGEST = 'sha256:' + 'b' * 64
COMMAND = '12345678-1234-1234-1234-123456789abc'


class Contract(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.event_path = Path(self.temporary.name) / 'event.json'
        self.run = {'id': RUN, 'head_sha': SHA, 'head_branch': 'main', 'event': 'push', 'status': 'completed',
                    'conclusion': 'success', 'path': helper.WORKFLOW, 'name': helper.NAME, 'run_attempt': 1,
                    'repository': {'full_name': helper.REPO}, 'head_repository': {'full_name': helper.REPO}}
        self.event = {'repository': {'full_name': helper.REPO}, 'action': 'completed', 'workflow_run': copy.deepcopy(self.run)}
        self.artifact = {'name': 'lostark-aws-' + SHA, 'expired': False, 'id': ARTIFACT, 'size_in_bytes': 12345,
                         'digest': DIGEST, 'workflow_run': {'id': RUN, 'head_sha': SHA, 'head_branch': 'main'}}
        self.head = SHA
        self.write_event()
        self.env = patch.dict(os.environ, {'GITHUB_REPOSITORY': helper.REPO, 'GITHUB_EVENT_NAME': 'workflow_run',
            'GITHUB_REF': 'refs/heads/main', 'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_EVENT_PATH': str(self.event_path),
            'DEPLOY_ENABLED': 'true', 'GH_TOKEN': 'dummy', 'EXPECTED_DOCUMENT_SHA256': 'c' * 64}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.api_patch = patch.object(helper, 'api', self.api)
        self.api_patch.start()
        self.addCleanup(self.api_patch.stop)
        self.selected = {'sha': SHA, 'run_id': RUN, 'artifact_id': ARTIFACT, 'artifact_digest': DIGEST, 'artifact_bytes': 12345}
        self.calls = []
        self.doc = {'Name': helper.DOCUMENT, 'DocumentVersion': '1', 'DocumentType': 'Command',
                    'DocumentFormat': 'JSON', 'Status': 'Active', 'Content': (HERE / 'lostark-event-document.json').read_text()}
        self.sent = {'Command': {'CommandId': COMMAND, 'DocumentName': helper.DOCUMENT, 'DocumentVersion': '1',
                                 'InstanceIds': [helper.INSTANCE], 'Parameters': {'Sha': [SHA], 'RunId': [str(RUN)]}}}
        self.receipt = {'status': 'verified', 'sha': SHA, 'requested_run_id': RUN, 'deployed_run_id': RUN,
                        'artifact_run_id': RUN, 'artifact_id': ARTIFACT, 'artifact_digest': DIGEST, 'image': 'sha256:' + 'd' * 64}
        self.invocation = {'CommandId': COMMAND, 'InstanceId': helper.INSTANCE, 'DocumentName': helper.DOCUMENT,
                           'DocumentVersion': '1', 'PluginName': helper.PLUGIN, 'Status': 'Success', 'ResponseCode': 0,
                           'StandardOutputContent': json.dumps(self.receipt), 'StandardErrorContent': ''}

    def write_event(self):
        self.event_path.write_text(json.dumps(self.event))

    def api(self, endpoint):
        if endpoint == 'git/ref/heads/main':
            return {'object': {'sha': self.head}}
        if endpoint == 'actions/runs/' + str(RUN):
            return copy.deepcopy(self.run)
        if endpoint.endswith('/artifacts?per_page=100'):
            return {'total_count': 1, 'artifacts': [copy.deepcopy(self.artifact)]}
        raise AssertionError('unexpected API')

    def aws(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return copy.deepcopy({'get-document': self.doc, 'send-command': self.sent,
                              'get-command-invocation': self.invocation}[args[0]])

    def test_canonical_success(self):
        self.assertEqual(helper.canonical(), self.selected)

    def test_disabled_gate(self):
        os.environ['DEPLOY_ENABLED'] = 'false'
        with self.assertRaises(RuntimeError): helper.canonical()

    def test_wrong_trigger_repository(self):
        self.event['workflow_run']['head_repository']['full_name'] = 'attacker/fork'
        self.write_event()
        with self.assertRaises(RuntimeError): helper.canonical()

    def test_stale_main(self):
        self.head = 'f' * 40
        with self.assertRaises(RuntimeError): helper.canonical()

    def test_run_retry_rejected(self):
        self.run['run_attempt'] = 2
        with self.assertRaises(RuntimeError): helper.canonical()

    def test_expired_artifact(self):
        self.artifact['expired'] = True
        with self.assertRaises(RuntimeError): helper.canonical()

    def test_single_send_bound_version_hash_and_receipt(self):
        with patch.object(helper, 'aws', self.aws): helper.deploy(self.selected)
        sends = [args for args, _ in self.calls if args[0] == 'send-command']
        self.assertEqual(len(sends), 1)
        self.assertEqual(sends[0][sends[0].index('--document-version') + 1], '1')
        self.assertEqual(sends[0][sends[0].index('--document-hash') + 1], 'c' * 64)
        poll = next(args for args, _ in self.calls if args[0] == 'get-command-invocation')
        self.assertEqual(poll[poll.index('--command-id') + 1], COMMAND)
        self.assertEqual(poll[poll.index('--instance-id') + 1], helper.INSTANCE)

    def test_document_tamper_before_send(self):
        body = json.loads(self.doc['Content']); body['mainSteps'][0]['inputs']['timeoutSeconds'] = '9999'
        self.doc['Content'] = json.dumps(body)
        with patch.object(helper, 'aws', self.aws):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)
        self.assertEqual([args[0] for args, _ in self.calls], ['get-document'])

    def test_release_changed_before_send(self):
        self.head = 'f' * 40
        with patch.object(helper, 'aws', self.aws):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)
        self.assertEqual([args[0] for args, _ in self.calls], ['get-document'])

    def test_foreign_command_id_rejected(self):
        self.invocation['CommandId'] = '87654321-1234-1234-1234-123456789abc'
        with patch.object(helper, 'aws', self.aws):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)
        self.assertEqual(sum(args[0] == 'send-command' for args, _ in self.calls), 1)

    def test_remote_failure_never_resends(self):
        self.invocation.update(Status='Failed', ResponseCode=1)
        with patch.object(helper, 'aws', self.aws):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)
        self.assertEqual(sum(args[0] == 'send-command' for args, _ in self.calls), 1)

    def test_receipt_run_mismatch_rejected(self):
        self.receipt['deployed_run_id'] += 1
        self.invocation['StandardOutputContent'] = json.dumps(self.receipt)
        with patch.object(helper, 'aws', self.aws):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)

    def test_eventual_missing_invocation_polls_same_command(self):
        original = self.aws
        calls = []
        def eventual(*args, **kwargs):
            if args[0] == 'get-command-invocation' and not calls:
                calls.append(True)
                self.calls.append((args, kwargs))
                return None
            return original(*args, **kwargs)
        with patch.object(helper, 'aws', eventual), patch.object(helper.time, 'sleep'):
            helper.deploy(self.selected)
        self.assertEqual(sum(args[0] == 'send-command' for args, _ in self.calls), 1)
        self.assertEqual(sum(args[0] == 'get-command-invocation' for args, _ in self.calls), 2)

    def test_poll_deadline_never_resends(self):
        with patch.object(helper, 'aws', self.aws), patch.object(helper.time, 'monotonic', side_effect=[0, 2000]):
            with self.assertRaises(RuntimeError): helper.deploy(self.selected)
        self.assertEqual(sum(args[0] == 'send-command' for args, _ in self.calls), 1)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Contract))
    print(json.dumps({'passed': result.wasSuccessful(), 'tests': result.testsRun, 'failures': len(result.failures),
                      'errors': len(result.errors), 'skips': len(result.skipped), 'production_mutation': False}))
    raise SystemExit(0 if result.wasSuccessful() else 1)

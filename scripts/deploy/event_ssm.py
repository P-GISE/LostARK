"""Canonical main-push metadata and one fixed SSM command; no artifact download."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request

REPO = 'P-GISE/LostARK'
WORKFLOW = '.github/workflows/deploy-vps.yml'
NAME = 'Build AWS app artifact'
REGION = 'ap-southeast-2'
INSTANCE = 'i-0b4a251ecd2f5bd3e'
DOCUMENT = 'P-GISE-S1-Deploy-LostARK-v1'
DOCUMENT_CONTENT_SHA256 = '726ecd1b944183fd29ac0f0ac60f229476ae42a4940805c010a6f5fc930a4219'
PLUGIN = 'deployRootEntry'
LIMIT = 16 * 1024**2


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def api(endpoint):
    request = urllib.request.Request('https://api.github.com/repos/' + REPO + '/' + endpoint,
        headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(LIMIT + 1)
    require(len(raw) <= LIMIT, 'metadata_size_limit')
    return json.loads(raw)


def canonical():
    require(os.environ['GITHUB_REPOSITORY'] == REPO
            and os.environ['GITHUB_EVENT_NAME'] == 'workflow_run'
            and os.environ['GITHUB_REF'] == 'refs/heads/main'
            and os.environ['GITHUB_RUN_ATTEMPT'] == '1'
            and os.environ['DEPLOY_ENABLED'] == 'true', 'disabled_or_noncanonical_context')
    raw = Path(os.environ['GITHUB_EVENT_PATH']).read_bytes()
    require(len(raw) <= LIMIT, 'event_size_limit')
    event = json.loads(raw)
    require(event['repository']['full_name'] == REPO and event['action'] == 'completed', 'wrong_event')
    trigger = event['workflow_run']
    sha, run_id = trigger['head_sha'], trigger['id']
    require(isinstance(sha, str) and re.fullmatch('[0-9a-f]{40}', sha)
            and type(run_id) is int and 0 < run_id < 10**20, 'invalid_sha_run')
    require(trigger['name'] == NAME and trigger['event'] == 'push' and trigger['head_branch'] == 'main'
            and trigger['status'] == 'completed' and trigger['conclusion'] == 'success'
            and trigger['run_attempt'] == 1 and type(trigger['run_attempt']) is int
            and trigger['repository']['full_name'] == REPO
            and trigger['head_repository']['full_name'] == REPO, 'untrusted_trigger')
    require(api('git/ref/heads/main')['object']['sha'] == sha, 'not_current_main')
    run = api('actions/runs/' + str(run_id))
    expected = {'id': run_id, 'head_sha': sha, 'head_branch': 'main', 'event': 'push',
                'status': 'completed', 'conclusion': 'success', 'path': WORKFLOW,
                'name': NAME, 'run_attempt': 1}
    require(all(run.get(key) == value for key, value in expected.items())
            and type(run['id']) is int and type(run['run_attempt']) is int
            and run['repository']['full_name'] == REPO
            and run['head_repository']['full_name'] == REPO, 'untrusted_run')
    page = api('actions/runs/' + str(run_id) + '/artifacts?per_page=100')
    rows = page['artifacts']
    require(type(page['total_count']) is int and page['total_count'] == len(rows) <= 100, 'incomplete_artifacts')
    matches = [row for row in rows if row['name'] == 'lostark-aws-' + sha]
    require(len(matches) == 1, 'nonunique_artifact')
    artifact = matches[0]
    require(artifact['expired'] is False and type(artifact['id']) is int and artifact['id'] > 0
            and type(artifact['size_in_bytes']) is int and 0 < artifact['size_in_bytes'] <= 2 * 1024**3
            and re.fullmatch('sha256:[0-9a-f]{64}', artifact.get('digest', ''))
            and artifact['workflow_run']['id'] == run_id
            and artifact['workflow_run']['head_sha'] == sha
            and artifact['workflow_run']['head_branch'] == 'main', 'invalid_artifact')
    return {'sha': sha, 'run_id': run_id, 'artifact_id': artifact['id'],
            'artifact_digest': artifact['digest'], 'artifact_bytes': artifact['size_in_bytes']}


def aws(*args, missing_ok=False):
    environment = {**os.environ, 'AWS_MAX_ATTEMPTS': '1', 'AWS_RETRY_MODE': 'standard', 'AWS_PAGER': ''}
    process = subprocess.run(['aws', 'ssm', *args, '--region', REGION, '--output', 'json', '--no-cli-pager'],
                             capture_output=True, timeout=45, env=environment)
    require(len(process.stdout) <= LIMIT and len(process.stderr) <= LIMIT, 'ssm_output_limit')
    if process.returncode:
        if missing_ok and b'InvocationDoesNotExist' in process.stderr:
            return None
        raise RuntimeError('ssm_api_failed_reconcile_before_retry')
    return json.loads(process.stdout)


def deploy(selected):
    document_hash = os.environ['EXPECTED_DOCUMENT_SHA256']
    require(re.fullmatch('[0-9a-f]{64}', document_hash), 'actual_document_hash_required')
    document = aws('get-document', '--name', DOCUMENT, '--document-version', '1', '--document-format', 'JSON')
    require(document['Name'] == DOCUMENT and document['DocumentVersion'] == '1'
            and document['DocumentType'] == 'Command' and document['DocumentFormat'] == 'JSON'
            and document['Status'] == 'Active', 'wrong_document')
    body = json.loads(document['Content'])
    normalized = json.dumps(body, sort_keys=True, separators=(',', ':')).encode()
    require(hashlib.sha256(normalized).hexdigest() == DOCUMENT_CONTENT_SHA256, 'document_body_changed')
    # Fresh check after OIDC assumption/document lookup, immediately before the sole send.
    require(canonical() == selected, 'release_changed_before_send')
    parameters = {'Sha': [selected['sha']], 'RunId': [str(selected['run_id'])]}
    sent = aws('send-command', '--document-name', DOCUMENT, '--document-version', '1',
               '--document-hash-type', 'Sha256', '--document-hash', document_hash,
               '--instance-ids', INSTANCE, '--timeout-seconds', '120',
               '--parameters', json.dumps(parameters), '--max-concurrency', '1', '--max-errors', '0')
    command = sent['Command']
    command_id = command['CommandId']
    require(isinstance(command_id, str) and re.fullmatch('[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}', command_id),
            'invalid_command_id')
    # Emit only the identifier needed to reconcile an ambiguous delivery/result.
    print(json.dumps({'command_id': command_id, 'instance_id': INSTANCE}), flush=True)
    require(command['DocumentName'] == DOCUMENT and command['DocumentVersion'] == '1'
            and command['InstanceIds'] == [INSTANCE] and command['Parameters'] == parameters,
            'sent_command_mismatch')
    deadline = time.monotonic() + 1940
    while True:
        require(time.monotonic() < deadline, 'ssm_result_deadline_reconcile_before_retry')
        result = aws('get-command-invocation', '--command-id', command_id, '--instance-id', INSTANCE,
                     '--plugin-name', PLUGIN, missing_ok=True)
        if result is None:
            time.sleep(3)
            continue
        require(result['CommandId'] == command_id and result['InstanceId'] == INSTANCE
                and result['DocumentName'] == DOCUMENT and result['PluginName'] == PLUGIN
                and ('DocumentVersion' not in result or result['DocumentVersion'] == '1'), 'invocation_mismatch')
        if result['Status'] in ('Pending', 'InProgress', 'Delayed'):
            time.sleep(3)
            continue
        require(result['Status'] == 'Success' and type(result['ResponseCode']) is int and result['ResponseCode'] == 0,
                'remote_failed_reconcile_before_retry')
        output = result.get('StandardOutputContent', '').strip()
        require(len(output) <= 16384 and not result.get('StandardErrorContent', '').strip(), 'unexpected_remote_output')
        receipt = json.loads(output)
        require(receipt['status'] in ('verified', 'already_deployed') and receipt['sha'] == selected['sha']
                and all(type(receipt[key]) is int and receipt[key] == selected['run_id']
                        for key in ('requested_run_id', 'deployed_run_id', 'artifact_run_id'))
                and type(receipt['artifact_id']) is int and receipt['artifact_id'] == selected['artifact_id']
                and receipt['artifact_digest'] == selected['artifact_digest']
                and re.fullmatch('sha256:[0-9a-f]{64}', receipt.get('image', '')), 'receipt_mismatch')
        print(json.dumps({'status': 'verified', 'command_id': command_id, **selected, 'image': receipt['image']}))
        return


if __name__ == '__main__':
    try:
        require(sys.argv[1:] in (['validate'], ['deploy']), 'fixed_mode_required')
        selected = canonical()
        if sys.argv[1] == 'validate':
            print(json.dumps({'canonical': True, **selected}))
        else:
            deploy(selected)
    except BaseException as error:
        print(json.dumps({'status': 'failed', 'category': type(error).__name__,
                          'reconcile_before_retry': True, 'raw_error_suppressed': True}), file=sys.stderr)
        raise SystemExit(1)

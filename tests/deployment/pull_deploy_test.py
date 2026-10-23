import hashlib
import io
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SCRIPT = Path(__file__).parents[2] / 'scripts/pull-aws-app.py'
spec = importlib.util.spec_from_file_location('pull', SCRIPT)
pull = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pull)
SHA = 'a' * 40
OLD = 'sha256:' + 'b' * 64
NEW = 'sha256:' + 'c' * 64


class PullTests(unittest.TestCase):
    def run_data(self):
        return dict(id=17, head_sha=SHA, head_branch='main', event='push', status='completed',
                    conclusion='success', path='.github/workflows/deploy-vps.yml',
                    repository={'full_name': 'P-GISE/LostARK'}, head_repository={'full_name': 'P-GISE/LostARK'})

    def test_only_exact_successful_main_push_is_accepted(self):
        pull.validate_run(self.run_data(), SHA)
        for field, value in [('head_sha', 'd'*40), ('head_branch', 'other'), ('event', 'pull_request'),
                             ('event', 'workflow_dispatch'), ('status', 'in_progress'),
                             ('conclusion', 'failure'), ('path', 'another.yml'),
                             ('head_repository', {'full_name':'attacker/fork'})]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                pull.validate_run(dict(self.run_data(), **{field:value}), SHA)

    def test_protected_tree_rejects_new_deleted_or_changed_sensitive_files(self):
        tree = {'truncated': False, 'tree': [{'path':'src/app.ts','type':'blob','sha':'1'*40},
                                           {'path':'prisma/schema.prisma','type':'blob','sha':'2'*40},
                                           {'path':'scripts/deploy-aws-app.sh','type':'blob','sha':'3'*40}]}
        protected = pull.protected_tree(tree)
        self.assertEqual(set(protected), {'prisma/schema.prisma','scripts/deploy-aws-app.sh'})
        self.assertNotEqual(pull.protected_tree(dict(tree, tree=tree['tree']+[{'path':'.github/workflows/new.yml','type':'blob','sha':'4'*40}])), protected)
        with self.assertRaises(ValueError): pull.protected_tree(dict(tree, truncated=True))

    def artifact(self):
        return dict(id=29, name='lostark-aws-'+SHA, expired=False, size_in_bytes=10,
                    digest='sha256:'+'d'*64, workflow_run={'id':17,'head_sha':SHA,'head_branch':'main'})

    def test_artifact_identity_expiry_digest_size_and_duplicates(self):
        a=self.artifact()
        self.assertEqual(pull.select_artifact({'artifacts':[a]},17,SHA)['id'],29)
        for change in [{'expired':True},{'digest':None},{'size_in_bytes':0},{'size_in_bytes':3*1024**3},
                       {'workflow_run':{'id':18,'head_sha':SHA,'head_branch':'main'}}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                pull.select_artifact({'artifacts':[dict(a,**change)]},17,SHA)
        with self.assertRaises(ValueError):pull.select_artifact({'artifacts':[a,a]},17,SHA)

    def bundle(self, root, bad=None):
        archive=root/'artifact.zip'; install=root/'install'; install.mkdir()
        content={name:b'synthetic' for name in pull.BUNDLE_FILES}
        content['image-size.txt']=b'100'
        for name in pull.FIXED_FILES: (install/name).write_bytes(content[name])
        if bad=='script':content['deploy-aws-app.sh']=b'unreviewed'
        with zipfile.ZipFile(archive,'w') as z:
            for name,data in content.items():z.writestr(name,data)
            if bad=='traversal':z.writestr('../escape',b'bad')
            if bad=='duplicate':z.writestr('image-size.txt',b'100')
            if bad=='link':
                i=zipfile.ZipInfo('link');i.create_system=3;i.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(i,b'outside')
        return archive,install

    def test_zip_allows_only_exact_files_and_reviewed_tools(self):
        for bad in [None,'script','traversal','duplicate','link']:
            with self.subTest(bad=bad), tempfile.TemporaryDirectory() as t:
                root=Path(t);archive,install=self.bundle(root,bad)
                if bad:
                    with self.assertRaises(ValueError):pull.extract_bundle(archive,root/'bundle',install)
                else:
                    pull.extract_bundle(archive,root/'bundle',install)
                    self.assertEqual((root/'bundle/image-size.txt').read_text(),'100')

    def test_download_digest_is_checked(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'archive';p.write_bytes(b'synthetic')
            pull.check_digest(p,'sha256:'+hashlib.sha256(b'synthetic').hexdigest())
            with self.assertRaises(ValueError):pull.check_digest(p,'sha256:'+'0'*64)

    def test_download_stops_before_writing_over_declared_size(self):
        from unittest.mock import Mock
        for limit in [3,10]:
            with tempfile.TemporaryDirectory() as t:
                process=Mock();process.stdout=io.BytesIO(b'synthetic');process.wait.return_value=0;process.poll.return_value=0
                path=Path(t)/'download'
                with patch.object(pull.subprocess,'Popen',return_value=process),patch.object(pull.threading,'Timer'):
                    if limit==3:
                        with self.assertRaises(ValueError):pull.download('synthetic',path,limit)
                        self.assertEqual(path.stat().st_size,0)
                    else:
                        pull.download('synthetic',path,limit);self.assertEqual(path.read_bytes(),b'synthetic')

    def test_poll_state_and_failed_deployment_stay_blocked(self):
        for failure in [None,'deploy','state']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as t:
                root=Path(t);archive,install=self.bundle(root);state=root/'state';state.mkdir();app=root/'app';app.mkdir()
                (app/'docker-compose.vps.yml').write_bytes(b'fixed compose')
                manifest={'initial_image':OLD,'protected':{},'reviewed_revision':SHA,
                          'runtime_compose_sha256':hashlib.sha256(b'fixed compose').hexdigest()}
                (install/'reviewed.json').write_text(json.dumps(manifest))
                a=self.artifact();a['digest']='sha256:'+hashlib.sha256(archive.read_bytes()).hexdigest();a['size_in_bytes']=archive.stat().st_size
                def api(path):
                    if path.endswith('git/ref/heads/main'):return {'object':{'sha':SHA}}
                    if 'git/trees/' in path:return {'truncated':False,'tree':[]}
                    if '/artifacts?' in path:return {'artifacts':[a]}
                    return {'workflow_runs':[self.run_data()]}
                def download(endpoint,target,limit):target.write_bytes(archive.read_bytes())
                def deploy(command):
                    self.assertEqual(command[:2],['/bin/bash',str(install/'deploy-aws-app.sh')])
                    if failure=='deploy':raise RuntimeError('synthetic failure')
                    (app/'.last-app-deployment').write_text(SHA+' '+NEW+' '+OLD+'\n')
                atomic=pull.atomic_json
                def save(path,value):
                    if failure=='state' and path.name=='deployed.json':raise RuntimeError('synthetic state failure')
                    atomic(path,value)
                with patch.object(pull,'api',side_effect=api), patch.object(pull,'download',side_effect=download), patch.object(pull,'execute_deployer',side_effect=deploy), patch.object(pull,'current_image',return_value=OLD), patch.object(pull.shutil,'disk_usage',return_value=(10**12,0,10**12)), patch.object(pull,'atomic_json',side_effect=save):
                    if failure:
                        with self.assertRaises(RuntimeError):pull.poll(install,state,app)
                        self.assertTrue((state/'recovery-required').exists())
                        with self.assertRaises(ValueError):pull.poll(install,state,app)
                    else:
                        pull.poll(install,state,app)
                        self.assertFalse((state/'recovery-required').exists())
                        self.assertEqual(json.loads((state/'deployed.json').read_text())['revision'],SHA)
                        with patch.object(pull,'current_image',return_value=NEW), patch.object(pull,'execute_deployer') as deploy_again:
                            pull.poll(install,state,app);deploy_again.assert_not_called()

    def test_protected_source_and_runtime_compose_changes_block_rollout(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);archive,install=self.bundle(root);state=root/'state';state.mkdir();app=root/'app';app.mkdir()
            (app/'docker-compose.vps.yml').write_bytes(b'fixed compose')
            manifest={'initial_image':OLD,'protected':{'prisma/schema.prisma':'e'*40},'reviewed_revision':SHA,
                      'runtime_compose_sha256':hashlib.sha256(b'fixed compose').hexdigest()}
            (install/'reviewed.json').write_text(json.dumps(manifest))
            def api(path):
                return {'object':{'sha':SHA}} if 'git/ref/' in path else {'truncated':False,'tree':[]}
            with patch.object(pull,'api',side_effect=api),patch.object(pull,'current_image',return_value=OLD),patch.object(pull,'execute_deployer') as deploy:
                with self.assertRaisesRegex(ValueError,'Protected source'):
                    pull.poll(install,state,app)
                deploy.assert_not_called()
                (app/'docker-compose.vps.yml').write_bytes(b'drift')
                with self.assertRaisesRegex(ValueError,'digest mismatch'):
                    pull.poll(install,state,app)

    def test_disk_shortage_and_main_advancing_never_call_deployer(self):
        for mode in ['disk','main']:
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as t:
                root=Path(t);archive,install=self.bundle(root);state=root/'state';state.mkdir();app=root/'app';app.mkdir()
                (app/'docker-compose.vps.yml').write_bytes(b'fixed compose')
                (install/'reviewed.json').write_text(json.dumps({'initial_image':OLD,'protected':{},'reviewed_revision':SHA,
                    'runtime_compose_sha256':hashlib.sha256(b'fixed compose').hexdigest()}))
                a=self.artifact();a['digest']='sha256:'+hashlib.sha256(archive.read_bytes()).hexdigest();a['size_in_bytes']=archive.stat().st_size
                heads=[]
                def api(path):
                    if 'git/ref/' in path:
                        heads.append(True)
                        return {'object':{'sha':SHA if len(heads)==1 else 'f'*40}}
                    if 'git/trees/' in path:return {'truncated':False,'tree':[]}
                    if '/artifacts?' in path:return {'artifacts':[a]}
                    return {'workflow_runs':[self.run_data()]}
                with patch.object(pull,'api',side_effect=api),patch.object(pull,'download',side_effect=lambda endpoint,target,limit:target.write_bytes(archive.read_bytes())),patch.object(pull,'execute_deployer') as deploy,patch.object(pull,'current_image',return_value=OLD),patch.object(pull.shutil,'disk_usage',return_value=(10**12,0,0 if mode=='disk' else 10**12)):
                    with self.assertRaisesRegex(ValueError,'disk|Main advanced'):
                        pull.poll(install,state,app)
                    deploy.assert_not_called()
                    self.assertFalse((state/'recovery-required').exists())


if __name__=='__main__':unittest.main()

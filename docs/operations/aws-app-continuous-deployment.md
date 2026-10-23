# AWS 앱 자동 배포 경계

main push는 격리 PostgreSQL 테스트·lint·build를 통과한 같은 SHA의 이미지를 GitHub runner에서 만들고 7일 보존 artifact로 게시한다. PR은 검증만 한다. S1 root timer는 기존 ubuntu GitHub 인증으로 LostARK 저장소의 현재 main·push·지정 workflow·completed/success run을 확인한 뒤 산출물을 가져온다. CI 성공과 실제 서버 배포 성공은 별개다. 새 AWS 자원·Tailscale 키·접근 정책은 생성하지 않는다. runner/artifact 사용량은 GitHub 요금제에 따른다.

AWS /opt/lostark-party의 web·worker·character-worker만 교체한다. 대표 lostark-party.pigs0516.com은 별도 Windows PC3002 경로이므로 AWS 배포를 PC 업데이트로 표시하지 않는다. PC의 인증된 관리 접속·checkout·스케줄러는 미확인이다. 오래된 PC 시작 스크립트에는 공유 터널 재시작이 포함되어 이 배포에서 호출하지 않는다.

## 전환 근거

2026-10-24 run39995657281은 테스트·이미지 게시 후 Tailscale backend의 `invalid key: API key does not exist`로 실패했고 SSH 배포는 skipped였다. S1 기존 ubuntu gh로 자체 저장소와 artifact metadata를 읽을 수 있음을 확인했다. 다른 프로젝트 identity나 secret을 복사하지 않는다. 기존 bootstrap workflow는 별도 수동 초기화 경로이며 여기서 실행하지 않는다.

## 신뢰 경계

고정 설치 위치는 /usr/local/lib/lostark-deploy다. prepare-pull-install.py는 정확한 Git commit의 blob을 새 로컬 staging으로 추출하고 SHA256·보호 경로 목록·초기 runtime image/Compose hash를 reviewed.json에 기록한다. dirty working copy와 기존 staging을 사용하지 않는다. 보호 경로는 .github/, deploy/, scripts/, prisma/, Dockerfile, .dockerignore, docker-compose로 시작하는 루트 파일이다. 추가·삭제·변경을 자동 적용하지 않으며 검토 후 고정 설치본과 manifest를 함께 갱신해야 한다.

artifact는 run ID·SHA·main·이름 유일성·만료·GitHub digest·실제 byte 수를 검사한다. ZIP은 정해진9개 일반 파일만 허용하고 중복·경로탈출·링크·기타 파일을 차단한다. bundle의 shell/Python/Compose는 설치본과 byte 비교하고 **실행은 root 소유 고정 설치본만** 사용한다. 다운로드 최대10분/2GiB, 펼친 합계4GiB, 각 metadata1MiB 상한과 staging/image/rollback 디스크를 검사한다. GitHub 요청은 ubuntu 기존 인증으로 실행하고 원문 오류·환경값·signed URL을 로그로 남기지 않는다.

기존 배포기는 실행 image의 prisma 파일 해시와 후보를 비교하여 schema/seed 변경을 차단한다. production migration·DB 내용 조회·환경파일 수정·DNS·Tailscale Serve·shared cloudflared 재시작은 하지 않는다. archive SHA256/config digest/OCI revision을 확인하고 앱3개만 --no-deps --no-build --pull never로 교체한다. HTTP200, 실제 image/running/restart, DB·다른 컨테이너 ID/시작 시각·shared cloudflared PID를 비교한다. 교체 중 짧은 중단은 가능하다. 이전 이미지는 삭제하지 않는다.

## 상태와 복구

/var/lib/lostark-deploy/poll.lock과 기존 앱 lock이 배포를 직렬화한다. 교체 직전 recovery-required를 fsync하고 성공 후 deployed.json을 임시파일+fsync+replace로 기록한 뒤 marker를 제거한다. 실제 image가 기록 image와 다르면 차단한다. 같은 SHA는 건너뛰고 다운로드 중 main 변경은 교체 전에 차단한다.

배포 실패 시 기존 배포기가 이전 image로 앱3개만 rollback하고 실패 결과를 유지한다. .app-deployment-in-progress 또는 recovery-required가 있으면 재실행을 차단한다. TERM/INT에는 rollback을 시도하고 SIGKILL/전원 종료/state 저장 실패에도 marker가 남는다. marker에는 SHA/run/status만 기록한다.

복구 시 timer를 중지한 뒤 앱3개 image/health, DB·타서비스 보존, .last-app-deployment와 deployed.json을 대조한다. rollback 성공이면 이전 state, 앱 전환은 성공했지만 poll state 저장만 실패했다면 검증한 새 state로 복구한다. 불확실하면 marker를 유지한다. marker 삭제만으로 복구 완료라 판정하지 않는다.

## 최초 설치 계획 — 운영 담당자 검토 후

2026-10-24 02:48 KST 읽기 기준이며 설치 직전 다시 대조한다.

- 앱3개: sha256:c0816afd046a9c69460e350760591c8a46a55311e08913d84f9d7ce1d3f06c11, 모두 running.
- docker-compose.vps.yml SHA256: cd11287558b0e8c2e078f3c83675c139594b035a95d7a8766814dc94dccc57c6. root0644, .env root0600(값 미열람).
- root filesystem 여유8,833,990,656bytes. 과거 소스 비교 기록은 main8b78e04와 일치였으나 초기 manifest는 실제 image를 pin한다. 새 SHA를 이미 배포했다고 state를 꾸미지 않는다.

1. PR 검토·main 병합·새 main push CI 전체 성공을 확인한다. 과거 failed run은 artifact가 있어도 선택하지 않는다.
2. 로컬에서 `python3 scripts/prepare-pull-install.py SOURCE_ROOT EXACT_REVIEWED_40_HEX_SHA INITIAL_IMAGE COMPOSE_SHA256 NEW_STAGE`로 검토 commit의 staging을 만든다. 인자는 경로와 공개 해시뿐이다.
3. 기존 strict-host-key SSH로 staging을 전달한다. 기존 설치는 timer 중지 후 root 전용 백업에 보존한다. /usr/local/lib/lostark-deploy는 root0755, 고정 poller/deployer/validator/override/reviewed.json은 root0644, /var/lib/lostark-deploy는 root0700으로 설치한다. 기존 state를 지우지 않는다. service/timer는 /etc/systemd/system에 root0644로 설치한다. 기존 앱 .env/Compose/DB/tunnel은 수정하지 않는다.
4. systemd-analyze verify·manifest hash·현재 image/Compose를 확인한다. daemon-reload 후 service를 한 번 시작하여 배포와 보존 조건을 검증한다. 성공 후에만 timer를 enable/start한다. timer는 부팅2분 후 및 이전 실행 종료2분 후(+최대20초) 확인한다.
5. 설치 rollback은 timer 중지→검토된 이전 설치본/manifest 복원→daemon-reload다. 앱 rollback은 별도로 이전 고정 image로 앱3개만 복원하고 상태를 대조한다. 설치 rollback이 DB나 앱을 자동 복원한다고 가정하지 않는다.

## 검증 한계

Python 합성 회귀는 exact run/event/branch, artifact identity/digest/size/중복, ZIP 안전성, 다운로드 상한, 고정 tooling 비교, 보호 소스·runtimeCompose 차단, state 성공/동일SHA skip/실패marker, Git blob staging을 검증한다. Vitest는 앱3개 only·schema 차단·health/TERM/INT/state 실패·rollback 및 workflow 경계를 실행한다. 실제 artifact 다운로드·Docker 앱 전환·서버 설치는 합성 검증이 증명하지 않으며 운영 사후 확인이 필요하다.

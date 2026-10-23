# AWS 앱 자동 배포 경계

main push는 테스트·lint·build가 성공한 동일 SHA의 Docker 이미지를 GitHub runner에서 만들고, 기존 Tailscale와 SSH 인증으로 AWS `/opt/lostark-party`에 전달한다. 수동 실행도 main만 배포한다. PR은 검증만 한다. GitHub artifact는 1일 보존하며 runner 시간·artifact 사용량은 GitHub 요금제에 따른다. 새 AWS 자원은 만들지 않는다.

`TS_AUTHKEY`, `AWS_BOOTSTRAP_USER`, `AWS_BOOTSTRAP_SSH_KEY`는 기존 저장소 secret 이름을 재사용한다. 값의 유효성과 tailnet→서버 TCP22 권한은 실제 CI 성공 전까지 미검증이다. 누락·연결 실패는 실패로 기록하며 성공으로 건너뛰거나 공인 SSH로 우회하지 않는다. `deploy/aws.known_hosts`의 공개 호스트 키는 2026-10-24 기존 StrictHostKeyChecking SSH 연결에서 확인했다. 서버 교체 시 별도 신뢰 확인 후 갱신한다.

배포는 전송 archive의 SHA256, 내부 manifest의 고정 SHA 태그, config digest와 OCI revision을 검증한다. CI image ID와 서버 containerd image ID는 서로 다른 digest일 수 있어 직접 비교하지 않는다. 로드 후 서버가 보고한 image ID를 앱 상태 검증과 실행 기록에 사용한다. 현재 실행 이미지의 `prisma/` 전체 파일 해시와 새 이미지 소스의 해시가 다르면 컨테이너 교체 전에 중단한다. DB 조회/쓰기, migration, seed, 환경파일 수정, DNS, Tailscale Serve, shared cloudflared 재시작을 수행하지 않는다. CI의 migration은 격리 PostgreSQL 테스트 서비스에만 적용한다.

기존 Compose에 앱 전용 override를 적용하여 web·worker·character-worker만 `--no-deps --no-build --pull never`로 교체한다. DB·다른 컨테이너의 ID/시작 시각과 shared cloudflared PID를 대조한다. 앱 교체 중 짧은 연결 중단은 가능하다. HTTP200과 세 앱의 이미지·running·restart count를 확인하고 성공 시 `.last-app-deployment`에 SHA, image ID, 이전 image ID를 기록한다. 건강 검사 실패 시 이전 이미지로 앱 세 개만 자동 복구하고 CI는 실패로 남는다. 복구 실패는 ROLLBACK_FAILED로 구분한다. 이전 이미지는 삭제하지 않는다.

TERM/INT는 실패 종료로 전환해 롤백한다. 교체 직전에 `.app-deployment-in-progress`를 만들고 성공 완료 때만 제거한다. 실패하면 롤백 성공 여부와 상관없이 marker를 남겨 다음 배포를 차단한다. 롤백 성공 시 이전 `.last-app-deployment` 상태도 복원한다. SIGKILL·서버 전원 종료 등 trap이 실행되지 못하는 경우에도 marker가 남는다. 운영자가 실제 앱 이미지·건강·DB/다른 서비스 불변·배포 상태를 확인하고 복구를 완료한 뒤 해당 marker만 제거해야 재시도할 수 있다. 자동으로 marker를 지워 실패를 덮지 않는다. 이미지와 배포 bundle은 자동 삭제하지 않으므로 디스크 여유가 부족하면 배포를 차단하고 별도 정리 검토가 필요하다.

이번 구현은 AWS 3000 경로용이다. 공개 대표 `lostark-party.pigs0516.com`은 별도 Windows PC3002로 연결된다. 해당 PC의 운영 checkout·서비스 계정·DB 소비 관계·인증된 원격 관리 방법은 아직 미확인이다. 기존 Linux VPS 단계를 PC 배포라고 표시하지 않으며 PC 자동 배포는 포함하지 않는다. PC용 runner·SSH 사용자·키·접근 정책을 자동 생성하지 않는다. PC 경로가 확인된 뒤 승인된 관리 방식에 맞는 별도 작업이 필요하다.

2026-10-24 조사에서 AWS 실행 이미지의 src/·prisma/·package.json·next.config.ts·tsconfig.json 138개 파일은 main `8b78e04`와 일치했다. 서버 checkout `be6d092`와 main 차이는 README 두 개뿐이었다. 빌드 산출물·의존성 전체·실제 DB schema 동일성을 증명한 것은 아니다. 기존 `bootstrap-aws.yml`과 `scripts/vps-deploy.sh`는 초기 구성용 별도 경로이며 DB·터널 조작을 포함한다. 이 자동 배포에서는 호출하지 않는다.

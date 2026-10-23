import hashlib
import json
import re
import sys
import tarfile


def verify(archive, revision):
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Invalid revision")
    with tarfile.open(archive, "r:gz") as image:
        manifest_file = image.getmember("manifest.json")
        if not manifest_file.isfile() or manifest_file.size > 1024 * 1024:
            raise ValueError("Invalid image manifest")
        manifest = json.load(image.extractfile(manifest_file))
        if len(manifest) != 1 or manifest[0].get("RepoTags") != ["lostark-party-app:" + revision]:
            raise ValueError("Archive must contain only the requested image tag")
        config_file = image.getmember(manifest[0]["Config"])
        if not config_file.isfile() or config_file.size > 4 * 1024 * 1024:
            raise ValueError("Invalid image configuration")
        config_bytes = image.extractfile(config_file).read()
        config = json.loads(config_bytes)
        if config.get("config", {}).get("Labels", {}).get("org.opencontainers.image.revision") != revision:
            raise ValueError("Archive revision does not match the requested release")
        return "sha256:" + hashlib.sha256(config_bytes).hexdigest()


if __name__ == "__main__":
    try:
        print(verify(sys.argv[1], sys.argv[2]))
    except (IndexError, KeyError, ValueError, OSError, tarfile.TarError):
        print("Invalid image archive or release identity", file=sys.stderr)
        sys.exit(1)

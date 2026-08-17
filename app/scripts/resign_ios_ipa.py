#!/usr/bin/env python3

"""Re-bundle and re-sign an existing iOS IPA without importing a keychain item.

This is a fallback for restricted build hosts. It keeps the existing native
binary and frameworks, replaces only the Expo JS bundle/assets, regenerates the
resource seal with an ad-hoc codesign pass, then replaces that ad-hoc CMS with a
distribution CMS made from the existing PEM private key and Apple certificate.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import plistlib
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path


LC_CODE_SIGNATURE = 0x1D
CSSLOT_CODEDIRECTORY = 0
CSSLOT_REQUIREMENTS = 2
CSSLOT_ENTITLEMENTS = 5
CSSLOT_DER_ENTITLEMENTS = 7
CSSLOT_SIGNATURE = 0x10000
CSMAGIC_EMBEDDED_SIGNATURE = 0xFADE0CC0
CSMAGIC_BLOBWRAPPER = 0xFADE0B01
OPENSSL = shutil.which("openssl") or "/usr/bin/openssl"


def run(*args: str, cwd: Path | None = None, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=capture,
    )


def signature_range(macho: bytes) -> tuple[int, int]:
    if struct.unpack_from("<I", macho, 0)[0] != 0xFEEDFACF:
        raise RuntimeError("Only a thin arm64 Mach-O base IPA is supported")
    command_count = struct.unpack_from("<I", macho, 16)[0]
    offset = 32
    for _ in range(command_count):
        command, size = struct.unpack_from("<II", macho, offset)
        if command == LC_CODE_SIGNATURE:
            return struct.unpack_from("<II", macho, offset + 8)
        offset += size
    raise RuntimeError("LC_CODE_SIGNATURE was not found")


def signature_blobs(macho: bytes) -> tuple[dict[int, bytes], int, int]:
    signature_offset, allocated_size = signature_range(macho)
    superblob = macho[signature_offset : signature_offset + allocated_size]
    magic, _, count = struct.unpack_from(">III", superblob, 0)
    if magic != CSMAGIC_EMBEDDED_SIGNATURE:
        raise RuntimeError("Invalid embedded-signature superblob")
    blobs: dict[int, bytes] = {}
    for index in range(count):
        slot, blob_offset = struct.unpack_from(">II", superblob, 12 + index * 8)
        blob_length = struct.unpack_from(">I", superblob, blob_offset + 4)[0]
        blobs[slot] = superblob[blob_offset : blob_offset + blob_length]
    return blobs, signature_offset, allocated_size


def distribution_code_directory(adhoc: bytes, requirements: bytes, team_id: str) -> bytes:
    length, _, _, hash_offset, identifier_offset, special_count = struct.unpack_from(
        ">IIIIII", adhoc, 4
    )
    if length != len(adhoc) or special_count < 2:
        raise RuntimeError("Unexpected CodeDirectory layout")
    identifier_end = adhoc.find(b"\0", identifier_offset) + 1
    if identifier_end <= identifier_offset:
        raise RuntimeError("CodeDirectory identifier is missing")
    team = team_id.encode("ascii") + b"\0"
    result = bytearray(adhoc[:identifier_end] + team + adhoc[identifier_end:])
    struct.pack_into(">I", result, 4, len(result))
    struct.pack_into(">I", result, 12, 0)  # clear CS_ADHOC
    struct.pack_into(">I", result, 16, hash_offset + len(team))
    struct.pack_into(">I", result, 48, identifier_end)
    new_hash_offset = hash_offset + len(team)
    hash_size = result[36]
    result[new_hash_offset - 2 * hash_size : new_hash_offset - hash_size] = hashlib.sha256(
        requirements
    ).digest()
    return bytes(result)


def rebuild_superblob(parts: list[tuple[int, bytes]]) -> bytes:
    header_size = 12 + 8 * len(parts)
    header = bytearray(struct.pack(">III", CSMAGIC_EMBEDDED_SIGNATURE, 0, len(parts)))
    body = bytearray()
    offset = header_size
    for slot, blob in parts:
        header += struct.pack(">II", slot, offset)
        body += blob
        offset += len(blob)
    result = header + body
    struct.pack_into(">I", result, 4, len(result))
    return bytes(result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ipa", type=Path, required=True)
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--private-key", type=Path, required=True)
    parser.add_argument("--certificate", type=Path, required=True)
    parser.add_argument("--app-json", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    config = __import__("json").loads(args.app_json.read_text())["expo"]
    expected_version = config["version"]
    expected_build = str(config["ios"]["buildNumber"])

    with tempfile.TemporaryDirectory(prefix="vita-mango-resign-") as temp_name:
        work = Path(temp_name)
        run("/usr/bin/unzip", "-q", str(args.base_ipa.resolve()), "-d", str(work))
        apps = list((work / "Payload").glob("*.app"))
        if len(apps) != 1:
            raise RuntimeError("The IPA must contain exactly one app bundle")
        app = apps[0]
        executable = app / plistlib.loads((app / "Info.plist").read_bytes())["CFBundleExecutable"]
        original_macho = executable.read_bytes()
        original_blobs, _, _ = signature_blobs(original_macho)

        shutil.copy2(args.bundle, app / "main.jsbundle")
        shutil.copytree(args.assets, app / "assets", dirs_exist_ok=True)
        info = plistlib.loads((app / "Info.plist").read_bytes())
        info["CFBundleShortVersionString"] = expected_version
        info["CFBundleVersion"] = expected_build
        (app / "Info.plist").write_bytes(plistlib.dumps(info, fmt=plistlib.FMT_BINARY))

        profile_plist = work / "profile.plist"
        run(
            OPENSSL,
            "smime",
            "-inform",
            "der",
            "-verify",
            "-noverify",
            "-in",
            str(app / "embedded.mobileprovision"),
            "-out",
            str(profile_plist),
        )
        profile = plistlib.loads(profile_plist.read_bytes())
        entitlements = work / "entitlements.plist"
        entitlements.write_bytes(plistlib.dumps(profile["Entitlements"]))

        run(
            "/usr/bin/codesign",
            "--force",
            "--sign",
            "-",
            "--entitlements",
            str(entitlements),
            "--generate-entitlement-der",
            "--timestamp=none",
            str(app),
        )
        adhoc_macho = executable.read_bytes()
        adhoc_blobs, signature_offset, allocated_size = signature_blobs(adhoc_macho)
        requirements = original_blobs[CSSLOT_REQUIREMENTS]
        code_directory = distribution_code_directory(
            adhoc_blobs[CSSLOT_CODEDIRECTORY], requirements, profile["TeamIdentifier"][0]
        )
        code_directory_path = work / "CodeDirectory.bin"
        code_directory_path.write_bytes(code_directory)

        original_cms = work / "original-cms.der"
        original_cms.write_bytes(original_blobs[CSSLOT_SIGNATURE][8:])
        chain = work / "chain.pem"
        with chain.open("w") as output:
            subprocess.run(
                [OPENSSL, "pkcs7", "-inform", "DER", "-in", str(original_cms), "-print_certs"],
                check=True,
                text=True,
                stdout=output,
                stderr=subprocess.DEVNULL,
            )
        leaf = work / "leaf.pem"
        with leaf.open("w") as output:
            subprocess.run(
                [OPENSSL, "x509", "-inform", "DER", "-in", str(args.certificate)],
                check=True,
                text=True,
                stdout=output,
                stderr=subprocess.DEVNULL,
            )
        cms = work / "distribution-cms.der"
        run(
            OPENSSL,
            "cms",
            "-sign",
            "-binary",
            "-in",
            str(code_directory_path),
            "-signer",
            str(leaf),
            "-inkey",
            str(args.private_key),
            "-certfile",
            str(chain),
            "-outform",
            "DER",
            "-out",
            str(cms),
            "-md",
            "sha256",
            "-nosmimecap",
        )
        run(
            OPENSSL,
            "cms",
            "-verify",
            "-binary",
            "-inform",
            "DER",
            "-in",
            str(cms),
            "-content",
            str(code_directory_path),
            "-noverify",
            "-out",
            os.devnull,
        )
        cms_data = cms.read_bytes()
        cms_blob = struct.pack(">II", CSMAGIC_BLOBWRAPPER, 8 + len(cms_data)) + cms_data
        superblob = rebuild_superblob(
            [
                (CSSLOT_CODEDIRECTORY, code_directory),
                (CSSLOT_REQUIREMENTS, requirements),
                (CSSLOT_ENTITLEMENTS, adhoc_blobs[CSSLOT_ENTITLEMENTS]),
                (CSSLOT_DER_ENTITLEMENTS, adhoc_blobs[CSSLOT_DER_ENTITLEMENTS]),
                (CSSLOT_SIGNATURE, cms_blob),
            ]
        )
        if len(superblob) > allocated_size:
            raise RuntimeError("Distribution signature exceeds the allocated Mach-O signature space")
        patched = bytearray(adhoc_macho)
        patched[signature_offset : signature_offset + allocated_size] = superblob + b"\0" * (
            allocated_size - len(superblob)
        )
        executable.write_bytes(patched)

        verification = subprocess.run(
            ["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app)],
            text=True,
            capture_output=True,
        )
        if verification.returncode and "CSSMERR_TP_NOT_TRUSTED" not in verification.stderr:
            raise RuntimeError(f"codesign verification failed: {verification.stderr.strip()}")

        args.output.parent.mkdir(parents=True, exist_ok=True)
        temporary_output = args.output.with_suffix(".tmp.ipa")
        if temporary_output.exists():
            temporary_output.unlink()
        zip_items = ["Payload"] + (["Symbols"] if (work / "Symbols").exists() else [])
        run("/usr/bin/zip", "-qry", str(temporary_output.resolve()), *zip_items, cwd=work)
        os.replace(temporary_output, args.output)

    print(f"Created {args.output} — {expected_version} ({expected_build})")


if __name__ == "__main__":
    main()

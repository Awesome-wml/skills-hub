#!/usr/bin/env python3
"""Read-only local resource checks; live Figma checks belong to the calling agent."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

SKILL = Path(__file__).resolve().parents[1]

def check(admin_root=None, lferp_root=None, spec_kind='repo-markdown'):
    manifest = json.loads((SKILL / 'assets/project-baseline/manifest.json').read_text())
    failures, drift = [], []
    for item in manifest['files']:
        bundled = SKILL / 'assets/project-baseline' / item.get('bundled_path', item['path'])
        if not bundled.is_file() or hashlib.sha256(bundled.read_bytes()).hexdigest() != item['sha256']:
            failures.append(item['path'])
        if admin_root:
            current = Path(admin_root) / item['path']
            if not current.is_file():
                drift.append({'path': item['path'], 'status': 'missing'})
            elif hashlib.sha256(current.read_bytes()).hexdigest() != item.get('source_sha256', item['sha256']):
                drift.append({'path': item['path'], 'status': 'changed'})
    checks = ['actual tools and official operation skills', 'current identity and file access',
              'design context and applicable canvas operations']
    if spec_kind == 'figma-native':
        checks += ['target file owning plan', 'target plan specs_enabled', 'native Spec read/write']
    return {'package_resources': 'failed' if failures else 'passed', 'invalid_files': failures,
            'spec_kind': spec_kind,
            'shared_spec': {'status': 'agent-check-required', 'checks': [
                'shared document access', 'current content and recorded revision']},
            'admin_rules_present': bool(admin_root and (Path(admin_root) / 'AGENTS.md').is_file()),
            'local_baseline_differences': drift,
            'lferp_rules_present': bool(lferp_root and (Path(lferp_root) / 'docs/team-rules/README.md').is_file()),
            'codex_cli_present': bool(shutil.which('codex')),
            'live_figma': {'status': 'agent-check-required', 'checks': checks},
            'ready_for_live_workflow': False}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--admin-root', type=Path)
    p.add_argument('--lferp-root', type=Path)
    p.add_argument('--spec-kind', choices=['repo-markdown', 'figma-native'], default='repo-markdown')
    a = p.parse_args()
    result = check(a.admin_root, a.lferp_root, a.spec_kind)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result['invalid_files'] else 0)

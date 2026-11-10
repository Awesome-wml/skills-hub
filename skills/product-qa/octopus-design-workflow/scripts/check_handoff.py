#!/usr/bin/env python3
"""Validate traceability structure; never certify business or Figma facts."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import unquote, urlsplit

HASH = re.compile(r'^[0-9a-f]{64}$')
COMMIT = re.compile(r'^[0-9a-f]{40,64}$')

def validate(data, stage="design"):
    if not isinstance(data, dict):
        return ['handoff must be an object']
    if not isinstance(data.get('spec', {}), dict):
        return ['spec must be an object']
    for collection in ['sources', 'requirements', 'designs', 'mappings', 'acceptance', 'implementation']:
        items = data.get(collection, [])
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            return [collection + ' must be a list of objects']
    errors = []
    def need(condition, message):
        if not condition:
            errors.append(message)
    def link(value):
        if not isinstance(value, str):
            return False
        parsed = urlsplit(value)
        return (parsed.scheme == 'https' and bool(parsed.hostname) and parsed.hostname not in {'localhost', '127.0.0.1'}
                and parsed.username is None and parsed.password is None
                and not re.search(r'(token|secret|signature|credential|access_key)=', parsed.query, re.I))
    need(bool(data.get('task')) and bool(data.get('scope')), 'task and scope are required')
    spec = data.get('spec', {})
    need(link(spec.get('url')), 'spec.url must be a shareable HTTPS URL')
    kind = spec.get('kind', 'figma-native')  # Accept native handoffs from version 0.1.0.
    need(kind in {'repo-markdown', 'figma-native'}, 'spec.kind must be repo-markdown or figma-native')
    need(bool(spec.get('read_at')), 'spec.read_at is required')
    if kind == 'repo-markdown':
        need(link(spec.get('repository_url')), 'spec.repository_url must be shareable HTTPS')
        path = spec.get('path', '')
        valid_path = (isinstance(path, str) and bool(path) and not Path(path).is_absolute()
                      and not re.match(r'^[A-Za-z]:', path) and '\\' not in path
                      and '..' not in PurePosixPath(path).parts and '://' not in path and path.endswith('.md'))
        need(valid_path, 'spec.path must be a repository-relative Markdown path')
        commit = spec.get('commit', '')
        valid_commit = isinstance(commit, str) and bool(COMMIT.fullmatch(commit))
        need(valid_commit, 'spec.commit must identify an immutable Git commit')
        url = spec.get('url', '')
        repo = spec.get('repository_url', '')
        if valid_path and valid_commit and link(url) and link(repo):
            need(unquote(urlsplit(url).path) == urlsplit(repo).path.rstrip('/') + '/blob/' + commit + '/' + path
                 and urlsplit(url).netloc == urlsplit(repo).netloc,
                 'spec.url must locate the recorded repository, commit and path')
    elif kind == 'figma-native':
        need(urlsplit(spec.get('url', '')).hostname in {'figma.com', 'www.figma.com'}, 'spec.url must identify Figma')
        for key in ['file_key', 'node_id']:
            need(bool(spec.get(key)), 'spec.' + key + ' is required')
    need(bool(HASH.fullmatch(spec.get('markdown_sha256', ''))), 'spec.markdown_sha256 must hash the read Markdown')
    sources = data.get('sources', [])
    need(bool(sources), 'sources must include the read LFerp/requirement material')
    source_ids = set()
    for item in sources:
        ident = item.get('id')
        need(bool(ident) and ident not in source_ids, 'source IDs must be nonempty and unique')
        source_ids.add(ident)
        need(link(item.get('url')), 'source.url must be shareable HTTPS')
        need(bool(item.get('locator')) and bool(item.get('read_at')), 'source locator and read_at are required')
        need(bool(HASH.fullmatch(item.get('sha256', ''))), 'source.sha256 is required')
    requirements = data.get('requirements', [])
    need(bool(requirements), 'requirements must not be empty')
    requirement_ids = set()
    for item in requirements:
        ident = item.get('id')
        need(bool(ident) and ident not in requirement_ids, 'requirement IDs must be nonempty and unique')
        requirement_ids.add(ident)
        refs = item.get('source_ids', [])
        need(bool(refs) and set(refs).issubset(source_ids), 'requirement source_ids must resolve')
        need(bool(item.get('statement')) and bool(item.get('spec_anchor')), 'requirement statement and spec_anchor are required')
    designs = data.get('designs', [])
    if stage != 'spec':
        need(bool(designs), 'designs must describe the applicable frames and states')
    design_ids = set()
    for item in designs:
        ident = item.get('id')
        need(bool(ident) and ident not in design_ids, 'design IDs must be nonempty and unique')
        design_ids.add(ident)
        need(link(item.get('url')) and bool(item.get('node_id')), 'design URL and node_id are required')
        need(bool(item.get('states')) and bool(item.get('style_evidence')), 'design states and style_evidence are required')
    if stage != 'spec':
        need(bool(data.get('mappings')), 'component/style mappings or an explicit not-applicable reason are required')
    for item in data.get('mappings', []):
        need(item.get('design_id') in design_ids, 'mapping design_id must resolve')
        need(bool(item.get('code_path')) or bool(item.get('not_applicable_reason')), 'mapping needs code_path or not_applicable_reason')
        if item.get('code_path'):
            need(not Path(item['code_path']).is_absolute() and not re.match(r'^[A-Za-z]:', item['code_path']) and '..' not in PurePosixPath(item['code_path'].replace('\\', '/')).parts and '://' not in item['code_path'], 'code_path must be repository-relative')
    acceptance = data.get('acceptance', [])
    need(bool(acceptance), 'acceptance must not be empty')
    covered = set()
    for item in acceptance:
        refs = item.get('requirement_ids', [])
        need(bool(refs) and set(refs).issubset(requirement_ids), 'acceptance requirement_ids must resolve')
        covered.update(refs)
        need(bool(item.get('scenario')) and bool(item.get('expected')), 'acceptance scenario and expected are required')
        need(item.get('result') in {'passed', 'failed', 'not-run', 'blocked'}, 'acceptance result must be explicit')
        if item.get('result') in {'passed', 'failed'}:
            need(bool(item.get('evidence')), 'executed acceptance needs evidence')
    need(requirement_ids.issubset(covered), 'every requirement needs acceptance coverage')
    if stage == 'development':
        need(bool(data.get('implementation')), 'development handoff needs implementation evidence')
        for item in data.get('implementation', []):
            need(item.get('requirement_id') in requirement_ids and bool(item.get('code_path')) and bool(item.get('commit')), 'implementation needs requirement_id, code_path and commit')
    return errors

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('handoff', type=Path)
    p.add_argument('--stage', choices=['spec', 'design', 'development'], default='design')
    args = p.parse_args()
    try:
        errors = validate(json.loads(args.handoff.read_text()), args.stage)
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
        errors = [str(exc)]
    print(json.dumps({'structure': 'failed' if errors else 'passed', 'errors': errors,
                      'business_verified': False, 'live_figma_verified': False}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if errors else 0)

// 探针与生成脚本共用同一套定位语义：探针里能点到的元素，生成的脚本里用同一种写法定位。
// 允许的定位方式按优先级：role+name > label > placeholder > text > testid。不支持 CSS / XPath。

const KINDS = ['role', 'label', 'placeholder', 'text', 'testid'];

export function specFromFlags(flags) {
  const spec = {};
  for (const k of KINDS) if (flags[k] !== undefined) spec[k] = String(flags[k]);
  if (flags.name !== undefined) spec.name = String(flags.name);
  if (flags.exact) spec.exact = true;
  if (flags.nth !== undefined) spec.nth = Number(flags.nth);
  if (flags['in-role']) spec.within = { role: String(flags['in-role']), name: flags['in-name'] && String(flags['in-name']) };
  if (!KINDS.some((k) => spec[k] !== undefined)) {
    throw new Error('缺少定位参数：--role <角色> [--name <名称>] | --label | --placeholder | --text | --testid');
  }
  return spec;
}

export function buildLocator(page, spec) {
  let scope = page;
  if (spec.within) scope = page.getByRole(spec.within.role, spec.within.name ? { name: spec.within.name } : {});
  const exact = spec.exact ? { exact: true } : {};
  let loc;
  if (spec.role) loc = scope.getByRole(spec.role, spec.name !== undefined ? { name: spec.name, ...exact } : {});
  else if (spec.label) loc = scope.getByLabel(spec.label, exact);
  else if (spec.placeholder) loc = scope.getByPlaceholder(spec.placeholder, exact);
  else if (spec.text) loc = scope.getByText(spec.text, exact);
  else loc = scope.getByTestId(spec.testid);
  return spec.nth !== undefined ? loc.nth(spec.nth) : loc;
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function locatorCode(spec) {
  let code = 'page';
  if (spec.within) code += `.getByRole(${q(spec.within.role)}${spec.within.name ? `, { name: ${q(spec.within.name)} }` : ''})`;
  const exact = spec.exact ? ', exact: true' : '';
  if (spec.role) code += `.getByRole(${q(spec.role)}${spec.name !== undefined ? `, { name: ${q(spec.name)}${exact} }` : ''})`;
  else if (spec.label) code += `.getByLabel(${q(spec.label)}${spec.exact ? ', { exact: true }' : ''})`;
  else if (spec.placeholder) code += `.getByPlaceholder(${q(spec.placeholder)}${spec.exact ? ', { exact: true }' : ''})`;
  else if (spec.text) code += `.getByText(${q(spec.text)}${spec.exact ? ', { exact: true }' : ''})`;
  else code += `.getByTestId(${q(spec.testid)})`;
  if (spec.nth !== undefined) code += `.nth(${spec.nth})`;
  return code;
}

export { q as quote };

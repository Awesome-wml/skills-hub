import type { BaseRemoteSelectConfig } from '~/types/remoteSelect'

/** Search control rendered above the table (ProTable-style, column-driven). */
export type SchemaSearchControl =
  | 'input'
  | 'textarea'
  | 'inputnumber'
  | 'inputnumberrange'
  | 'inputrange'
  | 'digit-input'
  | 'alnum-input'
  | 'phone-input'
  | 'select'
  | 'remote-select'
  | 'tree-select'
  | 'cascader'
  | 'date'
  | 'datetime'
  | 'daterange'
  | 'datetimerange'
  | 'input-group'
  | 'daterange-group'
  | 'datetimerange-group'

export interface SchemaTableSearchOption {
  label: string
  value: string | number | boolean
}

/** 聚合查询条件的单个维度（维度下拉的一项）。 */
export interface SchemaSearchGroupItem {
  /**
   * 该维度选中时使用的请求参数名。
   * input-group：直接作为 params 的 key。
   * daterange-group / datetimerange-group：未配 rangeParamKeys 时把区间数组整体挂在该 key 下。
   */
  key: string
  /** 维度下拉显示文案，同时用于拼默认 placeholder。 */
  label: string
  /** 覆盖默认 placeholder。 */
  placeholder?: string
  /** 区间类维度：拆分参数 [startKey, endKey]，语义同列级 rangeParamKeys。 */
  rangeParamKeys?: [string, string]
  /** 区间类维度：value-format，缺省按控件类型取 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm:ss'。 */
  valueFormat?: string
}

export interface SchemaTableSearchConfig {
  /** Defaults to 'input' when column participates in search. */
  control?: SchemaSearchControl
  placeholder?: string
  /** Initial value used on first render and reset. A factory is re-evaluated on every reset. */
  defaultValue?: any | (() => any)
  /** Search field value changed callback. */
  onChange?: (value: any, option?: any, searchModel?: Record<string, any>) => void
  /** For digit-input / alnum-input: max length. */
  maxlength?: number
  /** For input-group: optional input sanitizer. */
  inputMode?: 'digit'
  /** Used by select control. */
  options?: SchemaTableSearchOption[]
  /** Enable local option filtering for select controls. */
  filterable?: boolean
  /** Enable multiple selection for select / remote-select controls. */
  multiple?: boolean
  /** Collapse selected tags when multiple is enabled. */
  collapseTags?: boolean
  /** Used by remote-select control. */
  remoteConfig?: SchemaTableRemoteSelectConfig
  /**
   * For tree-select control: passed to `el-tree-select` via v-bind（与菜单「上级菜单」一致：`data`、`checkStrictly` 等）。
   * 搜索模型存选中节点 id（单值）。
   */
  treeSelectProps?: Record<string, any>
  /**
   * For cascader control: passed to `el-cascader` via v-bind (e.g. `props` for lazyLoad、options).
   * 搜索模型里存选中路径数组；请求参数默认取路径最后一项作为 `dataIndex` 的值（叶子类目 id）。
   */
  cascaderProps?: Record<string, any>
  /** Range placeholders for daterange / datetimerange. */
  startPlaceholder?: string
  endPlaceholder?: string
  /**
   * For daterange / datetimerange: split range value into two params.
   * e.g. ['startDate', 'endDate'] — sent as { startDate: '...', endDate: '...' }
   * If not set, the range array is sent under the column's dataIndex.
   */
  rangeParamKeys?: [string, string]
  /** Value format string for date / datetime / daterange / datetimerange. */
  valueFormat?: string
  /** For inputnumber: min value. */
  min?: number
  /** For inputnumber: max value. */
  max?: number
  /** For inputnumber: step. */
  step?: number
  /** For inputnumber: precision (decimal places). */
  precision?: number
  /**
   * 聚合查询：control 为 'input-group' / 'daterange-group' / 'datetimerange-group' 时必填。
   * 列出可切换的各维度；数组第一项为默认选中维度。
   */
  group?: SchemaSearchGroupItem[]
  /** 折叠控件：切维度是否清空旧值，缺省 true（清空）；false 则各维度记忆各自的值。 */
  clearOnDimChange?: boolean
  /** date / datetime / 区间类与其 group 版：禁选日期函数。不传时区间类默认禁选未来日期。 */
  disabledDate?: (date: Date) => boolean
  /** 日期区间类与其 group 版：选完日期的默认时分秒，缺省 ['00:00:00','23:59:59'] 保证当天查全。 */
  defaultTime?: [Date, Date] | Date
  /** 区间类：快捷选项（近 7 天 / 本月等），透传给 el-date-picker。 */
  shortcuts?: Array<{ text: string; value: (() => Date[]) | Date[] }>
  /** 区间类：双面板是否解除联动，缺省 true（解除，便于跨月）。 */
  unlinkPanels?: boolean
}

export type SchemaTableRemoteSelectConfig = BaseRemoteSelectConfig

export type SchemaTableSortOrder = 'asc' | 'desc'

/** One visible table sort. Array order is the server-side sort priority. */
export interface SchemaTableSortItem {
  dataIndex: string
  order: SchemaTableSortOrder
}

/** Transport contract emitted by VabSchemaTable in combination-sort mode. */
export interface SchemaTableSortRequest {
  field: string
  direction: SchemaTableSortOrder
}

export interface SchemaTableColumn {
  /** Row field key; also used as search param key when search is enabled. */
  dataIndex?: string
  /** Stable key used by table/search personalization. Falls back to dataIndex. */
  preferenceKey?: string
  title: string
  /** Export contract key for list-driven field selection; false excludes an otherwise visible column. */
  exportKey?: string | false
  minWidth?: number | string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: boolean | 'left' | 'right'
  showOverflowTooltip?: boolean
  /**
   * Copyable document-number or plaintext-phone cell.
   * Default: column title ending with 单号, or a phone-like title, renders BizNo when the page does not provide a cell slot.
   * Masked values that contain * stay display-only. Click copies the displayed value; set true to force, false to opt out.
   */
  copyable?: boolean
  /** Custom class name for the column cells (e.g. 'is-money' for right-aligned money). */
  className?: string
  /** Hide field from auto-generated search row. */
  hideInSearch?: boolean
  /** Hide column in table (search-only field). */
  hideInTable?: boolean
  /** Default table visibility when personalization is enabled. Defaults to true. */
  defaultVisibleInTable?: boolean
  /** Default search-field visibility when personalization is enabled. Defaults to true. */
  defaultVisibleInSearch?: boolean
  /** Keep the table column visible in every personal view. */
  requiredInTable?: boolean
  /** Keep the search field visible in every personal view. */
  requiredInSearch?: boolean
  /** Render with schema defaults but exclude this field from personal settings. */
  disablePersonalization?: boolean
  /** Server-side sort. Object form maps a display dataIndex to the API allowlist field. */
  sorter?: boolean | { sortField: string }
  /** When present, column participates in the search form. */
  search?: SchemaTableSearchConfig
  /**
   * Formatter function for cell display.
   * Use for simple value transformations (e.g. money formatting).
   */
  formatter?: (row: any, column: any, cellValue: any, index: number) => string
  /**
   * Header tooltip text shown next to column title with a question-mark icon.
   * Use for non-obvious columns (money breakdowns, derived semantics, etc.).
   */
  headerTip?: string
}

export type SchemaTablePreferencePin = 'none' | 'left' | 'right'

export interface SchemaTablePreferencePayload {
  formatVersion: 1
  table: {
    columns: Array<{
      key: string
      visible: boolean
      pin: SchemaTablePreferencePin
      width?: number
    }>
  }
  search: {
    fields: Array<{
      key: string
      visible: boolean
    }>
  }
  acknowledged: {
    tableFields: string[]
    searchFields: string[]
  }
}

export interface SchemaTableColumnPreferenceItem {
  key: string
  title: string
  column: SchemaTableColumn
  visible: boolean
  isNew: boolean
  required: boolean
  configurable: boolean
  pin: SchemaTablePreferencePin
  width?: number
  schemaIndex: number
  defaultVisible: boolean
  defaultPin: SchemaTablePreferencePin
  defaultWidth?: number
}

export interface SchemaTableSearchPreferenceItem {
  key: string
  title: string
  column: SchemaTableColumn
  visible: boolean
  isNew: boolean
  required: boolean
  configurable: boolean
  schemaIndex: number
  defaultVisible: boolean
}

export interface ResolvedPreferenceSchema {
  table: SchemaTableColumnPreferenceItem[]
  search: SchemaTableSearchPreferenceItem[]
  warnings: string[]
}

export interface SerializePreferenceInput {
  tableItems: SchemaTableColumnPreferenceItem[]
  searchItems: SchemaTableSearchPreferenceItem[]
  acknowledged: SchemaTablePreferencePayload['acknowledged']
}

/** Declarative action button for the actions column. */
export interface SchemaTableAction {
  /** Button text */
  label: string | ((row: any) => string)
  /** el-button type, default 'primary' */
  type?:
    | ''
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | ((row: any) => '' | 'primary' | 'success' | 'warning' | 'danger' | 'info')
  /** Permission requirement aligned with `v-permissions` / `hasPermission`. */
  permission?: string[] | GuardType
  /** Click handler, receives the row data and row index */
  onClick?: (row: any, index: number) => void
  /** Dynamic visibility: return false to hide this action for a given row */
  show?: (row: any) => boolean
  /** Dynamic disable: return true to disable this action for a given row */
  disabled?: (row: any) => boolean
  /** Confirmation text; when set, clicking shows a confirm dialog before calling onClick */
  confirm?: string | ((row: any) => string)
  /** Child actions to be rendered inside a "more" dropdown. If provided, this action becomes a dropdown trigger. */
  children?: SchemaTableAction[]
}

/** Status filter option for the toolbar dropdown. */
export interface SchemaTableStatusOption {
  label: string
  value: string
  /** Badge count shown to the right of the label. Hidden when 0 or absent. */
  count?: number
}

export interface SchemaTableRequestResult {
  list: any[]
  total: number
}

/** Expose type for VabSchemaTable ref. */
export interface SchemaTableInstance {
  reload: () => void
  fetchData: () => Promise<void>
  queryData: () => void
  resetSearch: () => void
  /** 合并写入搜索条件；空值会清除对应 key */
  patchSearch?: (partial: Record<string, any>) => void
  /** 读取当前搜索表单已填参数，不含分页 */
  getSearchParams?: () => Record<string, any>
  /** 重置远程下拉状态；不传则重置全部 */
  resetRemoteSelects?: (fields?: string[]) => void
  clearSelection: () => void
  selectedRows: any[]
  tableRef: any
}

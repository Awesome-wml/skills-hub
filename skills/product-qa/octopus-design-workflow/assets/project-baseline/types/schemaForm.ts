import type { FormItemRule } from 'element-plus'
import type { UploadFolder } from '/@/api/fileUpload'
import type { UploadCompressOptions } from '/@/utils/uploadImageCompression'
import type { BaseRemoteSelectConfig } from '~/types/remoteSelect'

/** 表单控件类型 */
export type SchemaFormControl =
  | 'input'
  | 'textarea'
  | 'inputnumber'
  /** 纯数字输入（如短信验证码），配合 maxlength */
  | 'digit-input'
  /** 手机号输入（仅数字，最多 11 位） */
  | 'phone-input'
  /** 联系电话输入（数字与连字符，默认最多 20 位，WMS 固话等） */
  | 'telephone-input'
  | 'select'
  | 'remote-select'
  | 'date'
  | 'datetime'
  | 'daterange'
  | 'datetimerange'
  | 'switch'
  | 'radio'
  | 'checkbox'
  | 'divider'
  | 'slot'
  /** 单图上传：v-model 绑定 objectKey(string) */
  | 'upload'
  /** 多图上传：v-model 绑定 objectKey[](string[]) */
  | 'upload-list'

/** 下拉选项 */
export interface SchemaFormOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

/** 远程下拉配置 */
export interface SchemaFormRemoteSelectConfig extends BaseRemoteSelectConfig {
  /** 编辑回显：根据表单数据构建已选项，返回 null 表示无需回显 */
  buildSelectedItem?: (form: any) => any | null
  /**
   * 初始化时的动态查询参数。
   * - 用于编辑回显（如 { id: form.roomId }）或级联筛选（如 { warehouseId: form.warehouseId }）
   * - 这些参数会持久化到 hook 中，搜索和加载更多也会携带（适合级联场景，确保搜索也在父级范围内）
   * - 如果不需要附加参数，返回 {} 或不配置此项
   * @example (form) => form?.zoneId ? { id: form.zoneId } : {}
   */
  queryParamsFn?: (form: any) => Record<string, any>
  /**
   * 控制是否执行初始化请求。
   * - 返回 false 时跳过本次初始化（例如依赖字段还未填写时）
   * - 不配置时默认 true（始终初始化）
   * @example (form) => !!form.warehouseId
   */
  enabled?: (form: any) => boolean
  /**
   * 下拉面板宽度是否锁死为输入框宽度。
   * - 默认 true（element-plus 行为，面板宽度=输入框宽度）
   * - 设为 false 时面板按内容自适应（min-width=输入框宽度），用于选项文本较长、窄列表单显示不全的场景
   */
  fitInputWidth?: boolean
  /** 透传给下拉面板的自定义 class，配合 fitInputWidth=false 控制面板最小宽度 */
  popperClass?: string
}

/** 字段依赖配置 */
export interface SchemaFormDependency {
  /** 值变更时清空的字段名数组 */
  clearFields?: string[]
  /** 值变更回调 */
  onChange?: (value: any, form: any, optionList?: any[]) => void
}

/** 单个表单字段配置 */
export interface SchemaFormField {
  /** 字段名 */
  field: string
  /** 标签文本 */
  label: string
  /** 控件类型，默认 'input' */
  control?: SchemaFormControl
  /** 栅格列宽，默认取组件 defaultColSpan */
  colSpan?: number
  /** 占位提示 */
  placeholder?: string
  /** 默认值 */
  defaultValue?: any

  // ---- 校验 ----
  /** 是否必填 */
  required?: boolean
  /** 是否显示自定义必填星标；用于仅展示红星、不走默认 required 校验的场景 */
  requiredMark?: boolean
  /** 自定义校验规则 */
  rules?: FormItemRule[]
  /** 跳过 SchemaForm 自动注入的默认 required 规则，仅保留自定义 rules */
  skipDefaultRequiredRule?: boolean

  // ---- 行为 ----
  /** 编辑模式下禁用 */
  disabledOnEdit?: boolean
  /** 始终禁用 */
  disabled?: boolean
  /** 动态隐藏 */
  hidden?: (form: any, isEdit: boolean) => boolean

  // ---- 控件专属属性 ----
  /** textarea 行数 */
  rows?: number
  /** 输入框/文本域只读 */
  readonly?: boolean
  /** digit-input 最大字符长度，默认 6 */
  maxlength?: number
  /** inputnumber 最小值 */
  min?: number
  /** inputnumber 最大值 */
  max?: number
  /** inputnumber 精度 */
  precision?: number
  /** inputnumber 步长 */
  step?: number
  /** 数字输入模式：integer 仅整数，decimal 小数 */
  numberMode?: 'integer' | 'decimal'
  /** select / radio / checkbox 静态选项 */
  options?: SchemaFormOption[]
  /** select 是否多选 */
  multiple?: boolean
  /** 多选标签是否折叠 */
  collapseTags?: boolean
  /** remote-select 配置 */
  remoteConfig?: SchemaFormRemoteSelectConfig
  /** 日期格式化 */
  valueFormat?: string
  /** 日期显示格式 */
  format?: string
  /** 范围选择器起始占位 */
  startPlaceholder?: string
  /** 范围选择器结束占位 */
  endPlaceholder?: string
  /** switch 激活值 */
  activeValue?: any
  /** switch 非激活值 */
  inactiveValue?: any

  // ---- 依赖 ----
  /** 字段依赖配置 */
  dependency?: SchemaFormDependency

  // ---- upload / upload-list 专属属性 ----
  /**
   * 上传目录，对应后端 /v1/file/upload 的 folder 参数
   * 适用于 control: 'upload' | 'upload-list'
   */
  folder?: UploadFolder
  /** 上传接受的文件类型 */
  accept?: string
  /**
   * 回显 URL 的来源字段名（form 中存放预览 URL 的字段）。
   * - 'upload'：form[displayField] 为 string，上传成功后自动写入 url
   * - 'upload-list'：form[displayField] 为 string[]，上传成功后自动写入 urls
   * - 不配置时编辑回显需通过 after-open 手动赋值
   */
  displayField?: string
  /**
   * 多图上传最大数量，适用于 control: 'upload-list'，默认 10
   */
  uploadLimit?: number
  /**
   * 最大文件大小（MB），适用于 control: 'upload' | 'upload-list'，默认 5
   */
  maxSizeMb?: number
  /**
   * 是否在上传前压缩图片。适用于 control: 'upload' | 'upload-list'
   */
  compressUpload?: boolean
  /**
   * 上传前压缩图片配置。适用于 control: 'upload' | 'upload-list'
   */
  compressUploadOptions?: UploadCompressOptions
}

/** VabSchemaForm 实例类型 */
export interface SchemaFormInstance {
  /** 触发表单校验，返回是否通过 */
  validate: () => Promise<boolean>
  /** 重置表单到默认值 */
  resetFields: () => void
  /** 清除校验状态 */
  clearValidate: () => void
  /** 填充表单数据 */
  setValues: (data: Record<string, any>) => void
  /** 获取表单数据副本 */
  getValues: () => Record<string, any>
  /** 设置编辑/新增模式 */
  setEditMode: (isEdit: boolean) => void
  /** 初始化远程下拉（含回显） */
  initRemoteSelects: (formData?: Record<string, any>) => Promise<void>
  /** 表单数据（只读访问） */
  form: Record<string, any>
  /** 当前是否编辑模式 */
  isEdit: boolean
}

/** VabSchemaFormDialog 实例类型 */
export interface SchemaFormDialogInstance extends SchemaFormInstance {
  /** 打开弹窗，传入 row 为编辑模式 */
  showEdit: (row?: any) => void
  /** 关闭弹窗 */
  close: () => void
}

/** VabSchemaFormDrawer 实例类型 */
export interface SchemaFormDrawerInstance extends SchemaFormInstance {
  /** 打开抽屉，传入 row 为编辑模式 */
  showEdit: (row?: any) => void
  /** 关闭抽屉 */
  close: () => void
}

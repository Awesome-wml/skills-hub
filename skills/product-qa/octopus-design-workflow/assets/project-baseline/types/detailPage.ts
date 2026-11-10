import type { InjectionKey, Ref } from 'vue'

/** Context provided by VabDetailPage to child components via provide/inject */
export interface DetailPageContext<T = Record<string, any>> {
  /** Main detail data */
  detail: Ref<T | null>
  /** Main request loading state */
  loading: Ref<boolean>
  /** Main request error */
  error: Ref<Error | null>
  /** Reload main data */
  reload: () => Promise<void>
}

/** Injection key for DetailPageContext */
export const DETAIL_PAGE_CONTEXT_KEY: InjectionKey<DetailPageContext> = Symbol('VabDetailPageContext')

/** Instance type exposed by VabDetailPage */
export interface DetailPageInstance<T = Record<string, any>> {
  detail: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  reload: () => Promise<void>
}

/** Instance type exposed by VabDetailSection */
export interface DetailSectionInstance<T = unknown> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  reload: () => Promise<void>
}

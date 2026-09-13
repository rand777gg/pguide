/**
 * @pguide/shared —— 项导前端共享层
 *
 * 只放**与具体业务无关**的东西：通用类型、常量、纯函数工具。
 * 业务接口定义放 `@pguide/api`，UI 组件放各自的 app 内。
 *
 * 该包直接以 TS 源码形式被消费（package.json 的 exports 指向 src/index.ts），
 * 由 Vite 负责转译，不单独产出 dist。
 */

export * from './constants/http-status'
export * from './constants/storage-keys'
export * from './types/user'
export * from './utils/storage'

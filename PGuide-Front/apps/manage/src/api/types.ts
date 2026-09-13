/**
 * RuoYi 侧实体类型。
 *
 * 字段名严格对应后端（`com.ruoyi.*.domain`）与数据库列（下划线转驼峰）。
 * 对照的权威来源是 `PGuide-Manage/ruoyi-admin/src/main/resources/` 下的
 * 实体类，改这里之前先核对那边。
 */

/** 部门（sys_dept） */
export interface SysDept {
  deptId: number
  parentId: number
  ancestors?: string
  deptName: string
  orderNum: number
  leader?: string
  phone?: string
  email?: string
  /** 0 正常 1 停用 */
  status?: string
  createTime?: string
  children?: SysDept[]
}

/** 角色（sys_role） */
export interface SysRole {
  roleId: number
  roleName: string
  roleKey: string
  roleSort: number
  /** 数据范围：1 全部 2 自定义 3 本部门 4 本部门及以下 5 仅本人 */
  dataScope?: string
  /** 0 正常 1 停用 */
  status?: string
  remark?: string
  createTime?: string
  /** 回显用：该角色已分配的菜单 id */
  menuIds?: number[]
}

/** 菜单（sys_menu）。menuType: M 目录 C 菜单 F 按钮 */
export interface SysMenu {
  menuId: number
  menuName: string
  parentId: number
  orderNum: number
  path?: string
  component?: string
  query?: string
  /** 是否外链：0 是 1 否 */
  isFrame?: string
  /** 是否缓存：0 缓存 1 不缓存 */
  isCache?: string
  /** M 目录 C 菜单 F 按钮 */
  menuType: string
  /** 0 显示 1 隐藏 */
  visible?: string
  /** 0 正常 1 停用 */
  status?: string
  perms?: string
  icon?: string
  createTime?: string
  children?: SysMenu[]
}

/** 用户（sys_user） */
export interface SysUser {
  userId: number
  deptId?: number
  userName: string
  nickName: string
  email?: string
  phonenumber?: string
  /** 0 男 1 女 2 未知 */
  sex?: string
  avatar?: string
  /** 0 正常 1 停用 */
  status?: string
  dept?: SysDept
  roles?: SysRole[]
  roleIds?: number[]
  postIds?: number[]
  remark?: string
  createTime?: string
}

/** 岗位（sys_post） */
export interface SysPost {
  postId: number
  postCode: string
  postName: string
  postSort: number
  status?: string
  remark?: string
}

/** 参数配置（sys_config） */
export interface SysConfig {
  configId?: number
  configName: string
  configKey: string
  configValue: string
  /** Y 系统内置（不允许删除）N 否 */
  configType?: string
  remark?: string
  createTime?: string
}

/** 通知公告（sys_notice） */
export interface SysNotice {
  noticeId?: number
  noticeTitle: string
  /** 1 通知 2 公告 */
  noticeType?: string
  noticeContent?: string
  /** 0 正常 1 关闭 */
  status?: string
  createBy?: string
  createTime?: string
  remark?: string
}

/**
 * 操作日志（sys_oper_log）。
 *
 * ⚠️ `businessType` 与 `status` 在实体里是 **Integer**，不是字符串
 * （`SysLogininfor.status` 才是 String）。字典表的 value 直接写数字，
 * renderCell 的字典查找两边都做了 String() 归一，所以能对上。
 */
export interface SysOperlog {
  operId: number
  /** 模块标题，如「用户管理」 */
  title?: string
  /** 业务类型：0 其它 1 新增 2 修改 3 删除 4 授权 5 导出 6 导入 7 强退 8 生成代码 9 清空数据 */
  businessType?: number
  /** 方法名称 */
  method?: string
  requestMethod?: string
  /** 操作类别：0 其它 1 后台用户 2 手机端用户 */
  operatorType?: number
  operName?: string
  deptName?: string
  operUrl?: string
  operIp?: string
  operLocation?: string
  /** 请求参数（可能很长，表格里靠省略号） */
  operParam?: string
  jsonResult?: string
  /** 0 正常 1 异常 */
  status?: number
  errorMsg?: string
  operTime?: string
  /** 耗时（毫秒） */
  costTime?: number
}

/** 登录日志（sys_logininfor） */
export interface SysLogininfor {
  infoId: number
  userName?: string
  /** 0 成功 1 失败 */
  status?: string
  ipaddr?: string
  loginLocation?: string
  browser?: string
  os?: string
  msg?: string
  loginTime?: string
}

/** 字典类型（sys_dict_type） */
export interface SysDictType {
  dictId?: number
  dictName: string
  dictType: string
  status?: string
  remark?: string
  createTime?: string
}

/** 字典数据（sys_dict_data） */
export interface SysDictData {
  dictCode?: number
  dictSort: number
  dictLabel: string
  dictValue: string
  dictType: string
  cssClass?: string
  listClass?: string
  /** Y 默认 N 否 */
  isDefault?: string
  status?: string
  remark?: string
}

/** 树选择节点（RuoYi 的 TreeSelect 结构） */
export interface TreeSelectNode {
  id: number
  label: string
  children?: TreeSelectNode[]
}

/** `/getInfo` 的返回（注意 user/roles/permissions 是平铺在顶层的） */
export interface UserInfoResult {
  user: SysUser
  roles: string[]
  permissions: string[]
  isDefaultModifyPwd?: boolean
  isPasswordExpired?: boolean
}

/** `/getRouters` 返回的动态路由 */
export interface DynamicRouteMeta {
  title: string
  icon?: string
  noCache?: boolean
  link?: string | null
}

export interface DynamicRoute {
  name?: string
  path: string
  hidden?: boolean
  redirect?: string
  component?: string
  alwaysShow?: boolean
  meta?: DynamicRouteMeta
  children?: DynamicRoute[]
}

/** `/captchaImage` 的返回 */
export interface CaptchaImageResult {
  captchaEnabled: boolean
  uuid: string
  img?: string
}

-- ============================================================
-- PGuide 业务菜单
--
-- 背景：`20-ruoyi-vue-3.8.6-baseline.sql` 只灌了 RuoYi 自带的那套菜单
-- （系统管理 / 系统监控 / 系统工具），**没有任何 pguide 业务菜单**。
-- 结果是 ruoyi-ui 里那些 views/manage、views/cmsmanage、views/usercenter
-- 页面虽然在，却没有任何入口能点进去 —— 等于死代码。
--
-- 这个脚本把业务菜单补上，让新的管理端（apps/manage）能真正导航到它们。
--
-- 菜单是**后端驱动**的：`component` 字段写的是前端组件路径，
-- 相对于 apps/manage/src/views/，**不带 .vue 后缀**。
-- 如果路径写错，新版前端会跳到占位页并明确提示（老版是静默白屏）。
--
-- menu_id 从 2000 开始，避开 RuoYi 基线的 1~117 / 500~501 / 1000~1060。
--
-- 全部用 `INSERT IGNORE`，脚本**可以重复执行**：docker 的 init 脚本只在数据卷
-- 首次创建时跑一次，已经有数据的库要手工补 —— 手工补时若不忽略主键冲突，
-- 第一条就报 Duplicate entry 并中断整段。IGNORE 只跳过已存在的行，
-- 不会覆盖别人在界面上改过的菜单。
-- ============================================================

SET NAMES utf8mb4;
USE `pguide_manage`;

-- ------------------------------------------------------------
-- 一级目录
-- ------------------------------------------------------------
INSERT IGNORE INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `remark`)
VALUES
  (2000, '项导业务', 0, 4, 'pguide', NULL, 1, 0, 'M', '0', '0', NULL, 'mms', 'admin', 'PGuide 业务模块');

-- ------------------------------------------------------------
-- 二级菜单
-- ------------------------------------------------------------
INSERT IGNORE INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `remark`)
VALUES
  (2010, '项目管理',   2000, 1, 'project',     'mms/project/index',        1, 0, 'C', '0', '0', 'manage:projectinfo:list',       'project',     'admin', '组队项目主表'),
  (2020, '招募需求',   2000, 2, 'recruit',     'mms/recruit/index',        1, 0, 'C', '0', '0', 'manage:recruitinfo:list',       'edit',        'admin', '项目招募需求'),
  (2030, '竞赛管理',   2000, 3, 'competition', 'cms/competition/index',    1, 0, 'C', '0', '0', 'manage:cptinfo:list',           'competition', 'admin', '竞赛信息'),
  (2040, '学科字典',   2000, 4, 'subject',     'cms/subject/index',        1, 0, 'C', '0', '0', 'manage:subjectdict:list',       'subject',     'admin', '学科分类字典，前端首页学科树的数据源'),
  (2050, '学生信息',   2000, 5, 'student',     'usercenter/student/index', 1, 0, 'C', '0', '0', 'project:info:list',             'student',     'admin', '用户中心学生信息'),
  (2060, '教师信息',   2000, 6, 'teacher',     'usercenter/teacher/index', 1, 0, 'C', '0', '0', 'project:info:list',             'teacher',     'admin', '用户中心教师信息');

-- ------------------------------------------------------------
-- 按钮权限
--
-- 超级管理员（userId=1）在后端会被直接授予 *:*:*，不依赖这些行；
-- 但给其它角色分配权限时需要有这些细粒度权限点，所以一并补上。
-- setup 表里 sys_menu 不含 role 关联，这里也不动 sys_role_menu。
-- ------------------------------------------------------------
INSERT IGNORE INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`)
VALUES
  -- 项目管理
  (2011, '项目查询', 2010, 1, '', NULL, 1, 0, 'F', '0', '0', 'manage:projectinfo:query',  '#', 'admin'),
  (2012, '项目新增', 2010, 2, '', NULL, 1, 0, 'F', '0', '0', 'manage:projectinfo:add',    '#', 'admin'),
  (2013, '项目修改', 2010, 3, '', NULL, 1, 0, 'F', '0', '0', 'manage:projectinfo:edit',   '#', 'admin'),
  (2014, '项目删除', 2010, 4, '', NULL, 1, 0, 'F', '0', '0', 'manage:projectinfo:remove', '#', 'admin'),
  -- 招募需求
  (2021, '招募查询', 2020, 1, '', NULL, 1, 0, 'F', '0', '0', 'manage:recruitinfo:query',  '#', 'admin'),
  (2022, '招募新增', 2020, 2, '', NULL, 1, 0, 'F', '0', '0', 'manage:recruitinfo:add',    '#', 'admin'),
  (2023, '招募修改', 2020, 3, '', NULL, 1, 0, 'F', '0', '0', 'manage:recruitinfo:edit',   '#', 'admin'),
  (2024, '招募删除', 2020, 4, '', NULL, 1, 0, 'F', '0', '0', 'manage:recruitinfo:remove', '#', 'admin'),
  -- 竞赛管理
  (2031, '竞赛查询', 2030, 1, '', NULL, 1, 0, 'F', '0', '0', 'manage:cptinfo:query',      '#', 'admin'),
  (2032, '竞赛新增', 2030, 2, '', NULL, 1, 0, 'F', '0', '0', 'manage:cptinfo:add',        '#', 'admin'),
  (2033, '竞赛修改', 2030, 3, '', NULL, 1, 0, 'F', '0', '0', 'manage:cptinfo:edit',       '#', 'admin'),
  (2034, '竞赛删除', 2030, 4, '', NULL, 1, 0, 'F', '0', '0', 'manage:cptinfo:remove',     '#', 'admin'),
  -- 学科字典
  (2041, '学科查询', 2040, 1, '', NULL, 1, 0, 'F', '0', '0', 'manage:subjectdict:query',  '#', 'admin'),
  (2042, '学科新增', 2040, 2, '', NULL, 1, 0, 'F', '0', '0', 'manage:subjectdict:add',    '#', 'admin'),
  (2043, '学科修改', 2040, 3, '', NULL, 1, 0, 'F', '0', '0', 'manage:subjectdict:edit',   '#', 'admin'),
  (2044, '学科删除', 2040, 4, '', NULL, 1, 0, 'F', '0', '0', 'manage:subjectdict:remove', '#', 'admin'),
  -- 学生信息（权限前缀与教师共用 project:info，见本文件末尾的说明）
  (2051, '学生查询', 2050, 1, '', NULL, 1, 0, 'F', '0', '0', 'project:info:query',   '#', 'admin'),
  (2052, '学生新增', 2050, 2, '', NULL, 1, 0, 'F', '0', '0', 'project:info:add',     '#', 'admin'),
  (2053, '学生修改', 2050, 3, '', NULL, 1, 0, 'F', '0', '0', 'project:info:edit',    '#', 'admin'),
  (2054, '学生删除', 2050, 4, '', NULL, 1, 0, 'F', '0', '0', 'project:info:remove',  '#', 'admin'),
  -- 教师信息
  (2061, '教师查询', 2060, 1, '', NULL, 1, 0, 'F', '0', '0', 'project:info:query',   '#', 'admin'),
  (2062, '教师新增', 2060, 2, '', NULL, 1, 0, 'F', '0', '0', 'project:info:add',     '#', 'admin'),
  (2063, '教师修改', 2060, 3, '', NULL, 1, 0, 'F', '0', '0', 'project:info:edit',    '#', 'admin'),
  (2064, '教师删除', 2060, 4, '', NULL, 1, 0, 'F', '0', '0', 'project:info:remove',  '#', 'admin');

-- ------------------------------------------------------------
-- 导出按钮权限
--
-- 每个业务 Controller 都有 `POST {base}/export`，@PreAuthorize 用的是
-- 同一个前缀 + `:export`；管理端 CrudPage 的「导出」按钮按这个权限点显隐。
-- 超级管理员有 *:*:*，不加这些行也能导出；加上是为了能给别的角色单独授权。
--
-- 注意：`SysMenuController` / `SysDeptController` 没有 /export，
-- 所以菜单、部门两个页面没有导出按钮，也就没有对应的权限行。
-- ------------------------------------------------------------
INSERT IGNORE INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`)
VALUES
  (2015, '项目导出', 2010, 5, '', NULL, 1, 0, 'F', '0', '0', 'manage:projectinfo:export',    '#', 'admin'),
  (2025, '招募导出', 2020, 5, '', NULL, 1, 0, 'F', '0', '0', 'manage:recruitinfo:export',    '#', 'admin'),
  (2035, '竞赛导出', 2030, 5, '', NULL, 1, 0, 'F', '0', '0', 'manage:cptinfo:export',        '#', 'admin'),
  (2045, '学科导出', 2040, 5, '', NULL, 1, 0, 'F', '0', '0', 'manage:subjectdict:export',    '#', 'admin'),
  -- 学生与教师两个 Controller 的 @PreAuthorize 用的是**同一个**前缀
  -- （`UsercenterStudentInfoController` / `UsercenterTeacherInfoController`
  -- 都是 `project:info:*`），所以这两行的权限串相同。
  (2055, '学生导出', 2050, 5, '', NULL, 1, 0, 'F', '0', '0', 'project:info:export',          '#', 'admin'),
  (2065, '教师导出', 2060, 5, '', NULL, 1, 0, 'F', '0', '0', 'project:info:export',          '#', 'admin');

-- ------------------------------------------------------------
-- 修正：权限串必须与后端 @PreAuthorize 完全一致
--
-- 上面用的是 `INSERT IGNORE`，对**已经存在**的行不会覆盖，
-- 所以历史数据要用 UPDATE 修。这里修的是两类真实的不一致：
--
--   1. CMS 两个菜单写成了 `cmsmanage:*`，但 `CmsCptInfoController` /
--      `CmsSubjectDictController` 的 @PreAuthorize 用的是 `manage:*`。
--      （`cmsmanage` 只是 URL 前缀，不是权限前缀。）
--   2. 学生/教师菜单写成了 `project:info:student:*` / `project:info:teacher:*`，
--      但两个 Controller 用的都是 `project:info:*`。
--
-- 这类错误的典型表现：**管理员一切正常**（他有 *:*:*），
-- 而普通角色按钮消失、接口 403 —— 所以很容易蒙混过关，值得当成一个坑记下来。
--
-- UPDATE 是幂等的：写的就是目标值，重复执行无副作用。
-- ------------------------------------------------------------
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:list'       WHERE `menu_id` = 2030;
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:query'      WHERE `menu_id` = 2031;
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:add'        WHERE `menu_id` = 2032;
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:edit'       WHERE `menu_id` = 2033;
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:remove'     WHERE `menu_id` = 2034;
UPDATE `sys_menu` SET `perms` = 'manage:cptinfo:export'     WHERE `menu_id` = 2035;

UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:list'   WHERE `menu_id` = 2040;
UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:query'  WHERE `menu_id` = 2041;
UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:add'    WHERE `menu_id` = 2042;
UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:edit'   WHERE `menu_id` = 2043;
UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:remove' WHERE `menu_id` = 2044;
UPDATE `sys_menu` SET `perms` = 'manage:subjectdict:export' WHERE `menu_id` = 2045;

UPDATE `sys_menu` SET `perms` = 'project:info:list'         WHERE `menu_id` = 2050;
UPDATE `sys_menu` SET `perms` = 'project:info:query'        WHERE `menu_id` = 2051;
UPDATE `sys_menu` SET `perms` = 'project:info:add'          WHERE `menu_id` = 2052;
UPDATE `sys_menu` SET `perms` = 'project:info:edit'         WHERE `menu_id` = 2053;
UPDATE `sys_menu` SET `perms` = 'project:info:remove'       WHERE `menu_id` = 2054;

UPDATE `sys_menu` SET `perms` = 'project:info:list'         WHERE `menu_id` = 2060;
UPDATE `sys_menu` SET `perms` = 'project:info:query'        WHERE `menu_id` = 2061;
UPDATE `sys_menu` SET `perms` = 'project:info:add'          WHERE `menu_id` = 2062;
UPDATE `sys_menu` SET `perms` = 'project:info:edit'         WHERE `menu_id` = 2063;
UPDATE `sys_menu` SET `perms` = 'project:info:remove'       WHERE `menu_id` = 2064;

-- ------------------------------------------------------------
-- 隐藏 RuoYi 自带的外链菜单「若依官网」（menu_id = 4）
--
-- 它是框架作者的门户站外链（`path` 直接就是 `http://ruoyi.vip`），
-- 跟本项目无关，留在侧边栏里只会让人问「为什么还有 ruoyi 的」。
--
-- 顺带说明：正是这条菜单的 path 让 vue-router 抛过
-- `Route paths should start with a "/"` —— 于是「密码没错但登不进去」。
-- 前端已经能正确处理外链菜单了（见 apps/manage/src/utils/dynamic-route.ts
-- 的 externalRoutePath），这里只是把它从菜单里摘掉。
--
-- `visible = '1'` 表示隐藏（RuoYi 的字段语义就是这个），路由仍然存在，
-- 只是侧边栏不显示。想恢复成显示（比如留着当参考）就改成 '0'：
--   UPDATE sys_menu SET visible = '0' WHERE menu_id = 4;
-- ------------------------------------------------------------
UPDATE `sys_menu` SET `visible` = '1' WHERE `menu_id` = 4;

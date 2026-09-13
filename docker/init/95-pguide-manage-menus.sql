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
-- ============================================================

SET NAMES utf8mb4;
USE `pguide_manage`;

-- ------------------------------------------------------------
-- 一级目录
-- ------------------------------------------------------------
INSERT INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `remark`)
VALUES
  (2000, '项导业务', 0, 4, 'pguide', NULL, 1, 0, 'M', '0', '0', NULL, 'mms', 'admin', 'PGuide 业务模块');

-- ------------------------------------------------------------
-- 二级菜单
-- ------------------------------------------------------------
INSERT INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`,
   `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `remark`)
VALUES
  (2010, '项目管理',   2000, 1, 'project',     'mms/project/index',        1, 0, 'C', '0', '0', 'manage:projectinfo:list',       'project',     'admin', '组队项目主表'),
  (2020, '招募需求',   2000, 2, 'recruit',     'mms/recruit/index',        1, 0, 'C', '0', '0', 'manage:recruitinfo:list',       'edit',        'admin', '项目招募需求'),
  (2030, '竞赛管理',   2000, 3, 'competition', 'cms/competition/index',    1, 0, 'C', '0', '0', 'cmsmanage:cptinfo:list',        'competition', 'admin', '竞赛信息'),
  (2040, '学科字典',   2000, 4, 'subject',     'cms/subject/index',        1, 0, 'C', '0', '0', 'cmsmanage:subjectdict:list',    'subject',     'admin', '学科分类字典，前端首页学科树的数据源'),
  (2050, '学生信息',   2000, 5, 'student',     'usercenter/student/index', 1, 0, 'C', '0', '0', 'project:info:student:list',     'student',     'admin', '用户中心学生信息'),
  (2060, '教师信息',   2000, 6, 'teacher',     'usercenter/teacher/index', 1, 0, 'C', '0', '0', 'project:info:teacher:list',     'teacher',     'admin', '用户中心教师信息');

-- ------------------------------------------------------------
-- 按钮权限
--
-- 超级管理员（userId=1）在后端会被直接授予 *:*:*，不依赖这些行；
-- 但给其它角色分配权限时需要有这些细粒度权限点，所以一并补上。
-- setup 表里 sys_menu 不含 role 关联，这里也不动 sys_role_menu。
-- ------------------------------------------------------------
INSERT INTO `sys_menu`
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
  (2031, '竞赛查询', 2030, 1, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:cptinfo:query',   '#', 'admin'),
  (2032, '竞赛新增', 2030, 2, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:cptinfo:add',     '#', 'admin'),
  (2033, '竞赛修改', 2030, 3, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:cptinfo:edit',    '#', 'admin'),
  (2034, '竞赛删除', 2030, 4, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:cptinfo:remove',  '#', 'admin'),
  -- 学科字典
  (2041, '学科查询', 2040, 1, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:subjectdict:query',  '#', 'admin'),
  (2042, '学科新增', 2040, 2, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:subjectdict:add',    '#', 'admin'),
  (2043, '学科修改', 2040, 3, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:subjectdict:edit',   '#', 'admin'),
  (2044, '学科删除', 2040, 4, '', NULL, 1, 0, 'F', '0', '0', 'cmsmanage:subjectdict:remove', '#', 'admin'),
  -- 学生信息
  (2051, '学生查询', 2050, 1, '', NULL, 1, 0, 'F', '0', '0', 'project:info:student:query',  '#', 'admin'),
  (2052, '学生新增', 2050, 2, '', NULL, 1, 0, 'F', '0', '0', 'project:info:student:add',    '#', 'admin'),
  (2053, '学生修改', 2050, 3, '', NULL, 1, 0, 'F', '0', '0', 'project:info:student:edit',   '#', 'admin'),
  (2054, '学生删除', 2050, 4, '', NULL, 1, 0, 'F', '0', '0', 'project:info:student:remove', '#', 'admin'),
  -- 教师信息
  (2061, '教师查询', 2060, 1, '', NULL, 1, 0, 'F', '0', '0', 'project:info:teacher:query',  '#', 'admin'),
  (2062, '教师新增', 2060, 2, '', NULL, 1, 0, 'F', '0', '0', 'project:info:teacher:add',    '#', 'admin'),
  (2063, '教师修改', 2060, 3, '', NULL, 1, 0, 'F', '0', '0', 'project:info:teacher:edit',   '#', 'admin'),
  (2064, '教师删除', 2060, 4, '', NULL, 1, 0, 'F', '0', '0', 'project:info:teacher:remove', '#', 'admin');

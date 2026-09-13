-- ============================================================
-- PGuide 业务表结构（反推重建版）
--
-- 【重要说明】
-- 项目原始 DDL 已彻底丢失：全组织 12 个仓库、所有分支均无 .sql 文件，
-- 原 init_sql/ 里只有一份几乎空的 ER 图（仅含 usercenter_group_user_summary 一张表）。
-- 远程数据库（47.109.136.236）已过期无法连接。
--
-- 本文件由以下两个来源交叉重建：
--   1. 实体类的字段名与 Java 类型（@TableId / @TableField / 字段声明）
--   2. mapper XML 的 <resultMap> column 列表（列名的权威来源）
--
-- 【已知不确定项】
--   - 字符串字段的**长度**、数值字段的**宽度**、以及部分字段的精确类型
--     无法从代码反推，此处按 RuoYi 惯例取值。若长度不够，请按报错调整。
--   - 索引与外键：代码中未见约束定义，此处只建主键，业务索引建议后续按慢查询补。
--   - 字符集与排序规则取自 init_sql/readme.md 的声明：utf8mb4 / utf8mb4_unicode_ci
--
-- 表归属依据 PGuide-Manage-Main 的 application-druid.yml 四个数据源。
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- 一、pguide_manage（主库）—— pguide-project-demo 模块
-- ============================================================
USE `pguide_manage`;

-- 任务大厅表
DROP TABLE IF EXISTS `project_task`;
CREATE TABLE `project_task` (
  `task_id`         bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '任务id',
  `task_name`       varchar(64)  DEFAULT NULL COMMENT '任务名',
  `task_detail`     varchar(1000) DEFAULT NULL COMMENT '任务详情',
  `task_start_time` datetime     DEFAULT NULL COMMENT '任务起始时间',
  `task_end_time`   datetime     DEFAULT NULL COMMENT '任务截至时间',
  `task_show`       int(1)       DEFAULT '1' COMMENT '任务显示状态 0关闭 1显示',
  `task_state_type` int(1)       DEFAULT '0' COMMENT '任务状态 0未开始 1进行中 2已完成 3暂停 4废除',
  `user_id`         varchar(64)  DEFAULT NULL COMMENT '发布者id',
  `user_name`       varchar(64)  DEFAULT NULL COMMENT '冗余字段，对应用户表中用户名',
  `reward`          bigint(20)   DEFAULT '0' COMMENT '完成奖励金币数',
  `created`         datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `updated`         datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`         int(1)       DEFAULT '0' COMMENT '逻辑删除，1表示删除，0没删',
  PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务大厅表';

-- 任务大厅标签表
DROP TABLE IF EXISTS `project_task_tag`;
CREATE TABLE `project_task_tag` (
  `tags_id`   bigint(20)  NOT NULL AUTO_INCREMENT COMMENT 'tags id',
  `tags_name` varchar(64) DEFAULT NULL COMMENT 'tags名',
  `tags_type` varchar(20) DEFAULT NULL COMMENT 'tags类型，null,success,warning,danger',
  `task_id`   bigint(20)  DEFAULT NULL COMMENT '所属task',
  PRIMARY KEY (`tags_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务大厅标签表';

-- 大厅任务接收者情况
DROP TABLE IF EXISTS `project_task_receiver`;
CREATE TABLE `project_task_receiver` (
  `task_id` bigint(20) DEFAULT NULL COMMENT '任务id',
  `user_id` bigint(20) DEFAULT NULL COMMENT '接收者用户id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大厅任务接收者情况';

-- 日志中心顶层表
DROP TABLE IF EXISTS `project_log_top`;
CREATE TABLE `project_log_top` (
  `log_type_id` bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '日志类型id',
  `log_type`    varchar(64) DEFAULT NULL COMMENT '日志类型(大标题)',
  `log_author`  varchar(64) DEFAULT NULL COMMENT '日志作者',
  PRIMARY KEY (`log_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日志中心顶层表';

-- 日志中心详情表
DROP TABLE IF EXISTS `project_log_detail`;
CREATE TABLE `project_log_detail` (
  `log_id`          bigint(20)    NOT NULL AUTO_INCREMENT COMMENT '日志id',
  `log_type_id`     bigint(20)    DEFAULT NULL COMMENT '日志id与top表关联',
  `log_detail_type` int(1)        DEFAULT NULL COMMENT '日志类型 0日志抬头 1本次更新 2存在问题 3未来规划',
  `log_info`        varchar(2000) DEFAULT NULL COMMENT '日志信息',
  `log_time`        datetime      DEFAULT NULL COMMENT '日志记录时间',
  `created`         datetime      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`         datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日志中心详情表';

-- 角色-任务关联表
DROP TABLE IF EXISTS `sys_role_task`;
CREATE TABLE `sys_role_task` (
  `role_id` varchar(64) NOT NULL COMMENT '角色id',
  `task_id` int(11)     NOT NULL COMMENT '任务id',
  PRIMARY KEY (`role_id`, `task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色任务关联表';


-- ============================================================
-- 二、pguide_usercenter（用户中心）—— pguide-back-user-manage / auth-manage
-- ============================================================
USE `pguide_usercenter`;

-- 学生信息表
DROP TABLE IF EXISTS `usercenter_student_info`;
CREATE TABLE `usercenter_student_info` (
  `student_id`          bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '学生id',
  -- ↓ 这两列实体类（UsercenterStudentInfo）有声明，但反推重建时漏了，
  --   登录链路查学生信息会报 Unknown column 'student_name'，故补上。
  `student_name`        varchar(64)  DEFAULT NULL COMMENT '学生姓名',
  `student_nick`        varchar(64)  DEFAULT NULL COMMENT '昵称',
  `student_account`     varchar(30)  DEFAULT NULL COMMENT '学生账号',
  `student_password`    varchar(100) DEFAULT NULL COMMENT '学生密码',
  `work_id`             varchar(64)  DEFAULT NULL COMMENT '学号/工号',
  `student_sex`         char(1)      DEFAULT NULL COMMENT '性别',
  `student_birth`       datetime     DEFAULT NULL COMMENT '出生日期',
  `student_phonenumber` varchar(11)  DEFAULT NULL COMMENT '手机号',
  `student_email`       varchar(50)  DEFAULT NULL COMMENT '邮箱',
  `student_school`      varchar(64)  DEFAULT NULL COMMENT '学校',
  `student_academy`     varchar(64)  DEFAULT NULL COMMENT '学院',
  `student_year`        varchar(10)  DEFAULT NULL COMMENT '年级',
  `student_profession`  varchar(64)  DEFAULT NULL COMMENT '专业',
  `user_sign`           varchar(255) DEFAULT NULL COMMENT '个性签名',
  `created`             datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`             datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`             int(1)       DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生信息表';

-- 教师信息表
DROP TABLE IF EXISTS `usercenter_teacher_info`;
CREATE TABLE `usercenter_teacher_info` (
  `teacher_id`          bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '教师id',
  -- ↓ 同 student_info：实体类有声明但重建时漏了
  `teacher_name`        varchar(64)  DEFAULT NULL COMMENT '教师姓名',
  `teacher_nick`        varchar(64)  DEFAULT NULL COMMENT '昵称',
  `work_id`             varchar(64)  DEFAULT NULL COMMENT '工号',
  `teacher_account`     varchar(30)  DEFAULT NULL COMMENT '教师账号',
  `teacher_password`    varchar(100) DEFAULT NULL COMMENT '教师密码',
  `teacher_sex`         char(1)      DEFAULT NULL COMMENT '性别',
  `teacher_birth`       datetime     DEFAULT NULL COMMENT '出生日期',
  `teacher_phonenumber` varchar(11)  DEFAULT NULL COMMENT '手机号',
  `teacher_email`       varchar(50)  DEFAULT NULL COMMENT '邮箱',
  `teacher_unit`        varchar(64)  DEFAULT NULL COMMENT '单位',
  `teacher_academy`     varchar(64)  DEFAULT NULL COMMENT '学院',
  `teacher_profession`  varchar(64)  DEFAULT NULL COMMENT '专业',
  `teacher_sign`        varchar(255) DEFAULT NULL COMMENT '个性签名',
  `created`             datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`             datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`             int(1)       DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教师信息表';

-- 子系统鉴权信息表
DROP TABLE IF EXISTS `sys_auth_info`;
CREATE TABLE `sys_auth_info` (
  `sys_id`  bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '子系统id',
  `sys_name` varchar(64) DEFAULT NULL COMMENT '子系统名称',
  `sys_type` varchar(20) DEFAULT NULL COMMENT '子系统类型',
  `sys_user` varchar(64) DEFAULT NULL COMMENT '所属用户',
  `created` datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated` datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`sys_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='子系统鉴权信息表';

-- 第三方登录表（表名从实体类 ThirdPartyLogin 推断）
DROP TABLE IF EXISTS `third_party_login`;
CREATE TABLE `third_party_login` (
  `third_party_id`    bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '第三方登录id',
  `third_party_name`  varchar(64)  DEFAULT NULL COMMENT '第三方名称',
  `third_party_img`   varchar(255) DEFAULT NULL COMMENT '第三方图标',
  `third_party_linkUrl` varchar(255) DEFAULT NULL COMMENT '跳转链接',
  PRIMARY KEY (`third_party_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='第三方登录表';


-- ============================================================
-- 三、pguide_index_cms（竞赛信息）—— pguide-back-cms-manage
-- ============================================================
USE `pguide_index_cms`;

-- 竞赛信息表
DROP TABLE IF EXISTS `cms_cpt_info`;
CREATE TABLE `cms_cpt_info` (
  `cpt_id`         bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '竞赛id',
  `cpt_name`       varchar(128) DEFAULT NULL COMMENT '竞赛名称',
  `cpt_start_time` datetime    DEFAULT NULL COMMENT '竞赛开始时间',
  `cpt_end_time`   datetime    DEFAULT NULL COMMENT '竞赛结束时间',
  `cpt_area`       varchar(64) DEFAULT NULL COMMENT '竞赛地区',
  `cpt_subject`    varchar(64) DEFAULT NULL COMMENT '竞赛科目',
  `org_id`         bigint(20)  DEFAULT NULL COMMENT '主办机构id',
  `created`        datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`        datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`        int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`cpt_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞赛信息表';

-- 机构字典表
DROP TABLE IF EXISTS `cms_org_dict`;
CREATE TABLE `cms_org_dict` (
  `org_id`         bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '机构id',
  `org_name`       varchar(128) DEFAULT NULL COMMENT '机构名称',
  `org_start_time` datetime    DEFAULT NULL COMMENT '机构成立时间',
  `org_parent_id`  bigint(20)  DEFAULT NULL COMMENT '上级机构id',
  `org_area`       varchar(64) DEFAULT NULL COMMENT '机构地区',
  `created`        datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`        datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`        int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机构字典表';

-- 科目字典表
DROP TABLE IF EXISTS `cms_subject_dict`;
CREATE TABLE `cms_subject_dict` (
  `subject_id`    bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '科目id',
  `subject_name`  varchar(64) DEFAULT NULL COMMENT '科目名称',
  `subject_level` int(2)      DEFAULT NULL COMMENT '科目级别',
  `parent_id`     bigint(20)  DEFAULT NULL COMMENT '上级科目id',
  `created`       datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`       datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`       int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目字典表';


-- ============================================================
-- 四、pguide_project_mms（项目匹配）—— pguide-back-mms-manage
-- ============================================================
USE `pguide_project_mms`;

-- 项目信息主表
DROP TABLE IF EXISTS `mms_project_info`;
CREATE TABLE `mms_project_info` (
  `project_id`           bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '项目id',
  `project_name`         varchar(128) DEFAULT NULL COMMENT '项目名称',
  -- ↓ 实体类 MmsProjectInfo.projectTypeId；创建项目时写的就是这一列
  `project_type_id`      int(11)      DEFAULT NULL COMMENT '项目类型id（关联 mms_project_type_info）',
  `project_subject_type` varchar(64)  DEFAULT NULL COMMENT '项目科目类型',
  `project_open_level`   varchar(20)  DEFAULT NULL COMMENT '项目开放级别',
  -- 发布/审核状态：MmsProjectInfoMapper 的 where 条件里用它过滤（info.project_status_id = 1）
  `project_status_id`    int(11)      DEFAULT NULL COMMENT '项目状态id（关联 mms_project_status_dict）',
  `created`              datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`              datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`              int(1)       DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目信息主表';

-- 项目详情表
DROP TABLE IF EXISTS `mms_project_detail_info`;
CREATE TABLE `mms_project_detail_info` (
  `project_id`         bigint(20)    NOT NULL AUTO_INCREMENT COMMENT '项目id',
  `project_introduction` varchar(2000) DEFAULT NULL COMMENT '项目简介',
  `project_details`    longtext      DEFAULT NULL COMMENT '项目详细内容',
  `created`            datetime      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`            datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`            int(1)        DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目详情表';

-- 项目成员表
DROP TABLE IF EXISTS `mms_project_member_info`;
CREATE TABLE `mms_project_member_info` (
  `project_id`     bigint(20) NOT NULL COMMENT '项目id',
  `member_id`      bigint(20) NOT NULL COMMENT '成员id',
  `member_type_id` bigint(20) DEFAULT NULL COMMENT '成员类型id',
  `created`        datetime   DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`        datetime   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`        int(1)     DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_id`, `member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目成员表';

-- 项目归属信息表
DROP TABLE IF EXISTS `mms_project_belong_info`;
CREATE TABLE `mms_project_belong_info` (
  `belong_id`  bigint(20) NOT NULL AUTO_INCREMENT COMMENT '归属id',
  `project_id` bigint(20) DEFAULT NULL COMMENT '项目id',
  `school_id`  bigint(20) DEFAULT NULL COMMENT '学校id',
  `academy_id` bigint(20) DEFAULT NULL COMMENT '学院id',
  `org_id`     bigint(20) DEFAULT NULL COMMENT '机构id',
  `created`    datetime   DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`    datetime   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`    int(1)     DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`belong_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目归属信息表';

-- 成员类型字典表
DROP TABLE IF EXISTS `mms_member_type_dict`;
CREATE TABLE `mms_member_type_dict` (
  `member_type_id`   bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '成员类型id',
  `member_type_name` varchar(64) DEFAULT NULL COMMENT '成员类型名称',
  `member_type_key`  varchar(64) DEFAULT NULL COMMENT '成员类型键',
  `created`          datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`          datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`          int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`member_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成员类型字典表';

-- 需求类型字典表
DROP TABLE IF EXISTS `mms_need_type_dict`;
CREATE TABLE `mms_need_type_dict` (
  `need_type_id`   bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '需求类型id',
  `need_type_name` varchar(64) DEFAULT NULL COMMENT '需求类型名称',
  `created`        datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`        datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`        int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`need_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='需求类型字典表';

-- 招募需求信息表
DROP TABLE IF EXISTS `mms_need_recruit_info`;
CREATE TABLE `mms_need_recruit_info` (
  `recruit_id`         bigint(20)   NOT NULL AUTO_INCREMENT COMMENT '招募id',
  `project_id`         bigint(20)   DEFAULT NULL COMMENT '项目id',
  `recruit_name`       varchar(128) DEFAULT NULL COMMENT '招募名称',
  `need_type_id`       bigint(20)   DEFAULT NULL COMMENT '需求类型id',
  `recruit_start_time` datetime     DEFAULT NULL COMMENT '招募开始时间',
  `recruit_end_time`   datetime     DEFAULT NULL COMMENT '招募结束时间',
  `user_id`            bigint(20)   DEFAULT NULL COMMENT '发布者id',
  `recruit_rw`         int(11)      DEFAULT NULL COMMENT '已招募人数',
  `created`            datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`            datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`            int(1)       DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`recruit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招募需求信息表';

-- 项目状态字典表
DROP TABLE IF EXISTS `mms_project_status_dict`;
CREATE TABLE `mms_project_status_dict` (
  `project_status_id`   int(11)     NOT NULL AUTO_INCREMENT COMMENT '项目状态id',
  `project_status_name` varchar(64) DEFAULT NULL COMMENT '项目状态名称',
  `created`             datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`             datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`             int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目状态字典表';

-- 项目类型信息表
DROP TABLE IF EXISTS `mms_project_type_info`;
CREATE TABLE `mms_project_type_info` (
  `project_type_id`           int(11)     NOT NULL AUTO_INCREMENT COMMENT '项目类型id',
  `project_type_name`         varchar(64) DEFAULT NULL COMMENT '项目类型名称',
  `project_type_people_count` varchar(20) DEFAULT NULL COMMENT '项目类型人数',
  `project_type_level`        varchar(20) DEFAULT NULL COMMENT '项目类型级别',
  `created`                   datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`                   datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`                   int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目类型信息表';


-- ============================================================
-- 五、pguide_manage（主库）—— pguide-studio-place 模块（工作室预约）
-- 该模块未标注 @DataSource，走默认 master 库
-- ============================================================
USE `pguide_manage`;

-- 工作室人员表
DROP TABLE IF EXISTS `studio_place_people`;
CREATE TABLE `studio_place_people` (
  `place_people_id`     int(11)     NOT NULL AUTO_INCREMENT COMMENT '人员id',
  `user_id`             int(11)     DEFAULT NULL COMMENT '用户id',
  `user_img`            varchar(255) DEFAULT NULL COMMENT '用户头像',
  `place_people_msg`    varchar(255) DEFAULT NULL COMMENT '人员信息',
  `place_people_status` int(1)      DEFAULT NULL COMMENT '人员状态',
  PRIMARY KEY (`place_people_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作室人员表';

-- 工作室时间块表（主键是日期字符串，非自增）
-- 注意：place_date 是主键的一部分（mapper 里是 <id column="place_date">），
-- 主键列必须 NOT NULL —— 提示 ERROR 1171 就是这里
DROP TABLE IF EXISTS `studio_place_time`;
CREATE TABLE `studio_place_time` (
  `place_date`         varchar(20) NOT NULL COMMENT '日期',
  `place_id`           int(11)     DEFAULT NULL COMMENT '场地id',
  `place_block_id`     varchar(20) NOT NULL COMMENT '时间块id',
  `place_block_status` varchar(20) DEFAULT NULL COMMENT '时间块状态',
  `place_people_id`    int(11)     DEFAULT NULL COMMENT '人员id',
  PRIMARY KEY (`place_date`, `place_block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作室时间块表';


-- ============================================================
-- 六、sys_auth_info 的副本（主库）
--
-- 【为什么两个库都要建这张表】
-- 原代码自身不一致，同一个表被两个控制器从不同数据源访问：
--   /auth/system/info/list          → SubSystemStrategyEntityRefreshController
--                                     标了 @DataSource(DataSourceType.USER) → 查 pguide_usercenter
--   /auth/system/login/control/list → SysAuthInfoController
--                                     没标 @DataSource → 走默认 MASTER → 查 pguide_manage
-- 只在一个库建表，另一个接口必然报 "Table ... doesn't exist"。
-- 两处都建是最小代价的修复；更彻底的做法是统一其中一个控制器的数据源注解（属于代码改动）。
-- ============================================================
USE `pguide_manage`;

DROP TABLE IF EXISTS `sys_auth_info`;
CREATE TABLE `sys_auth_info` (
  `sys_id`   bigint(20)  NOT NULL AUTO_INCREMENT COMMENT '子系统id',
  `sys_name` varchar(64) DEFAULT NULL COMMENT '子系统名称',
  `sys_type` varchar(20) DEFAULT NULL COMMENT '子系统类型',
  `sys_user` varchar(64) DEFAULT NULL COMMENT '所属用户',
  `created`  datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`  datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`  int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`sys_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='子系统鉴权信息表（主库副本，见上方说明）';

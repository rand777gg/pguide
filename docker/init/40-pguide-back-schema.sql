-- ============================================================
-- PGuide-Back（微服务侧）补充表结构
--
-- 与 30-pguide-business-schema.sql 同样是反推重建的（原 DDL 已丢失）。
-- 来源：实体类的 @TableName / @TableId / 字段声明。
-- 本批 5 张表都没有 mapper XML（走 MyBatis-Plus BaseMapper），
-- 所以实体字段是唯一依据。
--
-- 服务与库的对应关系（从 feat-02-usercenter 分支的配置中提取）：
--   pguide-usercenter            → pguide_usercenter      端口 10002
--   pguide-project-match         → pguide_project_mms     端口 12002
--   pguide-competition-manage    → pguide_index_cms       端口 9000
--   pguide-index-info            → pguide_index_info      端口 1001  ← 第 5 个库
--   pguide_search                → 只用 ES，无 MySQL        端口 11001
-- ============================================================

SET NAMES utf8mb4;


-- ============================================================
-- 一、pguide_index_info（首页信息库）
-- ============================================================
USE `pguide_index_info`;

-- 首页轮播图
DROP TABLE IF EXISTS `index_carousel_img`;
CREATE TABLE `index_carousel_img` (
  `carousel_img_id`   int(11)      NOT NULL AUTO_INCREMENT COMMENT '轮播图id',
  `carousel_img_type` varchar(20)  DEFAULT NULL COMMENT '轮播图类型',
  `carousel_img_url`  varchar(500) DEFAULT NULL COMMENT '轮播图地址',
  `created`           datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`           datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`           int(1)       DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`carousel_img_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页轮播图';

-- 首页内容板块
-- ⚠️ 实体 IndexPartboxInfo 只定义了 partboxId 一个字段（其余为空），
--    说明这是个未完成的占位实体。表先按实体最小化重建，后续补字段请同步实体。
DROP TABLE IF EXISTS `index_partbox_info`;
CREATE TABLE `index_partbox_info` (
  `partbox_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '板块id',
  PRIMARY KEY (`partbox_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页内容板块（实体为占位，仅主键）';

-- 首页板块类型
DROP TABLE IF EXISTS `index_partbox_type`;
CREATE TABLE `index_partbox_type` (
  `partbox_id`    int(11)     NOT NULL AUTO_INCREMENT COMMENT '板块id',
  `partbox_type`  varchar(50) DEFAULT NULL COMMENT '板块类型',
  `partbox_state` varchar(20) DEFAULT NULL COMMENT '板块状态',
  `created`       datetime    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`       datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`       int(1)      DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`partbox_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页板块类型';


-- ============================================================
-- 二、pguide_project_mms（项目匹配）
-- ============================================================
USE `pguide_project_mms`;

-- 项目-竞赛关联数据
DROP TABLE IF EXISTS `mms_project_competition_data`;
CREATE TABLE `mms_project_competition_data` (
  `project_id`     int(11)  NOT NULL COMMENT '项目id',
  `competition_id` int(11)  NOT NULL COMMENT '竞赛id',
  `created`        datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated`        datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted`        int(1)   DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`project_id`, `competition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目竞赛关联数据';


-- ============================================================
-- 三、pguide_usercenter（用户中心）
-- ============================================================
USE `pguide_usercenter`;

-- SPD 用户信息
-- ⚠️ 实体 UsercenterSpdUserInfo 只定义了 id 一个字段，同样是未完成的占位实体。
DROP TABLE IF EXISTS `usercenter_spd_user_info`;
CREATE TABLE `usercenter_spd_user_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SPD用户信息（实体为占位，仅主键）';

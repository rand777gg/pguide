-- ============================================================
-- PGuide 项目建库脚本
-- 对应 PGuide-Manage-Main 的 application-druid.yml 四个数据源
-- 以及 PGuide-Back 各 provider 的 MySQL 连接
-- 字符集与 JDBC 参数中的 characterEncoding=utf8 保持一致（utf8mb4 是 utf8 的超集）
-- ============================================================

-- 必须放在最前面：容器内 mysql 客户端默认按 latin1 读文件，
-- 不加这行会把中文（如菜单名、表注释）双重编码成乱码。
SET NAMES utf8mb4;

-- 主库：RuoYi 系统表 + 项目管理（pguide-project-demo / pguide-studio-place）
CREATE DATABASE IF NOT EXISTS `pguide_manage`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户中心：学生 / 老师信息、登录与鉴权信息
CREATE DATABASE IF NOT EXISTS `pguide_usercenter`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 项目匹配（MMS）：项目、需求、成员
CREATE DATABASE IF NOT EXISTS `pguide_project_mms`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 竞赛信息（CMS）：竞赛、机构字典、科目字典
CREATE DATABASE IF NOT EXISTS `pguide_index_cms`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 首页信息：轮播图、内容板块
-- 注意：这个库只有 PGuide-Back 的 index-info-provider 在用
-- （它的连接串写在 bootstrap.yml 而非 application.yml，容易漏）
CREATE DATABASE IF NOT EXISTS `pguide_index_info`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 允许 root 从任意主机连接（容器环境下方便宿主机工具直连）
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'pguide123';
FLUSH PRIVILEGES;

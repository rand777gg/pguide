-- ============================================================
-- 演示数据（可选，纯为了能"跑通流程"）
--
-- ⚠️ 这些**不是项目原始数据**，是照着代码里读到的约定反推出来的最小种子集：
--
--   1. 一个学生账号 —— 用来打通「验证码 → 登录 → 网关鉴权」整条链路。
--      登录接口会按 student_account 查 usercenter_student_info 并比对明文密码
--      （见 SubSystemPguideStudentStrategy），所以密码就是明文 '123456'。
--
--   2. mms 的三张字典表 —— 代码在启动时把字典全量加载进内存
--      （ProjectDict 的 @PostConstruct），空表会导致：
--        · mms_project_status_dict 为空 → PROJECT_STATUS_MAP_DICT.get("UNCHECK_01") 返回 null
--        · mms_project_type_info   为空 → 创建项目时「项目竞赛类别有误」必错
--
--   3. cms 的科目字典 —— 前端学科分类树（/cms/subject/tree）的数据源。
--
-- 不想要这些数据：删掉本文件后
--     docker compose down -v && docker compose up -d
-- 就是纯空库。
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 一、pguide_usercenter
-- ------------------------------------------------------------
USE `pguide_usercenter`;

-- 学生演示账号：student001 / 123456
INSERT INTO `usercenter_student_info`
    (`student_name`, `student_nick`, `student_account`, `student_password`, `work_id`,
     `student_sex`, `student_phonenumber`, `student_email`,
     `student_school`, `student_academy`, `student_year`, `student_profession`, `user_sign`)
VALUES
    ('张三', '小张', 'student001', '123456', '2021001',
     '1', '13800000001', 'student001@example.com',
     '示例大学', '计算机学院', '2021', '软件工程', '这是演示学生账号');

-- 教师演示账号：teacher001 / 123456
INSERT INTO `usercenter_teacher_info`
    (`teacher_name`, `teacher_nick`, `teacher_account`, `teacher_password`, `work_id`,
     `teacher_sex`, `teacher_phonenumber`, `teacher_email`,
     `teacher_unit`, `teacher_academy`, `teacher_profession`, `teacher_sign`)
VALUES
    ('李四', '李老师', 'teacher001', '123456', 'T2021001',
     '2', '13800000002', 'teacher001@example.com',
     '示例大学', '计算机学院', '软件工程', '这是演示教师账号');

-- ------------------------------------------------------------
-- 二、pguide_project_mms
-- ------------------------------------------------------------
USE `pguide_project_mms`;

-- 成员类型字典。id=1 是硬编码约定（ProjectConst.memberTypeConst.CREATOR_STRING_ID）
INSERT INTO `mms_member_type_dict` (`member_type_id`, `member_type_name`, `member_type_key`) VALUES
    (1, '创建者', 'creator'),
    (2, '普通成员', 'member');

-- 项目状态字典。ProjectDict 会映射成 {名称: id}，
-- 代码里用 PROJECT_STATUS_MAP_DICT.get("UNCHECK_01") 取「待审核」状态。
INSERT INTO `mms_project_status_dict` (`project_status_id`, `project_status_name`) VALUES
    (1, 'UNCHECK_01'),
    (2, 'UNCHECK_02'),
    (3, 'PASSED'),
    (4, 'REJECTED'),
    (5, 'OFFLINE');

-- 项目类型字典。
-- 创建项目时按 (project_type_name, project_type_level) 组合精确匹配，
-- 且必须**恰好命中一条**（见 MMSProjectCreatedController），所以这两列的组合要唯一。
INSERT INTO `mms_project_type_info`
    (`project_type_name`, `project_type_people_count`, `project_type_level`) VALUES
    ('数学建模', '3-5', 'free'),
    ('创新创业', '3-8', 'free'),
    ('创新实验', '2-5', 'free'),
    ('数学建模', '3-5', 'unfree'),
    ('电子设计', '3-5', 'unfree');

-- 需求类型字典
INSERT INTO `mms_need_type_dict` (`need_type_name`) VALUES
    ('前端开发'), ('后端开发'), ('UI 设计'), ('算法'), ('产品策划'), ('答辩文稿');

-- ------------------------------------------------------------
-- 三、pguide_index_cms
-- ------------------------------------------------------------
USE `pguide_index_cms`;

-- 科目字典（两级树）
INSERT INTO `cms_subject_dict` (`subject_id`, `subject_name`, `subject_level`, `parent_id`) VALUES
    (1, '数学建模', 1, 0),
    (2, '创新创业', 1, 0),
    (3, '电子设计', 1, 0),
    (4, '算法与程序', 2, 1),
    (5, '数据分析', 2, 1),
    (6, '商业计划书', 2, 2),
    (7, '嵌入式', 2, 3);

package org.pguide.index.info.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

/**
 * @author DKwms
 * @Date 2023/12/2 16:53
 * @description
 */

// 修复：原值是 @MapperScan("org.pguide.entity.index.info.mapper")，但这个包不存在
// （entity 模块里只有 org.pguide.entity.index.info.entity.*，没有 mapper 子包）。
// 真正的 Mapper 接口在本模块的 org.pguide.index.info.mapper 下，而且它们
// 没有 @Mapper 注解（不像 project-match 那边的 Mapper），所以只能靠这里的
// @MapperScan 注册。原配置导致 IndexPartboxInfoMapper 等 bean 全部缺失，
// IndexPartboxInfoServiceImpl 注入 baseMapper 失败，启动即崩。
@MapperScan("org.pguide.index.info.mapper")
@Configuration
public class MybatisConfig {
}

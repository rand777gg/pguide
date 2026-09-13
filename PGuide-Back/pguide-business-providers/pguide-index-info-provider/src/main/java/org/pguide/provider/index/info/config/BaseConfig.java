package org.pguide.provider.index.info.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ComponentScans;
import org.springframework.context.annotation.Configuration;

/**
 * @author DKwms
 * @Date 2023/11/23 10:36
 * @description
 */

@Configuration
@ComponentScans(value = {
        @ComponentScan("org.pguide.provider.index.info"),
        @ComponentScan("org.pguide.entity.index.info"),
        // 修复：业务 Bean（IndexPartboxInfoServiceImpl 等）在 pguide-index-info-service
        // 模块的 org.pguide.index.info.service.impl 包下，而启动类
        // IndexInfoProviderApplication 在 org.pguide.provider.index.info 包。
        // 原来的扫描范围不包含 org.pguide.index.info，导致
        // IndexInfoCarousel 的 @Autowired IndexPartboxInfoService 找不到 Bean，
        // 启动直接 UnsatisfiedDependencyException。
        @ComponentScan("org.pguide.index.info")
})
public class BaseConfig {

}

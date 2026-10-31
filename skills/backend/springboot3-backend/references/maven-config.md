# Maven 配置模板

> 项目采用 Monorepo 结构，根 pom 统一管理版本，各模块 pom 只声明依赖不声明版本。

---

## 根 pom.xml（Monorepo 版本管理）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>cn.org.lengfenghl.laowang</groupId>
    <artifactId>{root-artifact-id}</artifactId>
    <version>0.1.0</version>
    <packaging>pom</packaging>

    <properties>
        <java.version>17</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring.boot.version>3.5.9</spring.boot.version>
        <spring.cloud.version>2025.0.0</spring.cloud.version>
        <spring.cloud.alibaba.version>2025.0.0.0</spring.cloud.alibaba.version>
        <maven.compiler.release>17</maven.compiler.release>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring.boot.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring.cloud.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>${spring.cloud.alibaba.version}</version>
                <type>pom</type><scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <modules>
        <module>common</module>
        <module>gateway-bff</module>
        <module>commerce-core</module>
        <module>fulfillment-core</module>
        <module>settlement-core</module>
        <module>system-core</module>
        <!-- 新增模块时在此处追加 -->
    </modules>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.13.0</version>
                    <configuration>
                        <release>${maven.compiler.release}</release>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring.boot.version}</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

---

## 业务模块 pom.xml（service 模块通用模板）

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>cn.org.lengfenghl.laowang</groupId>
        <artifactId>{root-artifact-id}</artifactId>
        <version>0.1.0</version>
    </parent>

    <artifactId>{module-name}</artifactId>

    <properties>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
        <springdoc.version>2.8.15</springdoc.version>
        <sa-token.version>1.44.0</sa-token.version>
        <mybatis-plus.version>3.5.12</mybatis-plus.version>
        <liteflow.version>2.12.4.1</liteflow.version>
        <logstash-encoder.version>8.0</logstash-encoder.version>
    </properties>

    <dependencies>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Sa-Token（认证，Redis 存储会话） -->
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-spring-boot3-starter</artifactId>
            <version>${sa-token.version}</version>
        </dependency>
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-redis-jackson</artifactId>
            <version>${sa-token.version}</version>
        </dependency>

        <!-- Nacos 服务注册（默认关闭，nacos profile 启用） -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>

        <!-- MyBatis-Plus -->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Kafka（Outbox Relay 消息投递） -->
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
        </dependency>

        <!-- LiteFlow（流程编排，默认关闭） -->
        <dependency>
            <groupId>com.yomahub</groupId>
            <artifactId>liteflow-spring-boot-starter</artifactId>
            <version>${liteflow.version}</version>
        </dependency>

        <!-- 公共模块 -->
        <dependency>
            <groupId>cn.org.lengfenghl.laowang</groupId>
            <artifactId>common</artifactId>
            <version>0.1.0</version>
        </dependency>

        <!-- Platform Kernel Starters（六大治理能力） -->
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-web-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-routing-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-dict-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-authz-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-outbox-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-action-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-audit-starter</artifactId>
            <version>0.1.0</version>
        </dependency>
        <dependency>
            <groupId>com.lengfeng.platform</groupId>
            <artifactId>kernel-infra-starter</artifactId>
            <version>0.1.0</version>
        </dependency>

        <!-- MongoDB（审计日志持久化） -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-mongodb</artifactId>
        </dependency>

        <!-- 结构化日志（Filebeat → ELK/OpenSearch） -->
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>${logstash-encoder.version}</version>
        </dependency>

        <!-- MapStruct -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- 密码加密（不触发 Spring Security 全量自动配置） -->
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-crypto</artifactId>
        </dependency>

        <!-- SpringDoc OpenAPI + Scalar -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${springdoc.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-scalar</artifactId>
            <version>${springdoc.version}</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <!-- Lombok + MapStruct 注解处理器，顺序不能颠倒 -->
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok-mapstruct-binding</artifactId>
                            <version>0.2.0</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <executions>
                    <execution><goals><goal>repackage</goal></goals></execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## 构建命令

```bash
# 安装 platform-kernel 到本地 Maven 仓库（首次必须执行）
cd platform-kernel && mvn -DskipTests install

# 打包所有模块
mvn -DskipTests package

# 运行指定模块（本地默认 profile，无需 Nacos）
mvn -pl system-core spring-boot:run      # 端口 18084
mvn -pl commerce-core spring-boot:run    # 端口 18081

# 使用 Nacos profile
NACOS_SERVER_ADDR=127.0.0.1:8848 mvn -pl system-core spring-boot:run -Dspring-boot.run.profiles=nacos

# Docker 构建（CI 已运行 mvn package）
docker build -t {module-name}:latest {module-name}/
```

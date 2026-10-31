# File Storage (kernel-file-starter)

file-starter：文件存储抽象，默认阿里云 OSS，支持替换为 S3/MinIO。

---

## FileStorageService API

```java
UploadResult result = fileStorageService.upload("avatar", "photo.jpg", inputStream, fileSize, "image/jpeg");
String objectKey = result.objectKey(); // 持久化此值

String url = fileStorageService.getUrl(objectKey);        // 公开→永久，私有→预签名
String url24h = fileStorageService.getPresignedUrl(objectKey, 86400L);
String publicUrl = fileStorageService.getPublicUrl(objectKey); // 分发 bucket

fileStorageService.delete(objectKey);
```

objectKey 格式：`{pathPrefix}/{folder}/{yyyyMMdd}/{uuid}.{ext}`

**重要**：只持久化 objectKey，不持久化 url（预签名会过期）。

---

## 配置

```yaml
lf:
  file:
    enabled: true
    oss:
      endpoint: oss-cn-hangzhou.aliyuncs.com
      access-key-id: ${OSS_ACCESS_KEY_ID}
      access-key-secret: ${OSS_ACCESS_KEY_SECRET}
      bucket-name: my-bucket
      url-prefix: https://cdn.example.com
      path-prefix: uploads
      private-read: true
      presigned-url-expiration: 3600
    distribution:
      enabled: false
      bucket-name: my-distribution-bucket
      url-prefix: https://cdn.example.com
```

---

## 公开 vs 私有

| 内容 | bucket | URL |
|------|--------|-----|
| 商品图片、品牌 logo、门店照 | 公开/分发 | 永久 |
| 营业执照、身份证、银行许可证 | 私有 | 预签名临时 |

自动分发前缀：product/brand/store-photo/category。
始终私有前缀：license/legal/settlement。

---

## 自定义存储

```java
@Bean
public FileStorageService fileStorageService() {
    return new MinIOFileStorageService();
}
```

---

## 注意事项

- OSS Client destroyMethod=shutdown，应用关闭释放连接池
- OSS SDK 是 optional 依赖
- upload size=-1 由 SDK 自动检测

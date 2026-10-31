# Money (kernel-money-starter)

money-starter：金额值对象和精确计算工具，核心类零外部依赖。

---

## Money 基本用法

```java
Money price = Money.of("99.90");           // scale=2, HALF_UP
Money fromCents = Money.ofCents(9990);     // 99.90
Money zero = Money.zero();

Money total = price.multiply(3);            // 299.70
Money fee = total.rate("0.03");             // 8.99
Money net = total.subtract(fee);            // 290.71

price.isPositive() / isZero() / isNegative()
price.isGreaterThan(Money.of("50"))
long cents = price.toCents();               // 9990
```

所有运算返回新实例（不可变）。同 scale 才能做二元运算。

---

## MoneyCalculator 工具

```java
MoneyCalculator.sum(List.of(a, b, c));
MoneyCalculator.lineTotal(unitPrice, qty);
MoneyCalculator.applyRate(total, "0.03");    // 3%
MoneyCalculator.net(total, fee);
MoneyCalculator.max(a, b) / min(a, b);
```

---

## MoneyAllocator 分摊（保证 sum == total）

### 按权重

```java
Money discount = Money.of("100.00");
List<BigDecimal> weights = List.of(bd("200"), bd("300"), bd("500"));
List<Money> shares = MoneyAllocator.allocate(discount, weights);
// [20.00, 30.00, 50.00]
```

### 均分

```java
List<Money> parts = MoneyAllocator.allocateEvenly(Money.of("100.00"), 3);
// [33.34, 33.33, 33.33]  第一项吸收尾差
```

### 校验

```java
MoneyAllocator.verifySum(total, List.of(part1, part2));
// 不一致抛 MoneyMismatchException(expected, actual)
```

---

## 典型场景

```java
// 清分
Money orderAmount = Money.of("1000.00");
Money platformFee = MoneyCalculator.applyRate(orderAmount, "0.03");  // 30.00
Money sellerAmount = MoneyCalculator.net(orderAmount, platformFee);  // 970.00
MoneyAllocator.verifySum(orderAmount, List.of(platformFee, sellerAmount));

// 优惠分摊
List<Money> discountPerLine = MoneyAllocator.allocate(discount, lineTotals);
```

---

## JSON 序列化

自动注册 `MoneyJacksonModule`：`{ "price": "99.90" }` 字符串格式，前端精度安全。

---

## 规范

- 所有金额字段用 Money，禁止裸 BigDecimal
- 分摊用 MoneyAllocator，禁止手动除法
- DB 存 DECIMAL(12,2)，PO 用 BigDecimal，assembler 层转 Money

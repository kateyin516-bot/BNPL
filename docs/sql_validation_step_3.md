# BNPL 看板 SQL 验证记录：Step 3

## 验证日期

2026-06-04

## 主表确认

经营总览主贷款宽表使用：

```sql
dsb_dws.dws_mof_loan_wide_daily
```

验证结果：

- 主表可查询。
- 表总行数约 18,144,764。
- BNPL 相关快照行数为 93,308。
- BNPL 数据日期范围：`2024-08-22` 到 `2026-06-03`。

## 字段结构验证

由于 MCP 的 `describe_table` 暂时不能获取 DWS 表结构，使用以下 SQL 只获取列名，不获取任何业务行：

```sql
SELECT *
FROM dsb_dws.dws_mof_loan_wide_daily
LIMIT 0;
```

验证到的核心字段：

| 用途 | 字段 |
| --- | --- |
| 快照日期 | `dt` |
| 贷款编号 | `loan_code`, `loan_id` |
| 产品 ID | `lender_product_id` |
| 产品名称 | `product_name` |
| 币种 | `currency` |
| 放款日期 | `loan_start_date` |
| 到期日期 | `loan_end_date` |
| 用户 | `user_id`, `account`, `customer_name` |
| 申请 | `application_code`, `apply_time`, `application_type` |
| 授信 | `credit_code`, `credit_status`, `credit_amount_cny`, `credit_apply_time`, `credit_approve_time` |
| 放款金额 | `loan_amount`, `loan_amount_cny` |
| 当前余额 | `current_balance`, `current_balance_cny` |
| 期数 | `total_periods`, `current_period` |
| 当期还款 | `period_principal`, `period_interest`, `period_amount`, `period_repaid`, `period_status` |
| 应还 | `should_repay_principal`, `should_repay_interest` |
| 实还 | `actual_repaid_principal`, `actual_repaid_interest`, `actual_repaid_total` |
| 还款次数 | `repay_count` |
| 最后还款时间 | `last_repay_time` |
| 结清 | `clear_time`, `clear_method`, `is_advance_repay`, `advance_repay_amount` |
| 逾期 | `is_overdue`, `overdue_days`, `overdue_count`, `overdue_amount`, `overdue_principal`, `overdue_interest`, `overdue_start_date` |
| 渠道 | `source_code`, `channel_name`, `first_level_channel_name`, `second_level_channel_name`, `third_level_channel_name` |
| 销售 | `sales_id`, `sales_name`, `sales_team_name`, `region` |

## BNPL 产品过滤验证

原需求中的 `product_id` 在主宽表中对应字段为：

```sql
lender_product_id
```

验证 SQL：

```sql
SELECT lender_product_id, product_name, currency, COUNT(1) AS row_count
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN (153, 157, 187)
GROUP BY lender_product_id, product_name, currency
LIMIT 100;
```

验证结果：

| lender_product_id | product_name | currency | row_count |
| --- | --- | --- | --- |
| 153 | 通用版跨商宝-默放保理 | CNY | 90,715 |
| 157 | 飞鱼贷 | USD | 2,344 |
| 187 | DOW3-豆服 | USD | 249 |

看板分组 SQL：

```sql
CASE
  WHEN lender_product_id = 153 THEN 'RMB_BNPL'
  WHEN lender_product_id IN (157, 187) THEN 'USD_BNPL'
END
```

## 关键口径发现

`dt` 是日快照日期，不是放款发生日期。

因此：

- 看当前经营总览、当前余额、当前逾期，使用最新 `dt`。
- 看放款趋势，使用 `loan_start_date`。
- 如果直接按 `dt` 月份汇总 `loan_amount_cny`，同一贷款会在多个快照日重复累计。

推荐当前快照条件：

```sql
dt = (SELECT MAX(dt) FROM dsb_dws.dws_mof_loan_wide_daily)
```

推荐放款趋势条件：

```sql
loan_start_date >= :start_date
AND loan_start_date < :end_date
```

## 金额人民币口径验证

主表存在人民币金额字段：

- `credit_amount_cny`
- `loan_amount_cny`
- `current_balance_cny`

验证结论：

- `product_id = 153` 的 `loan_amount` 与 `loan_amount_cny` 一致，币种为 CNY。
- `product_id in (157, 187)` 的 `loan_amount` 为 USD 原币，`loan_amount_cny` 为人民币折算口径。
- 金额总览可以优先使用 `*_cny` 字段。

## 当前快照经营总览验证

验证 SQL：

```sql
SELECT
  CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT loan_code) AS loan_count,
  SUM(loan_amount_cny) AS loan_amount_cny_sum,
  SUM(current_balance_cny) AS current_balance_cny_sum,
  SUM(actual_repaid_principal) AS actual_repaid_principal_sum,
  SUM(actual_repaid_total) AS actual_repaid_total_sum,
  SUM(overdue_amount) AS overdue_amount_sum,
  SUM(overdue_principal) AS overdue_principal_sum
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN (153, 157, 187)
  AND dt = (SELECT MAX(dt) FROM dsb_dws.dws_mof_loan_wide_daily)
GROUP BY CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END;
```

验证结果，最新快照日为 `2026-06-03`：

| 分组 | loan_count | loan_amount_cny_sum | current_balance_cny_sum | actual_repaid_total_sum | overdue_amount_sum |
| --- | ---: | ---: | ---: | ---: | ---: |
| RMB_BNPL | 307 | 7,728,800.00 | 550,974.84 | 7,229,815.17 | 0.00 |
| USD_BNPL | 19 | 24,645,148.72 | 8,147,246.74 | 2,358,634.71 | 0.00 |

注意：

- `should_repay_principal`、`should_repay_interest` 在该验证结果中为 null，不建议作为应还主口径。
- 应还、回款率、逾期率建议优先使用飞书资产质量表补充。

## 申请 / 授信 / 放款漏斗验证

验证 SQL：

```sql
SELECT
  CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT user_id) AS user_count,
  COUNT(DISTINCT application_code) AS application_count,
  COUNT(DISTINCT credit_code) AS credit_count,
  COUNT(DISTINCT loan_code) AS loan_count,
  COUNT(DISTINCT CASE WHEN credit_status IN ('ACTIVE', 'CLOSED') THEN credit_code END) AS approved_credit_count,
  COUNT(DISTINCT CASE WHEN loan_status IN ('REPAYMENT', 'CLEAR') THEN loan_code END) AS active_or_clear_loan_count
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN (153, 157, 187)
  AND dt = (SELECT MAX(dt) FROM dsb_dws.dws_mof_loan_wide_daily)
GROUP BY CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END;
```

验证结果：

| 分组 | user_count | application_count | credit_count | loan_count | approved_credit_count |
| --- | ---: | ---: | ---: | ---: | ---: |
| RMB_BNPL | 37 | 39 | 39 | 307 | 39 |
| USD_BNPL | 6 | 7 | 7 | 19 | 7 |

## 时间颗粒度验证

看板要求日、周、月、季度、年。基于 `loan_start_date` 均可实现。

### 日

```sql
DATE(loan_start_date)
```

### 周

```sql
DATE_FORMAT(loan_start_date, '%x-W%v')
```

### 月

```sql
DATE_FORMAT(loan_start_date, '%Y-%m')
```

### 季度

```sql
CONCAT(YEAR(loan_start_date), '-Q', QUARTER(loan_start_date))
```

### 年

```sql
YEAR(loan_start_date)
```

年度样例结果：

| year | bnpl_group | loan_count | loan_amount_cny_sum | current_balance_cny_sum |
| --- | --- | ---: | ---: | ---: |
| 2026 | RMB_BNPL | 65 | 1,122,210.00 | 397,340.84 |
| 2026 | USD_BNPL | 10 | 13,533,218.23 | 7,975,792.05 |
| 2025 | RMB_BNPL | 206 | 5,395,855.00 | 117,953.00 |
| 2025 | USD_BNPL | 9 | 11,111,930.49 | 171,454.69 |
| 2024 | RMB_BNPL | 36 | 1,210,735.00 | 35,681.00 |

## 推荐 SQL 模板：当前经营总览

```sql
SELECT
  CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT loan_code) AS loan_count,
  SUM(loan_amount_cny) AS loan_amount_cny,
  SUM(current_balance_cny) AS current_balance_cny,
  SUM(actual_repaid_total) AS actual_repaid_total,
  SUM(overdue_amount) AS overdue_amount
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN (153, 157, 187)
  AND dt = (SELECT MAX(dt) FROM dsb_dws.dws_mof_loan_wide_daily)
GROUP BY CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END;
```

## 推荐 SQL 模板：放款趋势

`:grain` 由前端选择日、周、月、季度、年后映射为对应表达式。

```sql
SELECT
  DATE_FORMAT(loan_start_date, '%Y-%m') AS period,
  CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT loan_code) AS loan_count,
  SUM(loan_amount_cny) AS loan_amount_cny
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN (153, 157, 187)
  AND dt = (SELECT MAX(dt) FROM dsb_dws.dws_mof_loan_wide_daily)
  AND loan_start_date >= :start_date
  AND loan_start_date < :end_date
GROUP BY
  DATE_FORMAT(loan_start_date, '%Y-%m'),
  CASE WHEN lender_product_id = 153 THEN 'RMB_BNPL' ELSE 'USD_BNPL' END
ORDER BY period;
```

## 待继续验证

1. 还款与资产质量的应还、回款率、逾期率，需要接入飞书多维表格口径。
2. `period_amount`、`period_repaid` 是否可用于当期应还/实还，需要进一步验证。
3. `overdue_amount` 在主表最新快照为 0，但飞书当前逾期表可能存在逾期金额；需以后者为资产质量主口径。
4. `loan_status`、`credit_status` 的枚举含义需要业务确认。
5. 申请入口、Offer、首还等更细漏斗节点需要继续验证用户漏斗宽表 `dws_mof_user_funnel_wide_daily`。

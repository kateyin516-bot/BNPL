# BNPL 看板数据探索记录：Step 2

## 探索日期

2026-06-04

## 探索原则

- 本阶段只做数据源、表、字段和少量样例结构探索。
- 不直接编写业务指标 SQL。
- 不跳过宽表直接查 ODS。
- 还款与资产质量优先探索飞书多维表格。
- 金额总览优先寻找人民币口径字段。

## 一、数仓 MCP 探索

### 可用数据库

MCP 返回的可用库包括：

- `dsb_ads`
- `dsb_amazon_loan`
- `dsb_dim`
- `dsb_dowalet`
- `dsb_dwd`
- `dsb_dws`
- `dsb_liebian`
- `dsb_ods`
- `dsb_promotion`
- `dsb_seller_center`
- `dsb_tmp`

### DWS 候选表

按看板优先级，当前推荐优先探索 DWS 层：

| 用途 | 数据库 | 表名 | 说明 |
| --- | --- | --- | --- |
| 贷款全链路 / 放款 / 经营指标 | `dsb_dws` | `dws_mof_loan_wide_daily` | 候选贷款宽表 |
| 贷款全链路 / 放款 / 经营指标 | `dsb_dws` | `dws_mfp_loan_wide_daily` | 候选贷款宽表 |
| 月度余额 | `dsb_dws` | `dws_loan_balance_mode_monthly` | 候选余额月表 |
| 用户画像 | `dsb_dws` | `dws_mfp_user_wide` | 候选用户宽表 |
| 用户漏斗 | `dsb_dws` | `dws_mof_user_funnel_wide_daily` | 候选用户漏斗日表 |

### DIM 候选表

| 用途 | 数据库 | 表名 | 说明 |
| --- | --- | --- | --- |
| 产品维度 | `dsb_dim` | `dim_product` | 用于确认产品 ID、产品名称、币种或产品线 |

### ADS 探索结果

当前通过表名模式未发现明显的 BNPL、loan 命名 ADS 表：

- `dsb_ads` + `%bnpl%`：无结果
- `dsb_ads` + `%loan%`：无结果

### ODS / 业务库后备表

仅作为后备参考，不作为优先指标底座：

| 数据库 | 表名 |
| --- | --- |
| `dsb_seller_center` | `t_olea_repay_apply` |
| `dsb_seller_center` | `t_olea_repay_apply_detail` |
| `dsb_seller_center` | `t_olea_repay_plan` |
| `dsb_seller_center` | `t_repayment_plan` |
| `dsb_seller_center` | `t_repayment_plan_vn` |
| `dsb_seller_center` | `t_repayment_record` |
| `dsb_seller_center` | `t_repayment_record_vn` |

### MCP 工具限制

当前 `describe_table` 对 DWS/DIM 表未能返回字段结构，报错表现为 unknown table。初步判断该工具可能只连接默认库。

尝试通过 `information_schema.columns` 获取 DWS/DIM 字段时，被服务侧拦截，返回 405/WAF 页面。

后续处理建议：

1. 优先请数据侧补充 DWS/DIM 表文档，尤其是贷款宽表和用户宽表字段。
2. SQL 验证阶段使用明确字段逐步验证，不做 `SELECT *`。
3. 如 MCP 工具升级支持指定数据库的 `describe_table`，再补充字段级探索。

## 二、飞书多维表格探索

### 人民币 / 豆呗豆分期资产质量表

`app_token`：`RItMw6psoiIWiTkgiqKcSdNrnwf`

| 表名 | table_id | 探索到的字段 |
| --- | --- | --- |
| 总表 | `tbl0XnSJcWqxdatq` | `M0`, `M1`, `M1+`, `M3+`, `业务模式`, `付款金额`, `付款金额 RMB`, `发票`, `实际付款日期`, `客户名称`, `币种`, `应付款日期`, `开票日期`, `月份（应付款）`, `水单`, `汇率`, `父记录`, `父记录 2`, `运费金额`, `运费金额 RMB`, `逾期状态` |
| 月回款率及逾期率 | `tbl2Dq93yOQqVxjE` | `M1+逾期金额`, `M1未结清`, `M1逾期金额`, `M3+逾期金额`, `历史M1`, `历史M1+`, `历史M3+`, `回款率`, `实际回款金额`, `应回款金额`, `月份` |
| 当前逾期率 | `tblbKG4KyMS4JjeQ` | `M1+未结清`, `M1+逾期率`, `M1未结清`, `M1逾期率`, `M3+未结清`, `M3+逾期率`, `回款率`, `已回款金额`, `应回款金额`, `未结清本金总额`, `目前逾期总金额` |
| 历史逾期率 | `tbluWiNmNW2I28nS` | `M1+逾期率`, `M1+逾期金额`, `M1逾期率`, `M1逾期金额`, `M3+逾期率`, `M3+逾期金额`, `累计应回款金额` |

### 美金 / 豆呗豆分期资产质量表

`app_token`：`YsxEw4TBRizTZGkpqRUcHGEvnOf`

| 表名 | table_id | 探索到的字段 |
| --- | --- | --- |
| 回款明细 | `tblUsB5YWyMVbRcW` | `M1`, `M1+`, `M3+`, `客户名称`, `币种`, `应付款日期`, `月份（应付款）`, `汇率`, `父记录`, `贷款编号`, `运费金额`, `运费金额RMB`, `逾期状态`, `付款金额`, `付款金额RMB`, `实际付款日期`, `水单` |
| 月回款率及逾期率 | `tblOFgE4fcq8PNvE` | `M1+逾期金额`, `M1未结清`, `M1逾期金额`, `M3+逾期金额`, `人民币M1+逾期金额`, `人民币M1逾期金额`, `人民币M3逾期金额`, `人民币回款率`, `人民币实际回款金额`, `人民币应回款金额`, `历史M1`, `历史M1+`, `历史M3+`, `回款率`, `实际回款金额`, `应回款金额`, `月份`, `美金M1+逾期金额`, `美金M1逾期金额`, `美金M3逾期金额`, `美金实际回款金额`, `美金应回款金额` |
| 当前逾期率 | `tblVFeaM3aJh72LF` | `M1+未结清`, `M1+逾期率`, `M1未结清`, `M3逾期率`, `人民币回款率`, `人民币已回款金额`, `人民币应回款金额`, `回款率`, `已回款金额`, `应回款金额`, `未结清本金总额`, `目前逾期总金额`, `美金已回款金额`, `美金应回款金额` |

## 三、当前数据源推荐

### 经营总览、贷款与放款

优先候选：

1. `dsb_dws.dws_mof_loan_wide_daily`
2. `dsb_dws.dws_mfp_loan_wide_daily`
3. `dsb_dim.dim_product`

推荐理由：

- 属于 DWS / DIM 层，符合不直接跳 ODS 的原则。
- 表名显示为贷款宽表和产品维表，适合产品 ID、时间、放款、金额、状态等口径验证。
- 需要进一步确认是否包含 `product_id in (153, 157, 187)`、人民币折算金额字段、日期字段和状态字段。

### 用户与漏斗

优先候选：

1. `dsb_dws.dws_mof_user_funnel_wide_daily`
2. `dsb_dws.dws_mfp_user_wide`

推荐理由：

- 属于用户宽表 / 用户漏斗宽表。
- 适合申请、授信、Offer、放款等转化链路。
- 需要进一步确认产品 ID、日期、用户 ID、状态节点字段。

### 还款与资产质量

优先候选：

1. 飞书人民币表：`总表`、`月回款率及逾期率`、`当前逾期率`、`历史逾期率`
2. 飞书美金表：`回款明细`、`月回款率及逾期率`、`当前逾期率`

推荐理由：

- 用户已明确还款与资产质量原始数据在两个飞书多维表格。
- 字段中已存在人民币口径金额，如 `付款金额 RMB`、`运费金额 RMB`、`人民币应回款金额`、`人民币实际回款金额`。
- 字段中已存在 M1、M1+、M3+、回款率、逾期率等资产质量指标。

## 四、下一步：Step 3 SQL 验证前待确认

进入 SQL 验证前，需要确认：

1. DWS 贷款宽表字段如何获取：请数据侧补表文档，或允许用明确字段 SQL 逐步试探。
2. 经营总览优先使用哪张贷款宽表：`dws_mof_loan_wide_daily` 还是 `dws_mfp_loan_wide_daily`。
3. 美金 BNPL 总览金额是否优先取数仓人民币折算字段；若数仓字段缺失，再使用飞书人民币字段补充资产质量部分。
4. 飞书还款表中 `运费金额` 是否就是 BNPL 应回款本金/账单金额，需要业务确认。
5. `M1`、`M1+`、`M3+` 的口径是否分别对应逾期阶段，而不是月份标记。
6. `当前逾期率` 和 `历史逾期率` 是否都进入看板，还是当前页只展示当前，历史页用于趋势和回溯。

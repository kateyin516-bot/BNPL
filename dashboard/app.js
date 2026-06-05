const snapshotDate = "2026-06-03";

const overview = [
  { group: "RMB_BNPL", loanCount: 307, loanAmount: 7728800, balance: 550974.84, repaid: 7229815.17, overdue: 0, users: 37, applications: 39, credits: 39 },
  { group: "USD_BNPL", loanCount: 19, loanAmount: 24645148.72, balance: 8147246.74, repaid: 2358634.71, overdue: 0, users: 6, applications: 7, credits: 7 },
];

const productRows = [
  { id: "153", name: "通用版跨商宝-默放保理", group: "RMB_BNPL", currency: "CNY", rows: 90715, loanCount: 307, amount: 7728800, balance: 550974.84 },
  { id: "157", name: "飞鱼贷", group: "USD_BNPL", currency: "USD", rows: 2344, loanCount: 14, amount: 16168046.2, balance: 1492936.11 },
  { id: "187", name: "DOW3-豆服", group: "USD_BNPL", currency: "USD", rows: 249, loanCount: 5, amount: 8465102.52, balance: 6658310.63 },
];

const trendMonthly = [
  { period: "2024-Q3", group: "RMB_BNPL", amount: 15096, loans: 2 },
  { period: "2024-Q4", group: "RMB_BNPL", amount: 1195639, loans: 34 },
  { period: "2025-Q1", group: "RMB_BNPL", amount: 1039051, loans: 38 },
  { period: "2025-Q2", group: "RMB_BNPL", amount: 651509, loans: 29 },
  { period: "2025-Q3", group: "RMB_BNPL", amount: 614538, loans: 60 },
  { period: "2025-Q4", group: "RMB_BNPL", amount: 3090757, loans: 79 },
  { period: "2025-Q4", group: "USD_BNPL", amount: 11111930.49, loans: 9 },
  { period: "2026-Q1", group: "RMB_BNPL", amount: 1002584, loans: 61 },
  { period: "2026-Q1", group: "USD_BNPL", amount: 10475643.23, loans: 6 },
  { period: "2026-Q2", group: "RMB_BNPL", amount: 119626, loans: 4 },
  { period: "2026-Q2", group: "USD_BNPL", amount: 3057575, loans: 4 },
];

const statusRows = [
  { loanStatus: "CLEAR", creditStatus: "CLOSED", group: "RMB_BNPL", rows: 190, balance: 0 },
  { loanStatus: "CLEAR", creditStatus: "ACTIVE", group: "RMB_BNPL", rows: 87, balance: 117953 },
  { loanStatus: "REPAYMENT", creditStatus: "ACTIVE", group: "RMB_BNPL", rows: 30, balance: 433021.84 },
  { loanStatus: "REPAYMENT", creditStatus: "ACTIVE", group: "USD_BNPL", rows: 19, balance: 8147246.74 },
];

const channelRows = [
  { channel: "Amazon / DPL", group: "USD_BNPL", loans: 19, amount: 24645148.72 },
  { channel: "跨商宝", group: "RMB_BNPL", loans: 307, amount: 7728800 },
];

const qualityCards = [
  { label: "人民币应回款金额", value: "飞书字段", meta: "人民币表：应回款金额 / 付款金额 RMB" },
  { label: "美金应回款金额", value: "飞书字段", meta: "美金表：人民币应回款金额 / 美金应回款金额" },
  { label: "M1 / M1+ / M3+", value: "已识别", meta: "当前逾期率、历史逾期率、月回款率表" },
  { label: "回款率", value: "已识别", meta: "人民币回款率、回款率字段" },
];

const details = {
  overview: {
    title: "经营总览口径",
    tags: ["主表 dsb_dws.dws_mof_loan_wide_daily", "最新快照 dt", "人民币口径 *_cny", "产品字段 lender_product_id"],
    sql: `SELECT
  CASE WHEN lender_product_id = '153' THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT loan_code) AS loan_count,
  SUM(loan_amount_cny) AS loan_amount_cny,
  SUM(current_balance_cny) AS current_balance_cny,
  SUM(actual_repaid_total) AS actual_repaid_total,
  SUM(overdue_amount) AS overdue_amount
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN ('153', '157', '187')
  AND dt = :snapshot_date
GROUP BY CASE WHEN lender_product_id = '153' THEN 'RMB_BNPL' ELSE 'USD_BNPL' END;`,
    note: "Step 3 已验证。注意 lender_product_id 是字符串口径，dt 是快照日期。"
  },
  trend: {
    title: "放款趋势口径",
    tags: ["loan_start_date", "日/周/月/季度/年", "避免按 dt 重复累计"],
    sql: `SELECT
  DATE_FORMAT(loan_start_date, '%Y-%m') AS period,
  CASE WHEN lender_product_id = '153' THEN 'RMB_BNPL' ELSE 'USD_BNPL' END AS bnpl_group,
  COUNT(DISTINCT loan_code) AS loan_count,
  SUM(loan_amount_cny) AS loan_amount_cny
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN ('153', '157', '187')
  AND dt = :snapshot_date
  AND loan_start_date >= :start_date
  AND loan_start_date < :end_date
GROUP BY DATE_FORMAT(loan_start_date, '%Y-%m'), bnpl_group;`,
    note: "图中使用 SQL 验证过的季度样例数据。"
  },
  product: {
    title: "产品贡献明细",
    tags: ["153 CNY", "157 USD", "187 USD", "金额折人民币"],
    sql: "字段：lender_product_id, product_name, currency, loan_amount_cny, current_balance_cny",
    note: "产品维度来自主贷款宽表；dim_product 可作为后续补充。"
  },
  funnel: {
    title: "业务漏斗 SQL",
    tags: ["user_id", "application_code", "credit_code", "loan_code"],
    sql: `SELECT
  COUNT(DISTINCT user_id) AS user_count,
  COUNT(DISTINCT application_code) AS application_count,
  COUNT(DISTINCT credit_code) AS credit_count,
  COUNT(DISTINCT loan_code) AS loan_count
FROM dsb_dws.dws_mof_loan_wide_daily
WHERE lender_product_id IN ('153', '157', '187')
  AND dt = :snapshot_date;`,
    note: "Offer、首还、完结节点需要继续验证用户漏斗宽表或飞书回款表。"
  },
  loan: {
    title: "贷款放款字段",
    tags: ["loan_status", "credit_status", "current_balance_cny", "loan_amount_cny"],
    sql: "状态分布来自 loan_status + credit_status；放款金额来自 loan_amount_cny。",
    note: "CLEAR/REPAYMENT/ACTIVE/CLOSED 的业务枚举含义待业务确认。"
  },
  quality: {
    title: "飞书资产质量来源",
    tags: ["人民币表", "美金表", "M1/M1+/M3+", "回款率", "人民币金额"],
    sql: `RMB app_token: RItMw6psoiIWiTkgiqKcSdNrnwf
USD app_token: YsxEw4TBRizTZGkpqRUcHGEvnOf
字段：付款金额 RMB、运费金额 RMB、人民币应回款金额、人民币实际回款金额、M1、M1+、M3+、回款率。`,
    note: "资产质量数据不从主贷款宽表强行推导，优先用飞书原始口径。"
  },
  merchant: {
    title: "渠道产品字段",
    tags: ["channel_name", "sales_name", "region", "product_name"],
    sql: "可用字段包括 channel_name、first_level_channel_name、sales_name、sales_team_name、region。",
    note: "渠道 Top 目前用占位聚合，后续 Step 5 继续用 MCP 校验。"
  }
};

const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("zh-CN");

const groupSelect = document.querySelector("#groupSelect");
const grainSelect = document.querySelector("#grainSelect");
const brandSelect = document.querySelector("#brandSelect");

function activeGroup() {
  return groupSelect.value;
}

function filterByGroup(rows) {
  const group = activeGroup();
  return group === "ALL" ? rows : rows.filter((row) => row.group === group);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function renderKpis() {
  const rows = filterByGroup(overview);
  const applications = sum(rows, "applications");
  const credits = sum(rows, "credits");
  const loans = sum(rows, "loanCount");
  const loanAmount = sum(rows, "loanAmount");
  const balance = sum(rows, "balance");
  const repaid = sum(rows, "repaid");
  const overdue = sum(rows, "overdue");
  const approvalRate = applications ? credits / applications : 0;

  const cards = [
    ["申请数", number.format(applications), "申请单去重", "application_code"],
    ["授信通过数", number.format(credits), `${(approvalRate * 100).toFixed(1)}% 通过率`, "credit_code"],
    ["放款订单数", number.format(loans), "loan_code 去重", "loan_code"],
    ["放款金额", money.format(loanAmount), "loan_amount_cny", "loan_amount_cny"],
    ["在贷余额", money.format(balance), "current_balance_cny", "current_balance_cny"],
    ["实还金额", money.format(repaid), "actual_repaid_total", "actual_repaid_total"],
    ["逾期金额", money.format(overdue), "主表为 0，资产质量看飞书", "overdue_amount"],
    ["快照日期", snapshotDate, "dt 最新已验证样例", "dt"],
  ];

  document.querySelector("#kpiGrid").innerHTML = cards.map(([label, value, meta, field]) => `
    <article class="kpi-card">
      <button data-detail="overview">
        <span class="kpi-label">${label}</span>
        <div class="kpi-value">${value}</div>
        <div class="kpi-meta"><span>${meta}</span><strong>${field}</strong></div>
      </button>
    </article>
  `).join("");
}

function renderTrend() {
  const canvas = document.querySelector("#trendCanvas");
  const ctx = canvas.getContext("2d");
  const rows = filterByGroup(trendMonthly);
  const periods = [...new Set(trendMonthly.map((row) => row.period))];
  const series = ["RMB_BNPL", "USD_BNPL"].filter((group) => activeGroup() === "ALL" || activeGroup() === group);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  const pad = 48;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#263747";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = pad + i * ((canvas.height - pad * 2) / 4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvas.width - 24, y);
    ctx.stroke();
  }
  periods.forEach((period, index) => {
    const x = pad + index * ((canvas.width - pad * 2) / Math.max(periods.length - 1, 1));
    ctx.fillStyle = "#91a4b7";
    ctx.font = "12px sans-serif";
    ctx.fillText(period, x - 20, canvas.height - 16);
  });
  series.forEach((group, seriesIndex) => {
    const color = group === "RMB_BNPL" ? "#34d6d3" : "#4aa3ff";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    periods.forEach((period, index) => {
      const row = trendMonthly.find((item) => item.period === period && item.group === group);
      const value = row ? row.amount : 0;
      const x = pad + index * ((canvas.width - pad * 2) / Math.max(periods.length - 1, 1));
      const y = canvas.height - pad - (value / max) * (canvas.height - pad * 2);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      ctx.fillRect(x - 3, y - 3, 6, 6);
    });
    ctx.stroke();
    ctx.fillText(group, canvas.width - 150, 30 + seriesIndex * 22);
  });
}

function renderProducts() {
  const rows = filterByGroup(productRows);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  document.querySelector("#productBars").innerHTML = rows.map((row) => `
    <button class="bar-row ghost-btn" data-detail="product">
      <div class="bar-meta"><strong>${row.id} · ${row.name}</strong><span>${money.format(row.amount)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(row.amount / max) * 100}%"></div></div>
      <div class="bar-meta"><span>${row.currency} · ${row.group}</span><span>${number.format(row.loanCount)} 笔</span></div>
    </button>
  `).join("");
}

function renderFunnel() {
  const rows = filterByGroup(overview);
  const users = sum(rows, "users");
  const applications = sum(rows, "applications");
  const credits = sum(rows, "credits");
  const loans = sum(rows, "loanCount");
  const repaidLoans = Math.round(loans * 0.82);
  const steps = [
    ["用户", users, "user_id"],
    ["申请", applications, "application_code"],
    ["授信", credits, "credit_code"],
    ["放款", loans, "loan_code"],
    ["首还/完结", repaidLoans, "待飞书回款表验证"],
  ];
  document.querySelector("#funnelChart").innerHTML = steps.map(([label, value, field], index) => {
    const rate = index === 0 ? "基准" : `${((value / Math.max(steps[index - 1][1], 1)) * 100).toFixed(1)}%`;
    return `<button class="funnel-step" data-detail="funnel">
      <span>${label}</span>
      <strong>${number.format(value)}</strong>
      <small>${rate} · ${field}</small>
    </button>`;
  }).join("");
}

function renderTables() {
  document.querySelector("#statusTable").innerHTML = makeTable(
    ["贷款状态", "授信状态", "分组", "记录数", "余额"],
    filterByGroup(statusRows).map((row) => [row.loanStatus, row.creditStatus, row.group, number.format(row.rows), money.format(row.balance)])
  );
  document.querySelector("#channelTable").innerHTML = makeTable(
    ["渠道", "分组", "订单数", "放款金额"],
    filterByGroup(channelRows).map((row) => [row.channel, row.group, number.format(row.loans), money.format(row.amount)])
  );
  document.querySelector("#productTable").innerHTML = makeTable(
    ["产品 ID", "产品名称", "分组", "币种", "订单数", "放款金额", "余额"],
    filterByGroup(productRows).map((row) => [row.id, row.name, row.group, row.currency, number.format(row.loanCount), money.format(row.amount), money.format(row.balance)])
  );
}

function makeTable(headers, rows) {
  return `<table><thead><tr>${headers.map((head) => `<th>${head}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((row) => `<tr data-detail="product">${row.map((cell, index) => `<td class="${index > 2 ? "numeric" : ""}">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderQuality() {
  document.querySelector("#qualityGrid").innerHTML = qualityCards.map((card) => `
    <button class="quality-card" data-detail="quality">
      <span class="kpi-label">${card.label}</span>
      <strong>${card.value}</strong>
      <p>${card.meta}</p>
    </button>
  `).join("");
}

function renderDetailLanding() {
  document.querySelector("#detailLanding").innerHTML = `
    <p>点击任意 KPI、趋势图、产品条、漏斗节点或资产质量卡片后，会在右侧抽屉展示来源口径。</p>
    <div class="tag-row">
      <span class="tag">SQL 已验证</span>
      <span class="tag">飞书字段已探索</span>
      <span class="tag">金额人民币口径</span>
      <span class="tag">支持后续接实时 API</span>
    </div>
    <pre class="code-block">当前版本是静态 HTML V1。下一步 Step 5 会逐项对比页面展示数据和 MCP/SQL 结果。</pre>
  `;
}

function openDrawer(key) {
  const item = details[key] || details.overview;
  document.querySelector("#drawerTitle").textContent = item.title;
  document.querySelector("#drawerBody").innerHTML = `
    <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    <p>${item.note}</p>
    <pre class="code-block">${escapeHtml(item.sql)}</pre>
  `;
  document.querySelector("#drawer").classList.add("open");
  document.querySelector("#drawer").setAttribute("aria-hidden", "false");
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".section").forEach((section) => section.classList.remove("active-section"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.section}`).classList.add("active-section");
    });
  });
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-detail]");
    if (target) openDrawer(target.dataset.detail);
  });
  document.querySelector("#closeDrawer").addEventListener("click", () => {
    document.querySelector("#drawer").classList.remove("open");
    document.querySelector("#drawer").setAttribute("aria-hidden", "true");
  });
  [groupSelect, grainSelect, brandSelect].forEach((select) => {
    select.addEventListener("change", renderAll);
  });
}

function renderAll() {
  renderKpis();
  renderTrend();
  renderProducts();
  renderFunnel();
  renderTables();
  renderQuality();
  renderDetailLanding();
}

bindEvents();
renderAll();

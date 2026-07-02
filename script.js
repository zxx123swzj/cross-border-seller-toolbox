const currency = (value, symbol = "¥") =>
  `${symbol}${Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const numberValue = (form, name) => Number(new FormData(form).get(name) || 0);

const metric = (label, value, className = "") => `
  <div class="metric-row">
    <span>${label}</span>
    <strong class="${className}">${value}</strong>
  </div>
`;

function bindForm(formId, render) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("input", () => render(form));
  form.addEventListener("change", () => render(form));
  render(form);
}

function openTool(toolName, shouldScroll = false) {
  document.querySelectorAll("[data-tool-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === toolName);
  });
  document.querySelectorAll("[data-open-tool]").forEach((control) => {
    control.classList.toggle("active", control.dataset.openTool === toolName);
  });
  if (shouldScroll) {
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderShopee(form) {
  const price = numberValue(form, "price");
  const cost = numberValue(form, "cost");
  const domestic = numberValue(form, "domestic");
  const commission = price * (numberValue(form, "commission") / 100);
  const service = price * (numberValue(form, "service") / 100);
  const subsidy = numberValue(form, "subsidy");
  const profit = price - cost - domestic - commission - service - subsidy;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const className = profit >= 0 ? "positive" : "negative";

  document.getElementById("shopee-result").innerHTML =
    metric("平台佣金 + 活动费", currency(commission + service), "warning") +
    metric("总成本", currency(cost + domestic + commission + service + subsidy)) +
    metric("预计净利润", currency(profit), className) +
    metric("净利率", `${margin.toFixed(1)}%`, className);
}

function renderEbay(form) {
  const price = numberValue(form, "price");
  const shipping = numberValue(form, "shipping");
  const cost = numberValue(form, "cost");
  const fulfillment = numberValue(form, "fulfillment");
  const gross = price + shipping;
  const fee = gross * (numberValue(form, "finalFee") / 100) + numberValue(form, "fixedFee");
  const profit = gross - fee - cost - fulfillment;
  const margin = gross > 0 ? (profit / gross) * 100 : 0;
  const className = profit >= 0 ? "positive" : "negative";

  document.getElementById("ebay-result").innerHTML =
    metric("买家支付总额", currency(gross, "$")) +
    metric("平台与支付费用", currency(fee, "$"), "warning") +
    metric("预计到手利润", currency(profit, "$"), className) +
    metric("利润率", `${margin.toFixed(1)}%`, className);
}

function renderMarketplace(form) {
  const data = new FormData(form);
  const platform = data.get("platform");
  const price = numberValue(form, "price");
  const cost = numberValue(form, "cost");
  const logistics = numberValue(form, "logistics");
  const ads = price * (numberValue(form, "ads") / 100);
  const commissionRate = platform === "wish" ? 0.15 : 0.06;
  const commission = price * commissionRate;
  const profit = price - cost - logistics - ads - commission;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  document.getElementById("marketplace-result").innerHTML = [
    ["销售收入", currency(price, "$"), "按单件售价计算"],
    ["平台佣金", currency(commission, "$"), `${platform === "wish" ? "Wish" : "TikTok Shop"} 默认 ${commissionRate * 100}%`],
    ["商品成本", currency(cost, "$"), "采购、包装与损耗"],
    ["物流成本", currency(logistics, "$"), "头程、尾程或平台物流"],
    ["广告成本", currency(ads, "$"), "按销售额占比估算"],
    ["预计利润", currency(profit, "$"), `利润率 ${margin.toFixed(1)}%`],
  ]
    .map(
      ([item, amount, note], index) =>
        `<tr><td>${item}</td><td class="${index === 5 ? (profit >= 0 ? "positive" : "negative") : ""}"><strong>${amount}</strong></td><td>${note}</td></tr>`
    )
    .join("");
}

function renderShipping(form) {
  const data = new FormData(form);
  const regions = {
    cn: ["中国大陆", 1],
    us: ["美国", 1.18],
    eu: ["欧洲", 1.22],
    uk: ["英国", 1.2],
    sea: ["东南亚", 0.9],
    latam: ["拉美", 1.38],
    au: ["澳洲", 1.16],
  };
  const routeMap = {
    "cn-us": [1.18, "中美线价格波动大，旺季要预留涨价空间。"],
    "cn-eu": [1.12, "欧洲线要同时考虑 VAT、清关和退货成本。"],
    "cn-uk": [1.1, "英国线注意 VAT 和本地退货地址安排。"],
    "cn-sea": [0.72, "近区路线适合轻小件，平台官方物流通常更稳。"],
    "cn-latam": [1.42, "拉美线时效波动较大，建议保守承诺到货时间。"],
    "cn-au": [1.05, "澳洲线适合轻小件，偏远地区可能有附加成本。"],
    "us-us": [0.45, "本土配送优先比较 USPS、UPS、FedEx 或平台物流。"],
    "eu-eu": [0.5, "欧盟区内配送要留意跨境 VAT 和退货地址。"],
    "uk-uk": [0.48, "英国本土配送更适合用本地仓或平台物流。"],
    "sea-sea": [0.55, "东南亚区内价格友好，但国家间时效差异明显。"],
  };
  const channelMap = {
    economy: ["经济小包", 0.78, 9, 18, "成本低，适合低客单轻小件；追踪和时效要保守。"],
    standard: ["标准专线", 1, 6, 12, "成本、时效和追踪比较均衡，适合多数跨境订单。"],
    express: ["商业快递", 1.85, 3, 7, "速度快，适合高客单、急件或补发；低客单慎用。"],
    warehouse: ["海外仓/本地仓", 0.62, 2, 5, "适合已有稳定销量的商品；要另算仓储和退货成本。"],
  };
  const parcelMap = {
    normal: ["普通货", 1, "普通货限制较少，优先按价格和时效选渠道。"],
    battery: ["带电/磁性", 1.18, "带电或磁性商品可走渠道更少，发货前要确认可承运。"],
    fragile: ["易碎品", 1.12, "易碎品要增加包装和破损赔付预留。"],
    oversize: ["抛货/大体积", 1.28, "大体积商品容易按体积重收费，先确认包装尺寸。"],
  };
  const origin = data.get("origin");
  const destination = data.get("destination");
  const routeKey = `${origin}-${destination}`;
  const reverseRouteKey = `${destination}-${origin}`;
  const [originName, originFactor] = regions[origin];
  const [destinationName, destinationFactor] = regions[destination];
  const [channelName, channelFactor, minDays, maxDays, channelTip] = channelMap[data.get("channel")];
  const [parcelName, parcelFactor, parcelTip] = parcelMap[data.get("parcel")];
  const route = routeMap[routeKey] || routeMap[reverseRouteKey] || [origin === destination ? 0.55 : 1.28, "非常规路线建议向货代或平台物流后台二次确认。"];
  const realWeight = numberValue(form, "weight");
  const length = numberValue(form, "length");
  const width = numberValue(form, "width");
  const height = numberValue(form, "height");
  const volumeWeight = (length * width * height) / 6000;
  const chargeWeight = Math.max(realWeight, volumeWeight);
  const routeFactor = route[0] * ((originFactor + destinationFactor) / 2);
  const baseLow = 7 + chargeWeight * 13 * routeFactor * channelFactor * parcelFactor;
  const baseHigh = 12 + chargeWeight * 19 * routeFactor * channelFactor * parcelFactor;
  const low = origin === destination ? baseLow * 0.55 : baseLow;
  const high = origin === destination ? baseHigh * 0.55 : baseHigh;
  const weightType = volumeWeight > realWeight ? "体积重高于实重，按体积重估算。" : "实重高于体积重，按实重估算。";
  const costLevel = high <= 18 ? "低" : high <= 42 ? "中" : "高";
  const routeTip = route[1];

  document.getElementById("shipping-result").innerHTML =
    metric("路线 / 渠道", `${originName} → ${destinationName} · ${channelName}`) +
    metric("包裹类型", parcelName) +
    metric("实重 / 体积重", `${realWeight.toFixed(2)} kg / ${volumeWeight.toFixed(2)} kg`) +
    metric("计费重量", `${chargeWeight.toFixed(2)} kg`, volumeWeight > realWeight ? "warning" : "") +
    metric("预估运费区间", `${currency(low, "$")} - ${currency(high, "$")}`, costLevel === "高" ? "warning" : "positive") +
    metric("参考时效", `${minDays}-${maxDays} 天`) +
    `<div class="shipping-advice">
      <strong>判断建议：${costLevel}成本路线</strong>
      <p>${weightType} ${routeTip} ${channelTip} ${parcelTip}</p>
    </div>
    <p class="result-note">这是用于选品和定价初筛的估算值，实际价格会受货代、平台物流、燃油附加费、旺季、偏远地区和清关要求影响。</p>`;
}

function renderTitle(form) {
  const data = new FormData(form);
  const platform = data.get("platform");
  const keyword = data.get("keyword").trim();
  const spec = data.get("spec").trim();
  const scene = data.get("scene").trim();
  const title = `${keyword} - ${spec} for ${scene}`.replace(/\s+/g, " ");
  const maxLength = platform === "Shopee" ? 120 : platform === "eBay" ? 80 : 150;
  const trimmed = title.length > maxLength ? `${title.slice(0, maxLength - 1).trim()}` : title;

  document.getElementById("title-result").innerHTML = `
    <strong>${platform} 标题建议</strong>
    <p>${trimmed}</p>
    <div class="tag-list">
      <span class="tag">${trimmed.length}/${maxLength} 字符</span>
      <span class="tag safe">不堆砌品牌词</span>
      <span class="tag">关键词前置</span>
    </div>
  `;
}

const complianceRules = [
  { word: "anti-virus", type: "医疗/功效风险", tip: "避免暗示医疗、防病或治愈功效。" },
  { word: "miracle", type: "夸大宣传", tip: "改成具体、可验证的功能描述。" },
  { word: "cure", type: "医疗/功效风险", tip: "非合规医疗产品不要使用治疗表达。" },
  { word: "iPhone", type: "品牌/兼容性", tip: "确认授权；兼容表述建议使用 for/compatible with。" },
  { word: "brand logo", type: "侵权风险", tip: "不要赠送或展示未经授权的品牌标识。" },
  { word: "weapon", type: "禁售品", tip: "武器及仿真武器通常属于高风险或禁售。" },
  { word: "replica", type: "仿牌风险", tip: "避免仿牌、复刻、同款暗示。" },
];

function renderCompliance() {
  const input = document.getElementById("compliance-input").value.toLowerCase();
  const hits = complianceRules.filter((rule) => input.includes(rule.word.toLowerCase()));
  const result = document.getElementById("compliance-result");
  if (!hits.length) {
    result.innerHTML = `
      ${metric("检查结果", "未命中常见风险词", "positive")}
      <p>仍需按具体平台、类目和目标国家规则复核。</p>
    `;
    return;
  }
  result.innerHTML = `
    ${metric("命中风险词", `${hits.length} 个`, "negative")}
    <div class="tag-list">
      ${hits.map((hit) => `<span class="tag danger">${hit.word} · ${hit.type}</span>`).join("")}
    </div>
    <ul class="check-list">
      ${hits.map((hit) => `<li><span>!</span><div><strong>${hit.word}</strong><br>${hit.tip}</div></li>`).join("")}
    </ul>
  `;
}

const tutorials = {
  shopee: {
    name: "Shopee",
    intro: "适合从轻小件和东南亚市场入门的新手。重点是先跑通资料准备、费用理解、官方物流、标题本地化和店铺评分。",
    checklist: ["营业执照或主体资料", "法人/负责人信息", "手机号和邮箱", "收款账户", "主营类目和 5-10 个候选产品", "发货地址和退货处理方案"],
    steps: [
      ["确认入驻站点", "先确定你要做哪个市场，不同站点的入驻资料、费用和物流规则会不同。新手优先选择自己能理解语言、物流和售后的市场。"],
      ["准备店铺资料", "按后台要求准备主体资料、联系人、收款账户和主营类目。资料要真实一致，不要借用无法解释的身份或收款信息。"],
      ["算清首批产品利润", "选 5-10 个轻小件，用利润工具计算采购、平台费、物流补贴、活动成本和广告预留。低利润产品先不要上架。"],
      ["设置物流和发货时效", "优先熟悉平台官方物流或稳定专线。处理时间要保守，不要为了转化承诺做不到的时效。"],
      ["完成第一个商品上架", "标题放核心关键词，主图清楚展示商品，规格和变体不要混乱。描述里写清尺寸、材质、包装清单和使用场景。"],
      ["检查活动和优惠券", "活动能带来曝光，但会吃掉利润。参加前重新算促销价后的净利率，亏损活动不要硬上。"],
      ["完成前 20 单复盘", "记录真实结算、物流异常、退款原因和买家评价。先把评分和履约稳定住，再扩 SKU。"],
    ],
    week: ["第 1 天：准备资料和候选产品", "第 2 天：用利润工具筛掉低利润品", "第 3 天：完成店铺基础设置", "第 4 天：上架 3-5 个商品", "第 5-7 天：检查曝光、点击、物流设置和价格"],
    risks: ["不要直接搬运别人标题和图片", "不要忽略活动费和物流补贴", "不要碰仿牌、医疗功效、危险品", "不要一开始铺几百个 SKU"],
  },
  ebay: {
    name: "eBay",
    intro: "适合做长尾商品、配件、工具和专业类目的卖家。新号重点不是冲单，而是建立稳定刊登和真实履约记录。",
    checklist: ["eBay 账号资料", "收款账户", "发货和退货地址", "低风险首批产品", "物流追踪方案", "英文标题和 Item specifics"],
    steps: [
      ["注册并完善账号", "完成基础身份、地址、收款和安全设置。资料要长期可用，避免后续提款或验证时出问题。"],
      ["选择低风险商品", "新号先避开品牌敏感、仿牌、高退货和复杂电子产品。优先选择配件、耗材、工具和描述简单的小件。"],
      ["核算成交费用", "用费用工具估算成交费、固定费用、物流、广告和退款预留。不要只按商品售价算利润。"],
      ["写好第一个 listing", "标题控制在平台限制内，关键词前置；Item specifics 尽量填完整；图片真实清晰，不盗品牌图。"],
      ["设置物流和退货政策", "处理时间要真实，追踪号要可查。退货政策写清楚，避免买家预期和实际服务不一致。"],
      ["小批量稳定出单", "新号阶段先追求准时发货、低纠纷和正常评价。不要突然大量刊登异常低价商品。"],
      ["按指标扩品", "观察延迟发货率、取消订单、纠纷、差评和真实利润。指标稳定后再增加 SKU 和广告。"],
    ],
    week: ["第 1 天：完善账号和收款", "第 2 天：筛 10 个低风险商品", "第 3 天：计算费用和物流", "第 4 天：发布 3 个 listing", "第 5-7 天：检查刊登质量和账号提示"],
    risks: ["不要用未经授权品牌词", "不要写虚假库存和夸张时效", "不要盗图", "不要用低价冲单破坏账号健康"],
  },
  tiktok: {
    name: "TikTok Shop",
    intro: "适合有内容能力、短视频素材和达人合作能力的卖家。开店只是第一步，真正难点是内容转化、履约和售后。",
    checklist: ["目标市场主体资料", "品牌或授权资料", "收款和税务信息", "可拍视频的产品", "达人/内容计划", "本地或跨境履约方案"],
    steps: [
      ["确认市场和资质", "先看目标市场当前入驻要求。不要用假资料硬闯，主体、税务、收款和退货地址要能解释。"],
      ["选择适合内容展示的产品", "优先选择能演示效果、场景明确、卖点一眼能看懂的商品。纯低价标品不一定适合内容平台。"],
      ["搭建成本模型", "除了平台费，还要算达人佣金、样品、广告、退货、物流和内容制作成本。内容平台不能只看采购价。"],
      ["准备商品卡和素材", "商品标题、主图、详情页、短视频脚本、直播话术要一致。不要视频夸张，详情页却解释不清。"],
      ["设置物流和售后", "确认发货时效、退货地址、客服响应和异常处理。内容爆单时，履约跟不上会迅速变成差评。"],
      ["启动小预算测试", "先测 3-5 条短视频或少量达人，不要一开始重投。看点击率、加购率、转化率和退款原因。"],
      ["复盘内容和商品", "表现不好时区分是内容问题、价格问题、商品问题还是物流问题。不要只靠加预算解决。"],
    ],
    week: ["第 1 天：确认资质和市场", "第 2 天：筛选适合视频展示的产品", "第 3 天：写商品卡和脚本", "第 4 天：准备首批素材", "第 5-7 天：小预算测试并复盘"],
    risks: ["不要买资料或借身份", "不要夸大功效", "不要忽视达人佣金和退货", "不要让视频展示和实物不一致"],
  },
  wish: {
    name: "Wish",
    intro: "适合有低成本供应链、能控制质量和退款率的卖家。重点是把平台费用、物流、listing 成本和退款一起算清楚。",
    checklist: ["商户主体资料", "收款账户", "低客单轻小件产品", "清晰图片和属性", "物流渠道", "退款和质量控制方案"],
    steps: [
      ["确认账号和类目", "先按后台要求完成商户资料、收款和类目选择。不要上架规则不清楚或资质不确定的商品。"],
      ["选择低售后产品", "优先轻小件、非品牌、质量稳定、描述简单的商品。避开易碎、复杂电子、医疗功效和强认证商品。"],
      ["重新计算真实利润", "把佣金、物流、广告、退款、汇率和可能的 listing 成本都算进去。低价商品尤其容易被费用吃掉。"],
      ["整理商品资料", "图片要清楚，标题不要堆词，属性和规格要完整。尺寸、颜色、数量和包装清单必须写清楚。"],
      ["设置物流承诺", "低客单商品不能用过贵物流，但也不能承诺做不到的时效。选择可追踪且成本可控的渠道。"],
      ["小批量测试退款率", "Wish 产品不能只看销量，要看退款和差评。退款高的产品即使出单也可能亏。"],
      ["按利润决定去留", "连续测试后，把商品分成继续推、观察、停止三类。不要让低利润高退款商品占用时间。"],
    ],
    week: ["第 1 天：准备账号和收款", "第 2 天：筛轻小件产品", "第 3 天：计算费用和退款预留", "第 4 天：上架少量商品", "第 5-7 天：观察点击、订单和退款风险"],
    risks: ["不要只看采购价", "不要忽略退款率", "不要用不真实图片", "不要大量铺货后才算利润"],
  },
};

function renderTutorial(platform) {
  const tutorial = tutorials[platform];
  document.getElementById("tutorial-panel").innerHTML = `
    <div class="tutorial-hero">
      <div>
        <span class="tag safe">${tutorial.name}</span>
        <h3>${tutorial.name} 开店完整流程</h3>
        <p>${tutorial.intro}</p>
      </div>
      <a class="button secondary" href="./articles.html">查看相关文章</a>
    </div>
    <div class="tutorial-layout">
      <aside class="tutorial-checklist">
        <h4>开始前准备</h4>
        <ul>
          ${tutorial.checklist.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </aside>
      <div class="tutorial-main">
        <ol class="tutorial-steps">
          ${tutorial.steps
            .map(
              ([title, copy], index) => `
                <li>
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <div><strong>${title}</strong><p>${copy}</p></div>
                </li>
              `
            )
            .join("")}
        </ol>
      </div>
    </div>
    <div class="tutorial-bottom">
      <div>
        <h4>第一周照着做</h4>
        <ul class="mini-checks">
          ${tutorial.week.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
      <div>
        <h4>新手避坑</h4>
        <ul class="mini-checks warning-list">
          ${tutorial.risks.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function renderFit(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "这个产品").trim();
  const platform = data.get("platform");
  const price = numberValue(form, "price");
  const cost = numberValue(form, "cost");
  const shipping = numberValue(form, "shipping");
  const adsRate = numberValue(form, "ads") / 100;
  const weight = data.get("weight");
  const competition = data.get("competition");
  const risk = data.get("risk");
  const edge = String(data.get("edge") || "").trim();
  const platformRates = {
    shopee: ["Shopee", 0.1],
    ebay: ["eBay", 0.135],
    tiktok: ["TikTok Shop", 0.08],
    wish: ["Wish", 0.15],
  };
  const [platformName, feeRate] = platformRates[platform] || platformRates.shopee;
  const platformFee = price * feeRate;
  const adsCost = price * adsRate;
  const totalCost = cost + shipping + platformFee + adsCost;
  const profit = price - totalCost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const profitScore = Math.max(0, Math.min(35, Math.round((margin / 35) * 35)));
  const logisticsMap = {
    light: ["轻小件：物流压力低", 25, "适合新手先小批量测试，运费不容易失控。"],
    medium: ["中等重量：需要比价", 17, "先比较专线和平台物流，避免促销后被运费吃掉利润。"],
    heavy: ["偏重/大体积：物流压力高", 7, "除非客单价高或有海外仓方案，否则新手要谨慎。"],
  };
  const competitionMap = {
    low: ["同款少：有测试价值", 20, "先用 3-5 个关键词验证搜索需求。"],
    medium: ["竞争中等：要讲清卖点", 13, "主图、标题和价格梯度要和同款拉开差异。"],
    high: ["价格战明显：谨慎进入", 5, "没有成本优势或强卖点时，不建议重仓。"],
  };
  const riskMap = {
    low: ["低风险：普通日用品", 20, "正常检查标题和图片即可。"],
    medium: ["中风险：先查规则", 11, "带电、儿童、美妆等产品要核对平台和目标国要求。"],
    high: ["高风险：先别上架", 2, "品牌、功效、认证不确定时，先解决合规再测试。"],
  };
  const [logisticsLabel, logisticsScore, logisticsTip] = logisticsMap[weight];
  const [competitionLabel, competitionScore, competitionTip] = competitionMap[competition];
  const [riskLabel, riskScore, riskTip] = riskMap[risk];
  const edgeScore = edge.length >= 12 ? 10 : edge.length >= 5 ? 6 : 2;
  const rawScore = Math.max(0, Math.min(100, profitScore + logisticsScore + competitionScore + riskScore + edgeScore));
  const score = profit <= 0 ? Math.min(rawScore, 45) : risk === "high" ? Math.min(rawScore, 58) : rawScore;
  const verdict =
    profit <= 0 || risk === "high"
      ? "暂不建议上架"
      : score >= 78
        ? "适合小批量测试"
        : score >= 60
          ? "可以测，但先控预算"
          : "先优化后再测";
  const verdictClass = profit <= 0 || risk === "high" ? "negative" : score >= 60 ? "positive" : "warning";
  const platformFeeText = currency(platformFee, "$");
  const adsText = currency(adsCost, "$");
  const profitText = currency(profit, "$");
  const marginText = `${margin.toFixed(1)}%`;
  const profitTip =
    margin >= 25
      ? "利润空间不错，可以进入小批量测试。"
      : margin >= 12
        ? "利润偏紧，先压低广告或优化采购/物流。"
        : "利润不足，建议先调价、降成本或换品。";
  const nextSteps =
    profit <= 0
      ? ["先把售价、采购或物流调到有正利润", "不要投广告测试亏损模型", "换一个同类轻小件候选品对比"]
      : risk === "high"
        ? ["先确认品牌授权、认证或禁售规则", "删掉功效和侵权风险表达", "合规不清楚前不要上架"]
        : ["采购少量样品或小库存测试", "用利润计算器复核真实平台费用", "准备 1 张主图、1 个标题和 3 个卖点"];

  const factor = (label, value, tip) => `
    <div class="fit-factor">
      <div><strong>${label}</strong><span>${value} / 100</span></div>
      <meter min="0" max="100" value="${value}"></meter>
      <p>${tip}</p>
    </div>
  `;

  document.getElementById("fit-result").innerHTML = `
    <div class="score">
      <div class="score-number">${score}</div>
      <div>
        <h3>${name}</h3>
        <p class="${verdictClass}">${verdict}</p>
      </div>
    </div>
    <div class="fit-money">
      ${metric("目标平台", platformName)}
      ${metric("平台费预估", platformFeeText)}
      ${metric("广告成本预估", adsText)}
      ${metric("预计单件利润", profitText, profit >= 0 ? "positive" : "negative")}
      ${metric("预计净利率", marginText, margin >= 20 ? "positive" : margin >= 10 ? "warning" : "negative")}
    </div>
    <div class="fit-factors">
      ${factor("利润空间", Math.round((profitScore / 35) * 100), profitTip)}
      ${factor("物流难度", Math.round((logisticsScore / 25) * 100), logisticsLabel)}
      ${factor("竞争压力", Math.round((competitionScore / 20) * 100), competitionLabel)}
      ${factor("合规安全", Math.round((riskScore / 20) * 100), riskLabel)}
    </div>
    <ul class="check-list">
      <li><span>1</span><div><strong>下一步</strong><br>${nextSteps[0]}</div></li>
      <li><span>2</span><div><strong>测试前</strong><br>${nextSteps[1]}</div></li>
      <li><span>3</span><div><strong>准备素材</strong><br>${nextSteps[2]}</div></li>
      <li><span>!</span><div><strong>提醒</strong><br>${logisticsTip} ${competitionTip} ${riskTip}</div></li>
    </ul>
  `;
}

bindForm("shopee-form", renderShopee);
bindForm("ebay-form", renderEbay);
bindForm("marketplace-form", renderMarketplace);
bindForm("shipping-form", renderShipping);
bindForm("title-form", renderTitle);
bindForm("fit-form", renderFit);

document.getElementById("compliance-input").addEventListener("input", renderCompliance);
renderCompliance();

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    renderTutorial(tab.dataset.platform);
  });
});
renderTutorial("shopee");

document.querySelectorAll("[data-open-tool]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const toolName = control.dataset.openTool;
    if (!toolName) return;
    openTool(toolName, true);
  });
});

const requestedTool = new URLSearchParams(window.location.search).get("tool");
if (requestedTool) {
  openTool(requestedTool, false);
}

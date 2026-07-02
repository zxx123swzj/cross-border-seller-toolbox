const params = new URLSearchParams(window.location.search);
const slug = params.get("slug") || "shopee-still-worth-it";
const articles = window.ARTICLE_DATA || [];
const article = articles.find((item) => item.slug === slug) || articles[0];

document.title = `${article.title} | 跨境卖家工具箱`;

const detail = document.getElementById("article-detail");
detail.innerHTML = `
  <a class="back-link" href="./index.html#articles">← 返回文章列表</a>
  <div class="article-meta">
    <span>${article.category}</span>
    <span>更新：2026-07-02</span>
  </div>
  <h1>${article.title}</h1>
  <p class="article-summary">${article.summary}</p>
  ${article.sections
    .map(
      ([heading, paragraphs]) => `
        <section>
          <h2>${heading}</h2>
          ${paragraphs.map((text) => `<p>${text}</p>`).join("")}
        </section>
      `
    )
    .join("")}
  ${
    article.sources
      ? `<section class="source-box">
          <h2>参考资料</h2>
          <p>平台规则会变化，正式操作前请以官方后台和帮助中心为准。</p>
          <ul>
            ${article.sources.map(([label, href]) => `<li><a href="${href}" target="_blank" rel="noreferrer">${label}</a></li>`).join("")}
          </ul>
        </section>`
      : `<section class="source-box"><h2>操作提醒</h2><p>本文用于新手建立判断框架，具体费用、资质、禁售和物流规则请按目标平台、类目和国家重新核对。</p></section>`
  }
`;

const toolLink = document.getElementById("article-tool-link");
toolLink.href = article.tool.href;
toolLink.textContent = article.tool.label;

document.getElementById("more-articles").innerHTML = articles
  .filter((item) => item.slug !== article.slug)
  .slice(0, 6)
  .map((item) => `<a href="./article.html?slug=${item.slug}"><span>${item.category}</span>${item.title}</a>`)
  .join("");

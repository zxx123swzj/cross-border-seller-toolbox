const articleGrid = document.getElementById("article-index-grid");

articleGrid.innerHTML = (window.ARTICLE_DATA || [])
  .map(
    (article) => `
      <a href="./article.html?slug=${article.slug}" class="article-card">
        <span>${article.category}</span>
        <strong>${article.title}</strong>
        <p>${article.summary}</p>
      </a>
    `
  )
  .join("");

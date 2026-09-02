let products = [];
let activeCategory = "الكل";

async function loadData() {
  try {
    const response = await fetch("knowledge_base.json");
    const data = await response.json();
    products = data.products || [];

    renderFilters();
    renderProducts();
  } catch (error) {
    console.error(error);
    document.getElementById("grid").innerHTML =
      "<p>تعذر تحميل بيانات المنتجات.</p>";
  }
}

function renderFilters() {
  const box = document.getElementById("filters");
  if (!box) return;

  const categories = [
    "الكل",
    ...new Set(products.map(p => p.category).filter(Boolean))
  ];

  box.innerHTML = categories.map(category => `
    <button
      class="${activeCategory === category ? "active" : ""}"
      onclick="setCategory('${escapeAttr(category)}')">
      ${escapeHTML(category)}
    </button>
  `).join("");
}

function setCategory(category) {
  activeCategory = category;
  renderFilters();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("search");

  if (!grid) return;

  const search = (searchInput?.value || "").trim().toLowerCase();

  const filtered = products.filter(product => {
    const text = `
      ${product.name_ar || ""}
      ${product.catalog_name || ""}
      ${product.category || ""}
      ${product.general_info || ""}
    `.toLowerCase();

    const matchesSearch = !search || text.includes(search);
    const matchesCategory =
      activeCategory === "الكل" ||
      product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    grid.innerHTML = "<p>لم يتم العثور على منتج مطابق.</p>";
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-top">
        <span class="category">${escapeHTML(product.category || "")}</span>
        <span class="status">
          ${escapeHTML(product.verification_status || "بانتظار التحقق الرسمي")}
        </span>
      </div>

      <h3>${escapeHTML(product.name_ar || product.catalog_name || "")}</h3>

      <p class="price">
        ${product.price_non_member != null
          ? product.price_non_member + " $" 
          : "السعر غير متوفر"}
      </p>

      ${
        product.general_info
          ? `<p>${escapeHTML(product.general_info)}</p>`
          : ""
      }

      <details>
        <summary>المعلومات العامة</summary>
        <p>${escapeHTML(
          product.general_info ||
          "لا توجد معلومات عامة موثقة متاحة حاليًا."
        )}</p>

        ${
          product.information_source
            ? `<small>
                المصدر:
                <a href="${escapeAttr(product.information_source)}"
                   target="_blank"
                   rel="noopener">
                  مصدر DXN
                </a>
              </small>`
            : ""
        }
      </details>
    </article>
  `).join("");
}

async function ask(text) {
  const input = document.getElementById("q");
  const answer = document.getElementById("answer");

  const question = (text || input?.value || "").trim();

  if (!question) {
    if (answer) {
      answer.innerHTML = "<p>اكتب سؤالك أولًا.</p>";
    }
    return;
  }

  if (answer) {
    answer.innerHTML = `
      <div class="assistant-answer">
        <p>جاري التفكير... 🤖</p>
      </div>
    `;
  }

  try {
    const response = await fetch("/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "حدث خطأ");
    }

    if (answer) {
      answer.innerHTML = `
        <div class="assistant-answer">
          <p>${escapeHTML(data.answer || "لم تصل إجابة.")}</p>
          <small>
            المعلومات المعروضة معلومات عامة وليست تشخيصًا أو وصفة علاجية.
          </small>
        </div>
      `;
    }

    if (input) {
      input.value = "";
    }

  } catch (error) {
    console.error(error);

    if (answer) {
      answer.innerHTML = `
        <div class="assistant-answer">
          <p>تعذر الاتصال بالوكيل الذكي حاليًا.</p>
          <small>تأكد من تشغيل الخادم وإعداد مفتاح OpenAI بشكل صحيح.</small>
        </div>
      `;
    }
  }
}
  const input = document.getElementById("q");
  const answer = document.getElementById("answer");

  const question = (text || input?.value || "").trim();

  if (!question) {
    if (answer) answer.innerHTML = "<p>اكتب سؤالك أولًا.</p>";
    return;
  }

  const q = question.toLowerCase();

  let result = "";

  if (
    q.includes("منتج") ||
    q.includes("المنتجات") ||
    q.includes("شو عندكم") ||
    q.includes("موجود")
  ) {
    result = `
      <h3>المنتجات المتوفرة</h3>
      <p>لدينا ${products.length} منتجًا مدرجًا حاليًا.</p>
      <p>يمكنك استخدام البحث أو الأقسام للوصول إلى المنتج الذي تريده.</p>
    `;
  }

  else if (
    q.includes("سعر") ||
    q.includes("الأسعار") ||
    q.includes("كم")
  ) {
    result = `
      <h3>الأسعار</h3>
      <p>يمكنني مساعدتك في معرفة سعر أي منتج موجود في الكتالوج.</p>
      <p>اكتب اسم المنتج مثل: معجون جانوزي.</p>
    `;
  }

  else if (
    q.includes("عمل") ||
    q.includes("فرصة") ||
    q.includes("مشروع")
  ) {
    result = `
      <h3>فرصة العمل</h3>
      <p>
        يمكنك التعرف على فكرة العمل وطريقة البدء والتفاصيل
        قبل اتخاذ أي قرار.
      </p>
      <p>
        لا نقدم وعودًا بأرباح مضمونة.
      </p>
    `;
  }

  else {
    const found = products.filter(product => {
      const text = `
        ${product.name_ar || ""}
        ${product.catalog_name || ""}
        ${product.general_info || ""}
      `.toLowerCase();

      return text.includes(q);
    }).slice(0, 3);

    if (found.length) {
      result = found.map(product => `
        <div class="answer-product">
          <h3>${escapeHTML(product.name_ar || "")}</h3>
          <p>
            السعر:
            ${
              product.price_non_member != null
                ? product.price_non_member + " $"
                : "غير متوفر"
            }
          </p>
          <p>
            ${escapeHTML(
              product.general_info ||
              "لا توجد معلومات عامة موثقة متاحة."
            )}
          </p>
          <p>
            <strong>
              ${escapeHTML(
                product.verification_status ||
                "بانتظار التحقق الرسمي"
              )}
            </strong>
          </p>
        </div>
      `).join("");
    } else {
      result = `
        <h3>لم أجد المنتج في قاعدة المعلومات.</h3>
        <p>
          اكتب اسم المنتج بشكل أوضح، أو استخدم قسم المنتجات للبحث.
        </p>
      `;
    }
  }

  if (answer) {
    answer.innerHTML = `
      <div class="assistant-answer">
        ${result}
        <small>
          المعلومات المعروضة معلومات عامة وليست تشخيصًا أو وصفة علاجية.
        </small>
      </div>
    `;
  }

  if (input && !text) input.value = "";
}

function saveLead() {
  const name = document.getElementById("leadName")?.value.trim();
  const phone = document.getElementById("leadPhone")?.value.trim();
  const msg = document.getElementById("leadMsg");

  if (!name || !phone) {
    if (msg) msg.textContent = "يرجى إدخال الاسم ورقم التواصل.";
    return;
  }

  const leads = JSON.parse(localStorage.getItem("dxn_leads") || "[]");

  leads.push({
    name,
    phone,
    date: new Date().toISOString()
  });

  localStorage.setItem("dxn_leads", JSON.stringify(leads));

  if (msg) {
    msg.textContent = "تم حفظ طلب التواصل بنجاح.";
  }

  document.getElementById("leadName").value = "";
  document.getElementById("leadPhone").value = "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  const input = document.getElementById("q");

  if (input) {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        ask();
      }
    });
  }
});

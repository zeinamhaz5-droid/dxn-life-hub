let activeCategory = "الكل";
let products = [];

/* =========================
   تحميل قاعدة بيانات المنتجات
========================= */

async function loadData() {
  try {
    const response = await fetch("knowledge_base.json");

    if (!response.ok) {
      throw new Error("تعذر تحميل قاعدة المنتجات");
    }

    const data = await response.json();

    products = Array.isArray(data.products) ? data.products : [];

    renderFilters();
    renderProducts();

  } catch (error) {
    console.error("Load data error:", error);

    const grid = document.getElementById("grid");

    if (grid) {
      grid.innerHTML = `
        <p>تعذر تحميل بيانات المنتجات حاليًا.</p>
      `;
    }
  }
}


/* =========================
   الأقسام
========================= */

function renderFilters() {
  const box = document.getElementById("filters");

  if (!box) return;

  const categories = [
    "الكل",
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )
  ];

  box.innerHTML = categories
    .map(category => `
      <button
        class="${activeCategory === category ? "active" : ""}"
        onclick="setCategory('${escapeAttr(category)}')">
        ${escapeHTML(category)}
      </button>
    `)
    .join("");
}


function setCategory(category) {
  activeCategory = category;

  renderFilters();
  renderProducts();
}


/* =========================
   البحث والمنتجات
========================= */

function renderProducts() {
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("search");

  if (!grid) return;

  const search = (
    searchInput?.value || ""
  )
    .trim()
    .toLowerCase();

  const filtered = products.filter(product => {

    const text = `
      ${product.name_ar || ""}
      ${product.catalog_name || ""}
      ${product.category || ""}
      ${product.general_info || ""}
    `.toLowerCase();

    const matchesSearch =
      !search || text.includes(search);

    const matchesCategory =
      activeCategory === "الكل" ||
      product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });


  if (!filtered.length) {
    grid.innerHTML = `
      <p>لم يتم العثور على منتج مطابق.</p>
    `;
    return;
  }


  grid.innerHTML = filtered
    .map(product => `

      <article class="product-card">

        <div class="product-top">

          <span class="category">
            ${escapeHTML(product.category || "")}
          </span>

          <span class="status">
            ${escapeHTML(
              product.verification_status ||
              "بانتظار التحقق الرسمي"
            )}
          </span>

        </div>

        <h3>
          ${escapeHTML(
            product.name_ar ||
            product.catalog_name ||
            ""
          )}
        </h3>

        <p class="price">
          ${
            product.price_non_member != null
              ? escapeHTML(product.price_non_member) + " $"
              : "السعر غير متوفر"
          }
        </p>

        ${
          product.general_info
            ? `
              <p>
                ${escapeHTML(product.general_info)}
              </p>
            `
            : ""
        }

        <details>

          <summary>
            المعلومات العامة
          </summary>

          <p>
            ${escapeHTML(
              product.general_info ||
              "لا توجد معلومات عامة موثقة متاحة حاليًا."
            )}
          </p>

          ${
            product.information_source
              ? `
                <small>
                  المصدر:
                  <a
                    href="${escapeAttr(
                      product.information_source
                    )}"
                    target="_blank"
                    rel="noopener noreferrer">
                    مصدر DXN
                  </a>
                </small>
              `
              : ""
          }

        </details>

      </article>

    `)
    .join("");
}


/* =========================
   الوكيل الذكي
========================= */

async function ask(text) {

  const input = document.getElementById("q");
  const answer = document.getElementById("answer");

  const question = (
    text ||
    input?.value ||
    ""
  ).trim();


  /* التحقق من السؤال */

  if (!question) {

    if (answer) {
      answer.innerHTML = `
        <div class="assistant-answer">
          <p>اكتب سؤالك أولًا.</p>
        </div>
      `;
    }

    return;
  }


  /* تسجيل الاختبار */

  console.log("=================================");
  console.log("🤖 AI AGENT TEST");
  console.log("السؤال:", question);
  console.log("إرسال الطلب إلى: /ask");
  console.log("=================================");


  /* رسالة الانتظار */

  if (answer) {

    answer.innerHTML = `
      <div class="assistant-answer">
        <p>
          🤖 جاري الاتصال بالوكيل الذكي...
        </p>
        <small>
          يرجى الانتظار...
        </small>
      </div>
    `;

  }


  try {

    console.log("📡 بدء إرسال الطلب...");


    const response = await fetch("/ask", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },

      body: JSON.stringify({
        question: question
      })

    });


    console.log(
      "📥 استجابة الخادم:",
      response.status,
      response.statusText
    );


    /* قراءة الاستجابة */

    const contentType =
      response.headers.get("content-type") || "";


    let data;


    if (contentType.includes("application/json")) {

      data = await response.json();

    } else {

      const textResponse =
        await response.text();

      console.error(
        "❌ الخادم لم يرجع JSON:",
        textResponse
      );

      throw new Error(
        "الخادم لم يرجع استجابة JSON صحيحة."
      );

    }


    console.log("📦 بيانات الخادم:", data);


    /* فحص حالة الطلب */

    if (!response.ok) {

      throw new Error(
        data.error ||
        `خطأ من الخادم: ${response.status}`
      );

    }


    /* الحصول على الإجابة */

    const reply =
      data.answer ||
      "لم تصل إجابة من الوكيل الذكي.";


    console.log("✅ وصلت إجابة الوكيل:");
    console.log(reply);


    /* عرض الإجابة */

    if (answer) {

      answer.innerHTML = `
        <div class="assistant-answer">

          <p>
            ${escapeHTML(reply)}
          </p>

          <small>
            المعلومات المعروضة معلومات عامة
            وليست تشخيصًا أو وصفة علاجية.
          </small>

        </div>
      `;

    }


    /* مسح السؤال */

    if (input) {
      input.value = "";
    }


  } catch (error) {

    console.error("=================================");
    console.error("❌ AI AGENT ERROR");
    console.error("الخطأ:", error);
    console.error("رسالة الخطأ:", error.message);
    console.error("=================================");


    if (answer) {

      answer.innerHTML = `
        <div class="assistant-answer">

          <p>
            ❌ تعذر الاتصال بالوكيل الذكي.
          </p>

          <small>
            ${escapeHTML(
              error.message ||
              "حدث خطأ غير معروف."
            )}
          </small>

        </div>
      `;

    }

  }

}


/* =========================
   حفظ بيانات التواصل
========================= */

function saveLead() {

  const name =
    document
      .getElementById("leadName")
      ?.value
      .trim();

  const phone =
    document
      .getElementById("leadPhone")
      ?.value
      .trim();

  const msg =
    document.getElementById("leadMsg");


  if (!name || !phone) {

    if (msg) {
      msg.textContent =
        "يرجى إدخال الاسم ورقم التواصل.";
    }

    return;
  }


  let leads = [];

  try {

    leads = JSON.parse(
      localStorage.getItem("dxn_leads") ||
      "[]"
    );

    if (!Array.isArray(leads)) {
      leads = [];
    }

  } catch {

    leads = [];

  }


  leads.push({

    name: name,

    phone: phone,

    date: new Date().toISOString()

  });


  localStorage.setItem(
    "dxn_leads",
    JSON.stringify(leads)
  );


  if (msg) {

    msg.textContent =
      "تم حفظ طلب التواصل بنجاح.";

  }


  const nameInput =
    document.getElementById("leadName");

  const phoneInput =
    document.getElementById("leadPhone");


  if (nameInput) {
    nameInput.value = "";
  }

  if (phoneInput) {
    phoneInput.value = "";
  }

}


/* =========================
   حماية النصوص
========================= */

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


/* =========================
   تشغيل الموقع
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadData();


    const input =
      document.getElementById("q");


    if (input) {

      input.addEventListener(
        "keydown",
        event => {

          if (event.key === "Enter") {

            event.preventDefault();

            ask();

          }

        }
      );

    }


    const searchInput =
      document.getElementById("search");


    if (searchInput) {

      searchInput.addEventListener(
        "input",
        () => {

          renderProducts();

        }
      );

    }

  }
);

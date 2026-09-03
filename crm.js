/* =========================================================
   DXN LIFE HUB — CRM SYSTEM
   الجزء 1: الإعدادات والبيانات الأساسية
   ========================================================= */

(function () {
  "use strict";

  const CRM_KEY = "dxn_crm_clients";
  const CRM_VERSION = "1.0";

  let clients = [];
  let products = [];

  /* ---------- تحميل العملاء ---------- */

  function loadClients() {
    try {
      const saved = localStorage.getItem(CRM_KEY);
      clients = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(clients)) {
        clients = [];
      }
    } catch (error) {
      console.error("CRM load error:", error);
      clients = [];
    }
  }

  /* ---------- حفظ العملاء ---------- */

  function saveClients() {
    try {
      localStorage.setItem(CRM_KEY, JSON.stringify(clients));
    } catch (error) {
      console.error("CRM save error:", error);
      alert("تعذر حفظ بيانات العملاء على هذا الجهاز.");
    }
  }

  /* ---------- إنشاء رقم عميل ---------- */

  function createClientId() {
    return (
      "DXN-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 7).toUpperCase()
    );
  }

  /* ---------- التاريخ ---------- */

  function now() {
    return new Date().toISOString();
  }

  function formatDate(date) {
    if (!date) return "-";

    try {
      return new Date(date).toLocaleDateString("ar-LB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
    } catch {
      return "-";
    }
  }

  /* ---------- حماية النصوص ---------- */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------- تحميل منتجات المشروع ---------- */

  async function loadCRMProducts() {
    try {
      const response = await fetch("/knowledge_base.json");

      if (!response.ok) {
        throw new Error("knowledge_base.json unavailable");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        products = data;
      } else if (Array.isArray(data.products)) {
        products = data.products;
      } else {
        products = [];
      }

      console.log("CRM products loaded:", products.length);
    } catch (error) {
      console.warn("CRM product loading failed:", error);
      products = [];
    }
  }

  /* ---------- إنشاء عميل جديد ---------- */

  function createClient(data) {
    const client = {
      id: createClientId(),

      name: String(data.name || "").trim(),

      phone: String(data.phone || "").trim(),

      whatsapp: String(data.whatsapp || data.phone || "").trim(),

      country: String(data.country || "").trim(),

      city: String(data.city || "").trim(),

      status: String(data.status || "جديد").trim(),

      interest: String(data.interest || "").trim(),

      product: String(data.product || "").trim(),

      source: String(data.source || "الموقع").trim(),

      followUp: data.followUp || "",

      notes: String(data.notes || "").trim(),

      createdAt: now(),

      updatedAt: now(),

      orders: [],

      history: [
        {
          date: now(),
          type: "إنشاء",
          text: "تم تسجيل العميل في نظام CRM."
        }
      ]
    };

    clients.unshift(client);
    saveClients();

    return client;
  }

  /* ---------- تحديث عميل ---------- */

  function updateClient(id, data) {
    const client = clients.find(item => item.id === id);

    if (!client) {
      return null;
    }

    Object.keys(data || {}).forEach(key => {
      if (key === "id" || key === "createdAt") return;

      if (data[key] !== undefined) {
        client[key] = data[key];
      }
    });

    client.updatedAt = now();

    if (!Array.isArray(client.history)) {
      client.history = [];
    }

    client.history.unshift({
      date: now(),
      type: "تعديل",
      text: "تم تحديث بيانات العميل."
    });

    saveClients();

    return client;
  }

  /* ---------- حذف عميل ---------- */

  function deleteClient(id) {
    const index = clients.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    clients.splice(index, 1);
    saveClients();

    return true;
  }

  /* ---------- إحصائيات CRM ---------- */

  function getStats() {
    return {
      total: clients.length,

      newClients: clients.filter(
        client => client.status === "جديد"
      ).length,

      contacted: clients.filter(
        client => client.status === "تم التواصل"
      ).length,

      interested: clients.filter(
        client => client.status === "مهتم"
      ).length,

      customers: clients.filter(
        client => client.status === "عميل"
      ).length,

      followUps: clients.filter(
        client => client.followUp
      ).length
    };
  }

  /* ---------- تصدير النظام لاحقًا ---------- */

  window.DXN_CRM = {
    version: CRM_VERSION,
    getClients: () => clients,
    getProducts: () => products,
    createClient,
    updateClient,
    deleteClient,
    getStats,
    saveClients,
    formatDate
  };

  /* ---------- تشغيل ---------- */

  loadClients();

  document.addEventListener("DOMContentLoaded", function () {
    loadCRMProducts();
  });

})();
/* =========================================================
   الجزء 2: واجهة إدارة العملاء
   ========================================================= */

(function () {
  "use strict";

  function getCRMRoot() {
    return document.getElementById("crm");
  }

  function renderCRM() {
    const root = getCRMRoot();

    if (!root || !window.DXN_CRM) return;

    const stats = window.DXN_CRM.getStats();

    root.innerHTML = `
      <div class="crm-panel">

        <div class="crm-header">
          <div>
            <h2>👥 إدارة العملاء</h2>
            <p>سجّل العملاء وتابعهم بسهولة.</p>
          </div>

          <button
            type="button"
            class="crm-add-btn"
            onclick="window.DXN_CRM_UI.showForm()"
          >
            ➕ إضافة عميل
          </button>
        </div>

        <div class="crm-stats">

          <div class="crm-stat">
            <b>${stats.total}</b>
            <span>إجمالي العملاء</span>
          </div>

          <div class="crm-stat">
            <b>${stats.newClients}</b>
            <span>عملاء جدد</span>
          </div>

          <div class="crm-stat">
            <b>${stats.interested}</b>
            <span>مهتمون</span>
          </div>

          <div class="crm-stat">
            <b>${stats.customers}</b>
            <span>عملاء</span>
          </div>

        </div>

        <div id="crmFormBox"></div>

        <div class="crm-tools">

          <input
            id="crmSearch"
            type="search"
            placeholder="🔍 ابحث بالاسم أو رقم الهاتف..."
            oninput="window.DXN_CRM_UI.renderClients()"
          />

          <select
            id="crmStatusFilter"
            onchange="window.DXN_CRM_UI.renderClients()"
          >
            <option value="">كل الحالات</option>
            <option value="جديد">جديد</option>
            <option value="تم التواصل">تم التواصل</option>
            <option value="مهتم">مهتم</option>
            <option value="عميل">عميل</option>
            <option value="غير مهتم">غير مهتم</option>
          </select>

        </div>

        <div id="crmClients"></div>

      </div>
    `;

    renderClients();
  }


  function renderClients() {
    const box =
      document.getElementById("crmClients");

    if (!box || !window.DXN_CRM) return;


    const search =
      (
        document
          .getElementById("crmSearch")
          ?.value || ""
      )
        .trim()
        .toLowerCase();


    const status =
      document
        .getElementById("crmStatusFilter")
        ?.value || "";


    const clients =
      window.DXN_CRM
        .getClients()
        .filter(client => {

          const text = `
            ${client.name || ""}
            ${client.phone || ""}
            ${client.whatsapp || ""}
            ${client.country || ""}
            ${client.city || ""}
            ${client.interest || ""}
            ${client.product || ""}
          `.toLowerCase();


          const matchesSearch =
            !search ||
            text.includes(search);


          const matchesStatus =
            !status ||
            client.status === status;


          return (
            matchesSearch &&
            matchesStatus
          );

        });


    if (!clients.length) {

      box.innerHTML = `
        <div class="crm-empty">
          👤 لا يوجد عملاء مطابقون حاليًا.
        </div>
      `;

      return;

    }


    box.innerHTML =
      clients
        .map(client => `

          <article class="crm-client">

            <div class="crm-client-top">

              <div>

                <h3>
                  ${escapeHTML(
                    client.name || "بدون اسم"
                  )}
                </h3>

                <small>
                  📞 ${escapeHTML(
                    client.phone || "-"
                  )}
                </small>

              </div>

              <span class="crm-status">
                ${escapeHTML(
                  client.status || "جديد"
                )}
              </span>

            </div>


            <div class="crm-client-info">

              ${
                client.whatsapp
                  ? `
                    <div>
                      💬 واتساب:
                      ${escapeHTML(client.whatsapp)}
                    </div>
                  `
                  : ""
              }

              ${
                client.country
                  ? `
                    <div>
                      🌍 ${escapeHTML(client.country)}
                      ${
                        client.city
                          ? " - " +
                            escapeHTML(client.city)
                          : ""
                      }
                    </div>
                  `
                  : ""
              }

              ${
                client.interest
                  ? `
                    <div>
                      🎯 الاهتمام:
                      ${escapeHTML(client.interest)}
                    </div>
                  `
                  : ""
              }

              ${
                client.product
                  ? `
                    <div>
                      📦 المنتج:
                      ${escapeHTML(client.product)}
                    </div>
                  `
                  : ""
              }

              ${
                client.followUp
                  ? `
                    <div>
                      📅 متابعة:
                      ${escapeHTML(
                        client.followUp
                      )}
                    </div>
                  `
                  : ""
              }

            </div>


            ${
              client.notes
                ? `
                  <div class="crm-notes">
                    📝 ${escapeHTML(
                      client.notes
                    )}
                  </div>
                `
                : ""
            }


            <div class="crm-actions">

              <button
                type="button"
                onclick="window.DXN_CRM_UI.editClient('${client.id}')"
              >
                ✏️ تعديل
              </button>

              <button
                type="button"
                onclick="window.DXN_CRM_UI.deleteClient('${client.id}')"
              >
                🗑️ حذف
              </button>

            </div>

          </article>

        `)
        .join("");
  }


  function showForm(client = null) {
    const box =
      document.getElementById(
        "crmFormBox"
      );

    if (!box) return;


    const isEdit =
      Boolean(client);


    box.innerHTML = `

      <div class="crm-form">

        <div class="crm-form-head">

          <h3>
            ${
              isEdit
                ? "✏️ تعديل بيانات العميل"
                : "➕ إضافة عميل جديد"
            }
          </h3>

          <button
            type="button"
            onclick="window.DXN_CRM_UI.closeForm()"
          >
            ✕
          </button>

        </div>


        <div class="crm-form-grid">

          <input
            id="crmName"
            placeholder="اسم العميل *"
            value="${escapeAttr(
              client?.name || ""
            )}"
          />

          <input
            id="crmPhone"
            placeholder="رقم الهاتف *"
            value="${escapeAttr(
              client?.phone || ""
            )}"
          />

          <input
            id="crmWhatsapp"
            placeholder="رقم واتساب"
            value="${escapeAttr(
              client?.whatsapp || ""
            )}"
          />

          <input
            id="crmCountry"
            placeholder="الدولة"
            value="${escapeAttr(
              client?.country || ""
            )}"
          />

          <input
            id="crmCity"
            placeholder="المدينة"
            value="${escapeAttr(
              client?.city || ""
            )}"
          />

          <select id="crmStatus">

            ${renderStatusOptions(
              client?.status || "جديد"
            )}

          </select>

          <input
            id="crmInterest"
            placeholder="بماذا يهتم؟"
            value="${escapeAttr(
              client?.interest || ""
            )}"
          />

          <input
            id="crmProduct"
            placeholder="المنتج المطلوب"
            value="${escapeAttr(
              client?.product || ""
            )}"
          />

          <input
            id="crmFollowUp"
            type="date"
            value="${escapeAttr(
              client?.followUp || ""
            )}"
          />

        </div>


        <textarea
          id="crmNotes"
          placeholder="ملاحظات عن العميل..."
        >${escapeHTML(
          client?.notes || ""
        )}</textarea>


        <button
          type="button"
          class="crm-save-btn"
          onclick="window.DXN_CRM_UI.saveForm('${
            client?.id || ""
          }')"
        >
          💾 ${
            isEdit
              ? "حفظ التعديلات"
              : "حفظ العميل"
          }
        </button>

      </div>

    `;
  }


  function renderStatusOptions(selected) {

    const statuses = [
      "جديد",
      "تم التواصل",
      "مهتم",
      "عميل",
      "غير مهتم"
    ];


    return statuses
      .map(status => `

        <option
          value="${escapeAttr(status)}"
          ${
            selected === status
              ? "selected"
              : ""
          }
        >
          ${escapeHTML(status)}
        </option>

      `)
      .join("");
  }


  function saveForm(id = "") {

    const name =
      document
        .getElementById("crmName")
        ?.value
        .trim();


    const phone =
      document
        .getElementById("crmPhone")
        ?.value
        .trim();


    if (!name || !phone) {

      alert(
        "يرجى إدخال اسم العميل ورقم الهاتف."
      );

      return;

    }


    const data = {
      name,
      phone,

      whatsapp:
        document
          .getElementById("crmWhatsapp")
          ?.value
          .trim() || phone,

      country:
        document
          .getElementById("crmCountry")
          ?.value
          .trim() || "",

      city:
        document
          .getElementById("crmCity")
          ?.value
          .trim() || "",

      status:
        document
          .getElementById("crmStatus")
          ?.value || "جديد",

      interest:
        document
          .getElementById("crmInterest")
          ?.value
          .trim() || "",

      product:
        document
          .getElementById("crmProduct")
          ?.value
          .trim() || "",

      followUp:
        document
          .getElementById("crmFollowUp")
          ?.value || "",

      notes:
        document
          .getElementById("crmNotes")
          ?.value
          .trim() || ""
    };


    if (id) {

      window.DXN_CRM.updateClient(
        id,
        data
      );

    } else {

      window.DXN_CRM.createClient(
        data
      );

    }


    closeForm();
    renderCRM();
  }


  function closeForm() {

    const box =
      document.getElementById(
        "crmFormBox"
      );

    if (box) {

      box.innerHTML = "";

    }
  }


  function editClient(id) {

    const client =
      window.DXN_CRM
        .getClients()
        .find(
          item =>
            item.id === id
        );


    if (client) {

      showForm(client);

      document
        .getElementById("crmFormBox")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

    }
  }


  function deleteClient(id) {

    const client =
      window.DXN_CRM
        .getClients()
        .find(
          item =>
            item.id === id
        );


    if (!client) return;


    const confirmed =
      confirm(
        `هل تريد حذف العميل: ${client.name} ؟`
      );


    if (!confirmed) return;


    window.DXN_CRM.deleteClient(id);

    renderCRM();
  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function escapeAttr(value) {
    return escapeHTML(value);
  }


  window.DXN_CRM_UI = {
    renderCRM,
    renderClients,
    showForm,
    saveForm,
    closeForm,
    editClient,
    deleteClient
  };


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      if (
        document.getElementById("crm")
      ) {

        renderCRM();

      }

    }
  );

})();

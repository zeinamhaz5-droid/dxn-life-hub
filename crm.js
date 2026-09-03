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

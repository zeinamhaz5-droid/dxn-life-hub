const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

app.use(express.static("."));

/* =========================
   إعداد Gemini
========================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = "gemini-2.5-flash";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY غير موجود في Environment Variables");
} else {
  console.log("✅ GEMINI_API_KEY موجود");
}

/* =========================
   تحميل قاعدة بيانات المنتجات
========================= */

let knowledgeBase = {
  products: []
};

try {
  const filePath = path.join(
    __dirname,
    "knowledge_base.json"
  );

  const data = fs.readFileSync(
    filePath,
    "utf8"
  );

  knowledgeBase = JSON.parse(data);

  console.log(
    `✅ تم تحميل ${
      knowledgeBase.products?.length || 0
    } منتج`
  );

} catch (error) {

  console.error(
    "❌ تعذر تحميل knowledge_base.json:",
    error
  );

}

/* =========================
   نقطة اتصال الوكيل الذكي
========================= */

app.post("/ask", async (req, res) => {

  try {

    console.log("=================================");
    console.log("🤖 GEMINI AI AGENT");
    console.log("=================================");

    /* =========================
       التحقق من المفتاح
    ========================= */

    if (!GEMINI_API_KEY) {

      console.error(
        "❌ GEMINI_API_KEY غير موجود"
      );

      return res.status(500).json({
        error:
          "مفتاح Gemini غير موجود في إعدادات الخادم."
      });

    }

    /* =========================
       قراءة السؤال
    ========================= */

    const question = String(
      req.body.question || ""
    ).trim();

    console.log(
      "السؤال:",
      question
    );

    if (!question) {

      return res.status(400).json({
        error: "اكتب السؤال أولاً"
      });

    }

    /* =========================
       تجهيز المنتجات
    ========================= */

    const products =
      knowledgeBase.products || [];

    const productData =
      products.map(product => ({

        name_ar:
          product.name_ar || "",

        catalog_name:
          product.catalog_name || "",

        category:
          product.category || "",

        price_non_member:
          product.price_non_member ?? null,

        general_info:
          product.general_info || "",

        verification_status:
          product.verification_status || "",

        information_source:
          product.information_source || ""

      }));

    /* =========================
       تعليمات الوكيل
    ========================= */

    const systemInstruction = `
أنت الوكيل الذكي لمشروع DXN Life Hub.

مهمتك مساعدة المستخدم باللغة العربية الواضحة والبسيطة.

قواعد مهمة جدًا:

1. استخدم قاعدة بيانات المنتجات الموجودة في الطلب.
2. عند السؤال عن منتج، اعتمد على المعلومات الموجودة في قاعدة البيانات.
3. عند السؤال عن السعر، استخدم السعر الموجود في قاعدة البيانات فقط.
4. لا تخترع أي سعر.
5. لا تخترع معلومات عن المنتجات.
6. إذا لم تجد المعلومة في قاعدة البيانات، قل بوضوح:
"هذه المعلومة غير متوفرة حاليًا في قاعدة البيانات."
7. لا تقدم تشخيصًا طبيًا.
8. لا تقدم وصفات علاجية.
9. لا تقل إن أي منتج يعالج مرضًا.
10. لا تقدم وعودًا بأرباح مضمونة.
11. عند السؤال عن العمل في DXN، قدم معلومات عامة فقط دون ضمان الأرباح.
12. كن مفيدًا ومختصرًا وواضحًا.
13. أجب باللغة العربية.
14. لا تقل للمستخدم إنك OpenAI.
15. عرّف نفسك عند الحاجة باسم:
"وكيل DXN Life Hub الذكي".
16. إذا كان السؤال خارج نطاق DXN Life Hub، يمكنك الرد باختصار ثم توضيح أنك متخصص في مساعدة المستخدم بخصوص المشروع والمنتجات.

قاعدة بيانات المنتجات:

${JSON.stringify(
  productData,
  null,
  2
)}
`;

    /* =========================
       إرسال الطلب إلى Gemini
    ========================= */

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY
      )}`;

    console.log(
      "📡 إرسال الطلب إلى Gemini..."
    );

    const response = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          systemInstruction: {
            parts: [
              {
                text:
                  systemInstruction
              }
            ]
          },

          contents: [
            {
              role: "user",

              parts: [
                {
                  text: question
                }
              ]
            }
          ],

          generationConfig: {

            temperature: 0.3,

            maxOutputTokens: 700

          }

        })
      }
    );

    console.log(
      "📥 Gemini status:",
      response.status,
      response.statusText
    );

    /* =========================
       قراءة رد Gemini
    ========================= */

    const data =
      await response.json();

    console.log(
      "📦 Gemini response received"
    );

    /* =========================
       معالجة الخطأ
    ========================= */

    if (!response.ok) {

      console.error(
        "❌ Gemini API Error:",
        JSON.stringify(
          data,
          null,
          2
        )
      );

      const message =
        data?.error?.message ||
        "حدث خطأ أثناء الاتصال بـ Gemini.";

      return res.status(
        response.status
      ).json({
        error: message
      });

    }

    /* =========================
       استخراج الإجابة
    ========================= */

    const answer =
      data?.candidates?.[0]
        ?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {

      console.error(
        "❌ Gemini لم يرجع نصًا."
      );

      return res.status(500).json({
        error:
          "وصل رد من Gemini ولكن لم تصل إجابة نصية."
      });

    }

    console.log(
      "✅ وصلت إجابة Gemini"
    );

    console.log(
      "الإجابة:",
      answer
    );

    /* =========================
       إرسال الإجابة للموقع
    ========================= */

    res.json({
      answer: answer
    });

  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "❌ GEMINI AI AGENT ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    res.status(500).json({
      error:
        "حدث خطأ أثناء الاتصال بالوكيل الذكي."
    });

  }

});

/* =========================
   تشغيل الخادم
========================= */

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      `🚀 DXN Life Hub server running on port ${PORT}`
    );

    console.log(
      `🤖 AI Provider: Gemini`
    );

    console.log(
      `🧠 Model: ${GEMINI_MODEL}`
    );

  }
);

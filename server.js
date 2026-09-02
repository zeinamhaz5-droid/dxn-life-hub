const express = require("express");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("."));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// تحميل قاعدة بيانات المنتجات
let knowledgeBase = {
  products: []
};

try {
  const filePath = path.join(__dirname, "knowledge_base.json");
  const data = fs.readFileSync(filePath, "utf8");
  knowledgeBase = JSON.parse(data);

  console.log(
    `تم تحميل ${knowledgeBase.products?.length || 0} منتج`
  );
} catch (error) {
  console.error("تعذر تحميل knowledge_base.json:", error);
}

// نقطة اتصال الوكيل الذكي
app.post("/ask", async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "اكتب السؤال أولاً"
      });
    }

    const products = knowledgeBase.products || [];

    // تجهيز معلومات المنتجات للوكيل
    const productData = products.map(product => ({
      name_ar: product.name_ar || "",
      catalog_name: product.catalog_name || "",
      category: product.category || "",
      price_non_member: product.price_non_member ?? null,
      general_info: product.general_info || "",
      verification_status:
        product.verification_status || "",
      information_source:
        product.information_source || ""
    }));

    const response = await client.responses.create({
      model: "gpt-5-mini",

      input: `
أنت الوكيل الذكي الرسمي لمشروع DXN Life Hub.

مهمتك:
- الإجابة باللغة العربية الواضحة والبسيطة.
- مساعدة المستخدم في فهم منتجات DXN والمعلومات الموجودة في قاعدة البيانات.
- عند السؤال عن منتج، استخدم المعلومات الموجودة في قاعدة البيانات.
- عند السؤال عن السعر، استخدم السعر الموجود في قاعدة البيانات فقط.
- لا تخترع أسعارًا أو معلومات غير موجودة.
- إذا لم تجد المعلومة، قل بوضوح إنها غير متوفرة في قاعدة البيانات.
- لا تقدم تشخيصًا طبيًا.
- لا تقدم وصفات علاجية.
- لا تدّعي أن أي منتج يعالج مرضًا.
- لا تقدم وعودًا بأرباح مضمونة.
- إذا سأل المستخدم عن فرصة العمل، قدم المعلومات العامة دون ضمان أرباح.
- كن مفيدًا ومختصرًا وواضحًا.
- إذا كان السؤال غير متعلق بالمشروع، يمكنك الإجابة باختصار ثم توضيح نطاق مساعدتك.

قاعدة بيانات المنتجات:

${JSON.stringify(productData, null, 2)}

سؤال المستخدم:
${question}
      `
    });

    res.json({
      answer: response.output_text
    });

  } catch (error) {
    console.error("OpenAI Error:", error);

    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالوكيل الذكي"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`DXN Life Hub server running on port ${PORT}`);
});

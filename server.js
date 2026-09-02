const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());
app.use(express.static("."));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/ask", async (req, res) => {
  try {
    const question = req.body.question;

    if (!question) {
      return res.status(400).json({
        error: "اكتب السؤال أولاً"
      });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: `
أنت وكيل ذكي لمشروع DXN Life Hub.
أجب باللغة العربية بطريقة واضحة وبسيطة.
اعتمد على معلومات المشروع عند توفرها.
لا تقدم وعودًا بأرباح مضمونة.
لا تقدم تشخيصًا طبيًا أو وصفات علاجية.

سؤال المستخدم:
${question}
      `
    });

    res.json({
      answer: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

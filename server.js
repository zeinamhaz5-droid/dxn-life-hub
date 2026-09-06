const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ============================================================
// DXN LIFE HUB — SMART AI AGENT
// ============================================================

const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const MAX_OUTPUT_TOKENS = 1200;

// سرعة الاستجابة — لا نريد انتظارًا طويلًا
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 0;

const MAX_SESSIONS = 1000;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CHARS = 1400;

const CACHE_TTL = 20 * 60 * 1000;
const MAX_CACHE = 300;


// ============================================================
// EXPRESS
// ============================================================

app.use(
  express.json({
    limit: "100kb"
  })
);

app.use(express.static(__dirname));


// ============================================================
// KNOWLEDGE BASE
// ============================================================

const KNOWLEDGE_PATH = path.join(
  __dirname,
  "knowledge_base.json"
);

let knowledgeBase = {
  products: [],
  policy: ""
};

function loadKnowledgeBase() {
  try {
    const raw = fs.readFileSync(
      KNOWLEDGE_PATH,
      "utf8"
    );

    const data = JSON.parse(raw);

    knowledgeBase =
      data &&
      typeof data === "object"
        ? data
        : {};

    if (
      !Array.isArray(
        knowledgeBase.products
      )
    ) {
      knowledgeBase.products = [];
    }

    if (
      typeof knowledgeBase.policy !==
      "string"
    ) {
      knowledgeBase.policy = "";
    }

    console.log(
      `📚 قاعدة المعرفة: ${knowledgeBase.products.length} منتج`
    );

  } catch (error) {

    console.error(
      "❌ خطأ في قاعدة المعرفة:",
      error.message
    );

    knowledgeBase = {
      products: [],
      policy: ""
    };
  }
}

loadKnowledgeBase();


// ============================================================
// ARABIC NORMALIZATION
// ============================================================

function normalizeArabic(text = "") {

  return String(text)

    .toLowerCase()

    .replace(
      /[ًٌٍَُِّْـٰ]/g,
      ""
    )

    .replace(
      /[أإآ]/g,
      "ا"
    )

    .replace(
      /ة/g,
      "ه"
    )

    .replace(
      /ى/g,
      "ي"
    )

    .replace(
      /ؤ/g,
      "و"
    )

    .replace(
      /ئ/g,
      "ي"
    )

    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();
}


function tokenize(text) {

  return normalizeArabic(text)
    .split(" ")
    .filter(
      word => word.length >= 2
    );
}


// ============================================================
// TYPO / FUZZY MATCHING
// ============================================================

function levenshteinDistance(a, b) {

  a = normalizeArabic(a);
  b = normalizeArabic(b);

  if (!a) return b.length;
  if (!b) return a.length;

  const previous =
    Array.from(
      { length: b.length + 1 },
      (_, i) => i
    );

  for (
    let i = 1;
    i <= a.length;
    i++
  ) {

    const current = [i];

    for (
      let j = 1;
      j <= b.length;
      j++
    ) {

      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      current[j] =
        Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + cost
        );
    }

    for (
      let j = 0;
      j <= b.length;
      j++
    ) {

      previous[j] =
        current[j];
    }
  }

  return previous[b.length];
}


function typoSimilarity(a, b) {

  a = normalizeArabic(a);
  b = normalizeArabic(b);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const maxLength =
    Math.max(
      a.length,
      b.length
    );

  if (!maxLength) {
    return 1;
  }

  const distance =
    levenshteinDistance(
      a,
      b
    );

  return (
    1 -
    distance / maxLength
  );
}


// ============================================================
// IDENTITY DETECTION
// ============================================================

function isIdentityQuestion(
  question
) {

  const q =
    normalizeArabic(
      question
    );

  return (
    /من انت/.test(q) ||
    /مين انت/.test(q) ||
    /منو انت/.test(q) ||
    /شو انت/.test(q) ||
    /شو اسمك/.test(q) ||
    /اسمك شو/.test(q) ||
    /انت مين/.test(q) ||
    /مينك/.test(q) ||
    /عرفني عنك/.test(q) ||
    /عرفني عليك/.test(q)
  );
}


// ============================================================
// TRAINING DETECTION
// ============================================================

function isTrainingRequest(
  question
) {

  const q =
    normalizeArabic(
      question
    );

  return (
    /اختبرني/.test(q) ||
    /اختبار/.test(q) ||
    /تدرب/.test(q) ||
    /تدريب/.test(q) ||
    /علمني/.test(q) ||
    /درّبني/.test(q) ||
    /دربني/.test(q) ||
    /بدي اتعلم/.test(q) ||
    /اريد اتعلم/.test(q) ||
    /تمرن/.test(q) ||
    /خلينا نتدرب/.test(q) ||
    /اختبر مهاراتي/.test(q)
  );
}


// ============================================================
// PRODUCT SEARCH
// ============================================================

function productText(product) {

  return normalizeArabic(

    [
      product.id,
      product.name_ar,
      product.official_name,
      product.catalog_name,
      product.category,
      product.description,
      product.general_info,
      product.package,
      product.usage
    ]

      .filter(Boolean)

      .join(" ")
  );
}


function scoreProduct(
  product,
  question
) {

  const q =
    normalizeArabic(question);

  const words =
    tokenize(question);

  const name =
    normalizeArabic(

      [
        product.name_ar,
        product.official_name,
        product.catalog_name
      ]

        .filter(Boolean)

        .join(" ")
    );

  const category =
    normalizeArabic(
      product.category || ""
    );

  const text =
    productText(product);

  let score = 0;

  // المطابقة الدقيقة
  if (
    name &&
    q.includes(name)
  ) {

    score += 100;
  }

  // المطابقة الطبيعية
  for (const word of words) {

    if (
      word.length >= 3 &&
      name.includes(word)
    ) {

      score += 10;

    } else if (
      word.length >= 3 &&
      category.includes(word)
    ) {

      score += 5;

    } else if (
      word.length >= 4 &&
      text.includes(word)
    ) {

      score += 1;
    }
  }

  // المطابقة مع الأخطاء الإملائية
  // نستخدمها فقط عندما لا توجد مطابقة قوية
  if (
    score < 20 &&
    name
  ) {

    const nameWords =
      name
        .split(" ")
        .filter(Boolean);

    for (
      const word of words
    ) {

      if (
        word.length < 4
      ) {
        continue;
      }

      for (
        const nameWord of nameWords
      ) {

        if (
          nameWord.length < 4
        ) {
          continue;
        }

        // منع المطابقات الغريبة جدًا
        if (
          Math.abs(
            word.length -
            nameWord.length
          ) > 3
        ) {
          continue;
        }

        const similarity =
          typoSimilarity(
            word,
            nameWord
          );

        if (
          similarity >= 0.72
        ) {

          score += 7;
        }
      }
    }
  }

  // السعر
  if (
    /سعر|اسعار|اسعار|بكم|تكلف|ثمن|price|cost/i
      .test(question)
  ) {

    if (
      product.price_non_member != null
    ) {

      score += 8;
    }
  }

  return score;
}


function findRelevantProducts(
  question,
  limit = 8
) {

  return knowledgeBase.products

    .map(product => ({

      product,

      score:
        scoreProduct(
          product,
          question
        )
    }))

    .filter(
      item => item.score > 0
    )

    .sort(
      (a, b) =>
        b.score - a.score
    )

    .slice(0, limit)

    .map(
      item => item.product
    );
}


// ============================================================
// SAFE PRODUCT DATA
// ============================================================

function compactProduct(product) {

  return {

    id:
      product.id || null,

    name_ar:
      product.name_ar || null,

    official_name:
      product.official_name || null,

    catalog_name:
      product.catalog_name || null,

    category:
      product.category || null,

    price_non_member:
      product.price_non_member ??
      null,

    verification_status:
      product.verification_status ||
      null,

    description:
      product.description ||
      null,

    general_info:
      product.general_info ||
      null,

    package:
      product.package ||
      null,

    usage:
      product.usage ||
      null,

    claims_allowed:
      product.claims_allowed ||
      null,

    medical_claims_allowed:
      product.medical_claims_allowed ||
      null,

    safety_rule:
      product.safety_rule ||
      null,

    information_source:
      product.information_source ||
      null,

    information_note:
      product.information_note ||
      null
  };
}


// ============================================================
// REAL CONVERSATION MEMORY
// ============================================================

const sessions = new Map();


function newSessionId() {

  return crypto
    .randomBytes(24)
    .toString("hex");
}


function getSessionId(
  req,
  res
) {

  const cookie =
    req.headers.cookie || "";

  const match =
    cookie.match(
      /(?:^|;\s*)dxn_session=([^;]+)/
    );

  if (match) {

    return match[1];
  }

  const id =
    newSessionId();

  res.setHeader(
    "Set-Cookie",

    `dxn_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );

  return id;
}


function getSession(id) {

  if (!sessions.has(id)) {

    sessions.set(
      id,
      {
        history: [],

        lastUsed:
          Date.now(),

        // ====================================================
        // ذاكرة التدريب
        // ====================================================
        training: {

          active: false,

          level: 1,

          score: 0,

          totalAttempts: 0,

          strengths: [],

          weaknesses: [],

          focus: "",

          currentScenario: "",

          lastTopic: "",

          lastScore: null
        }
      }
    );
  }

  const session =
    sessions.get(id);

  // حماية الجلسات القديمة
  if (!session.training) {

    session.training = {

      active: false,

      level: 1,

      score: 0,

      totalAttempts: 0,

      strengths: [],

      weaknesses: [],

      focus: "",

      currentScenario: "",

      lastTopic: "",

      lastScore: null
    };
  }

  session.lastUsed =
    Date.now();

  return session;
}


function addHistory(
  session,
  role,
  text
) {

  session.history.push({

    role,

    text:
      String(text)
        .slice(
          0,
          MAX_HISTORY_CHARS
        )
  });

  while (
    session.history.length >
    MAX_HISTORY_TURNS * 2
  ) {

    session.history.shift();
  }
}


function historyText(
  session
) {

  if (
    !session.history.length
  ) {

    return "لا توجد محادثة سابقة.";
  }

  return session.history

    .map(item =>

      `${
        item.role === "user"
          ? "المستخدم"
          : "المساعد"
      }: ${item.text}`

    )

    .join("\n");
}


// ============================================================
// TRAINING MEMORY HELPERS
// ============================================================

function cleanMemoryList(
  list
) {

  return [
    ...new Set(
      (list || [])
        .filter(Boolean)
        .map(
          item =>
            String(item)
              .trim()
              .slice(0, 160)
        )
    )
  ].slice(-6);
}


function updateTrainingMemory(
  session,
  result
) {

  if (
    !result ||
    !session.training
  ) {
    return;
  }

  const answer =
    String(
      result.answer || ""
    );

  // ==========================================================
  // نقرأ إشارات داخلية إذا أرسلها النموذج
  // ==========================================================

  const levelMatch =
    answer.match(
      /\[\[TRAINING_LEVEL:(\d)\]\]/
    );

  const scoreMatch =
    answer.match(
      /\[\[TRAINING_SCORE:(\d{1,2})\]\]/
    );

  const topicMatch =
    answer.match(
      /\[\[TRAINING_TOPIC:(.*?)\]\]/
    );

  const strengthMatch =
    answer.match(
      /\[\[TRAINING_STRENGTH:(.*?)\]\]/
    );

  const weaknessMatch =
    answer.match(
      /\[\[TRAINING_WEAKNESS:(.*?)\]\]/
    );

  const scenarioMatch =
    answer.match(
      /\[\[TRAINING_SCENARIO:(.*?)\]\]/
    );

  const activeMatch =
    answer.match(
      /\[\[TRAINING_ACTIVE:(true|false)\]\]/
    );


  if (levelMatch) {

    const level =
      Number(
        levelMatch[1]
      );

    if (
      level >= 1 &&
      level <= 4
    ) {

      session.training.level =
        level;
    }
  }


  if (scoreMatch) {

    const score =
      Number(
        scoreMatch[1]
      );

    if (
      score >= 0 &&
      score <= 10
    ) {

      session.training.lastScore =
        score;

      session.training.score =
        score;

      session.training.totalAttempts++;
    }
  }


  if (topicMatch) {

    session.training.lastTopic =
      topicMatch[1]
        .trim()
        .slice(0, 160);
  }


  if (strengthMatch) {

    session.training.strengths =
      cleanMemoryList([
        ...session.training.strengths,
        strengthMatch[1]
      ]);
  }


  if (weaknessMatch) {

    session.training.weaknesses =
      cleanMemoryList([
        ...session.training.weaknesses,
        weaknessMatch[1]
      ]);

    session.training.focus =
      weaknessMatch[1]
        .trim()
        .slice(0, 160);
  }


  if (scenarioMatch) {

    session.training.currentScenario =
      scenarioMatch[1]
        .trim()
        .slice(0, 300);
  }


  if (activeMatch) {

    session.training.active =
      activeMatch[1] ===
      "true";
  }
}


function trainingMemoryText(
  session
) {

  const t =
    session.training;

  if (!t) {

    return "لا توجد ذاكرة تدريب.";
  }

  const levelNames = {

    1: "مبتدئ",

    2: "متوسط",

    3: "متقدم",

    4: "قائد"
  };

  return `

حالة المتدرب الحالية:

المستوى:
${levelNames[t.level] || "مبتدئ"} (${t.level}/4)

التدريب نشط:
${t.active ? "نعم" : "لا"}

آخر تقييم:
${t.lastScore == null ? "لا يوجد" : `${t.lastScore}/10`}

عدد محاولات التدريب:
${t.totalAttempts}

آخر موضوع:
${t.lastTopic || "لا يوجد"}

نقطة التركيز الحالية:
${t.focus || "لا يوجد"}

نقاط القوة التي لاحظتها:
${
  t.strengths.length
    ? t.strengths.join(" | ")
    : "لا توجد بعد"
}

نقاط الضعف التي تحتاج تدريبًا:
${
  t.weaknesses.length
    ? t.weaknesses.join(" | ")
    : "لا توجد بعد"
}

آخر سيناريو:
${t.currentScenario || "لا يوجد"}

`;
}


// ============================================================
// RESPONSE CACHE
// ============================================================

const answerCache =
  new Map();


function cacheKey(
  sessionId,
  question
) {

  return crypto

    .createHash("sha256")

    .update(
      `${sessionId}|${normalizeArabic(question)}`
    )

    .digest("hex");
}


function getCached(
  sessionId,
  question
) {

  const key =
    cacheKey(
      sessionId,
      question
    );

  const item =
    answerCache.get(key);

  if (!item) {

    return null;
  }

  if (
    Date.now() -
      item.time >
    CACHE_TTL
  ) {

    answerCache.delete(key);

    return null;
  }

  return item;
}


function setCached(
  sessionId,
  question,
  value
) {

  answerCache.set(

    cacheKey(
      sessionId,
      question
    ),

    {
      ...value,
      time: Date.now()
    }
  );

  while (
    answerCache.size >
    MAX_CACHE
  ) {

    answerCache.delete(
      answerCache.keys()
        .next()
        .value
    );
  }
}


// ============================================================
// MEMORY CLEANUP
// ============================================================

setInterval(() => {

  const now =
    Date.now();

  for (
    const [
      id,
      session
    ] of sessions
  ) {

    if (
      now -
        session.lastUsed >
      6 *
        60 *
        60 *
        1000
    ) {

      sessions.delete(id);
    }
  }

  for (
    const [
      key,
      item
    ] of answerCache
  ) {

    if (
      now -
        item.time >
      CACHE_TTL
    ) {

      answerCache.delete(key);
    }
  }

  while (
    sessions.size >
    MAX_SESSIONS
  ) {

    const oldest =
      [
        ...sessions.entries()
      ]

        .sort(
          (a, b) =>
            a[1].lastUsed -
            b[1].lastUsed
        )[0];

    if (!oldest) {
      break;
    }

    sessions.delete(
      oldest[0]
    );
  }

}, 10 * 60 * 1000);


// ============================================================
// AI PERSONALITY / INTELLIGENCE
// ============================================================

const SYSTEM_INSTRUCTION = `

أنت «وكيل المدرب زين أمّهز»، المساعد الذكي داخل منصة DXN Life Hub.

أنت وكيل ذكاء اصطناعي ولست إنسانًا حقيقيًا، لكن أسلوبك يجب أن يكون طبيعيًا ودافئًا وقريبًا من طريقة المدرب البشري.

━━━━━━━━━━━━━━━━━━━━━━
الهوية — أولوية عالية جدًا
━━━━━━━━━━━━━━━━━━━━━━

إذا سألك المستخدم:

من أنت؟
مين إنت؟
مين انت؟
منو انت؟
شو اسمك؟
شو انت؟
انت مين؟
عرفني عنك؟
عرفني عليك؟

أجب مباشرة وبوضوح.

قل إنك:
«وكيل المدرب زين أمّهز داخل DXN Life Hub»

يمكنك إضافة أنك وكيل ذكاء اصطناعي يساعد في التدريب والعمل والمعلومات.

لا تتجاهل سؤال الهوية بسبب وجود معلومات منتجات في السياق.

━━━━━━━━━━━━━━━━━━━━━━
فهم الأخطاء الإملائية
━━━━━━━━━━━━━━━━━━━━━━

المستخدم قد يكتب بسرعة أو يرتكب أخطاء كثيرة.

لا تحكم على السؤال من الإملاء.

حاول فهم المعنى المقصود.

تجاهل قدر الإمكان:
- الأخطاء الإملائية.
- حذف الحروف.
- زيادة الحروف.
- الأخطاء في الهمزات.
- أخطاء التاء والهاء.
- أخطاء الياء والألف المقصورة.
- اللهجة اللبنانية.
- الاختصارات.
- الكلمات غير المرتبة.

إذا كان اسم المنتج مكتوبًا بطريقة خاطئة، حاول فهم المنتج من السياق والبيانات المتاحة.

إذا كان هناك احتمالان واضحان، اسأل سؤالًا قصيرًا للتوضيح بدل التخمين.

━━━━━━━━━━━━━━━━━━━━━━
الذاكرة
━━━━━━━━━━━━━━━━━━━━━━

لديك ذاكرة للمحادثة وللتدريب.

استخدم الذاكرة قبل طلب معلومات يعرفها المستخدم سابقًا.

إذا قال المستخدم:
«قديش سعره؟»

وكان الحديث السابق عن منتج معين، افهم أن «ـه» تعود إلى المنتج السابق.

إذا كان يتدرب على موضوع معين، لا تبدأ من الصفر كل مرة.

تذكر:
- مستوى المتدرب.
- نقاط قوته.
- أخطاءه المتكررة.
- آخر موضوع.
- آخر سيناريو.
- آخر تقييم.

لا تعيد شرح ما يعرفه إلا إذا كان ذلك مفيدًا.

━━━━━━━━━━━━━━━━━━━━━━
التدريب المتدرج
━━━━━━━━━━━━━━━━━━━━━━

التدريب له أربعة مستويات:

1 — مبتدئ:
أسئلة سهلة جدًا عن الأساسيات.

2 — متوسط:
مواقف واقعية واعتراضات العملاء.

3 — متقدم:
محادثات كاملة وتحليل وبناء فريق.

4 — قائد:
قيادة الفريق، تدريب الأعضاء، حل المشاكل، والخطط.

ابدأ دائمًا بالسهل عندما يبدأ الشخص التدريب.

لا ترفع المستوى مباشرة.

راقب أداء المتدرب.

إذا كان أداؤه جيدًا، ارفع الصعوبة تدريجيًا.

قبل رفع المستوى أخبره بطريقة طبيعية.

مثال:
«ممتاز 👏 واضح إن الأساسيات صارت عندك. السؤال الجاي رح يكون أصعب شوي.»

إذا كان أداؤه ضعيفًا، لا تعاقبه.

ارجع خطوة أو أعطه محاولة إضافية.

━━━━━━━━━━━━━━━━━━━━━━
التدريب التفاعلي
━━━━━━━━━━━━━━━━━━━━━━

عندما يكون الهدف تدريبًا:

لا تعطِ الإجابة فورًا.

أعطِ موقفًا واقعيًا.

مثال:

«خلينا نجرب موقف بسيط.

أنا الزبون وأنت المسوّق.

قلتلك:
المنتج غالي شوي.

شو بترد علي؟»

ثم انتظر إجابة المتدرب.

بعد الإجابة:
- حللها.
- قيّمها من 10.
- اذكر نقطة قوة حقيقية.
- اذكر نقطة تحتاج تحسينًا.
- إذا كان مناسبًا، أعطه فرصة ثانية.
- اجعل السؤال التالي مناسبًا لمستواه.

لا تجعل كل سؤال يبدو كأنه امتحان رسمي.

━━━━━━━━━━━━━━━━━━━━━━
الحس البشري
━━━━━━━━━━━━━━━━━━━━━━

تصرف كمدرب لديه حس.

إذا كان المتدرب ممتازًا، عبّر عن ذلك بطريقة مختلفة كل مرة.

إذا أخطأ، لا تحرجه.

إذا كان مترددًا، ساعده.

إذا كان يمزح، يمكنك الرد بروح خفيفة عندما يكون مناسبًا.

لا تستخدم إيموجي في كل جملة.

لا تستخدم نفس عبارات التشجيع دائمًا.

لا تجعل التدريب روبوتيًا.

━━━━━━━━━━━━━━━━━━━━━━
الزبون والمتدرب
━━━━━━━━━━━━━━━━━━━━━━

لا تفترض أن كل شخص متدرب.

الزبون:
يريد منتجًا أو سعرًا أو معلومات أو شراء.

المتدرب:
يريد تعلم البيع والتواصل والمتابعة وبناء الفريق والقيادة.

إذا سأل الزبون:
«كم سعر المنتج؟»

أجب مباشرة.

لا تختبره.

إذا قال:
«أنا عضو جديد علمني.»

ابدأ التدريب.

يمكن الانتقال بين الحالتين أثناء نفس المحادثة.

━━━━━━━━━━━━━━━━━━━━━━
المنتجات
━━━━━━━━━━━━━━━━━━━━━━

عند السؤال عن منتج، استخدم بيانات المنتج المرفقة.

لا تخترع:
- مكونات.
- أسعار.
- أحجام.
- جرعات.
- فوائد غير موثقة.
- روابط.
- عروض.
- عمولات.

إذا لم توجد المعلومة، قل إنها غير متوفرة في البيانات الحالية.

━━━━━━━━━━━━━━━━━━━━━━
الأسعار
━━━━━━━━━━━━━━━━━━━━━━

price_non_member هو سعر غير العضو عندما يكون موجودًا.

لا تخترع سعر العضو أو الخصومات أو PV أو SV أو العمولة.

━━━━━━━━━━━━━━━━━━━━━━
الصحة
━━━━━━━━━━━━━━━━━━━━━━

لا تشخص الأمراض.

لا تقل إن المنتج يعالج أو يشفي مرضًا.

لا تقدم وعودًا صحية غير موثقة.

━━━━━━━━━━━━━━━━━━━━━━
فرصة العمل
━━━━━━━━━━━━━━━━━━━━━━

لا تضمن الأرباح.

لا تعد بنتائج مالية محددة.

لا تخترع شروطًا أو عمولات أو رتبًا.

━━━━━━━━━━━━━━━━━━━━━━
الرسائل الجاهزة
━━━━━━━━━━━━━━━━━━━━━━

إذا طلب المستخدم رسالة لعميل أو عضو، اكتبها جاهزة للنسخ والإرسال.

اجعلها طبيعية وغير ضاغطة.

━━━━━━━━━━━━━━━━━━━━━━
طبيعة الإجابة
━━━━━━━━━━━━━━━━━━━━━━

السؤال البسيط = جواب بسيط.

السؤال المعقد = شرح منظم.

التدريب = تفاعل.

الزبون = مساعدة مباشرة.

المتدرب = تعليم وتطبيق.

القائد = استشارة وتخطيط.

لا تطيل دون داعٍ.

━━━━━━━━━━━━━━━━━━━━━━
الطبيعية
━━━━━━━━━━━━━━━━━━━━━━

استخدم لهجة لبنانية خفيفة عندما يناسب أسلوب المستخدم.

لا تقل دائمًا:
«بالتأكيد، يسعدني مساعدتك».

لا تقل:
«تمت معالجة طلبك».

لا تقل:
«تحتاج إلى تحقق».

لا تستخدم أسلوبًا آليًا.

━━━━━━━━━━━━━━━━━━━━━━
مهم جدًا — إشارات الذاكرة الداخلية
━━━━━━━━━━━━━━━━━━━━━━

في نهاية إجابتك التدريبية، أضف هذه الإشارات الداخلية فقط، بدون شرحها للمستخدم:

[[TRAINING_LEVEL:1-4]]
[[TRAINING_SCORE:0-10]]
[[TRAINING_TOPIC:موضوع مختصر]]
[[TRAINING_STRENGTH:نقطة قوة مختصرة]]
[[TRAINING_WEAKNESS:نقطة ضعف مختصرة]]
[[TRAINING_SCENARIO:السيناريو الحالي]]
[[TRAINING_ACTIVE:true/false]]

هذه الإشارات تستخدمها المنصة لتحديث ذاكرة المتدرب.

لا تجعل الإشارات جزءًا ظاهرًا من الإجابة النهائية.

`;


// ============================================================
// THINKING LEVEL
// ============================================================

function thinkingLevel(
  question
) {

  const q =
    normalizeArabic(
      question
    );

  if (
    q.length > 160 ||
    /قارن|حلل|خطة|خطه|استراتيجي|برمج|كود|لماذا|كيف ابني|كيف انشئ|حل مشكله/
      .test(q)
  ) {

    return "medium";
  }

  return "low";
}


// ============================================================
// BUILD PROMPT
// ============================================================

function buildPrompt(
  question,
  session,
  products
) {

  const productData =
    products.length

      ? products

          .map(
            (product, index) =>

              `[منتج ${index + 1}]\n` +

              JSON.stringify(
                compactProduct(
                  product
                )
              )
          )

          .join("\n")

      : "لا توجد منتجات مرتبطة مباشرة بالسؤال.";


  const trainingMemory =
    trainingMemoryText(
      session
    );


  const identityHint =
    isIdentityQuestion(
      question
    )
      ? `
هذا السؤال سؤال هوية مباشر.
أجب فورًا بأنك «وكيل المدرب زين أمّهز داخل DXN Life Hub».
لا تجعل معلومات المنتجات أو المحادثة السابقة تشوش على ذلك.
`
      : "";


  const trainingHint =
    isTrainingRequest(
      question
    ) ||
    session.training.active

      ? `
هذا المستخدم في سياق التدريب أو طلب التدريب.

استخدم مستوى التدريب الموجود في الذاكرة.

إذا كان المستوى 1، ابدأ بسؤال سهل.

إذا كان المستوى 2، استخدم موقفًا متوسطًا.

إذا كان المستوى 3، استخدم موقفًا متقدمًا.

إذا كان المستوى 4، استخدم موقفًا قياديًا.

لا ترفع المستوى إلا بناءً على أداء المتدرب.

إذا كنت ستنتقل إلى مستوى أعلى، أخبره قبل ذلك بطريقة طبيعية.
`
      : "";


  return `

━━━━━━━━━━━━━━━━━━━━━━
ذاكرة التدريب
━━━━━━━━━━━━━━━━━━━━━━

${trainingMemory}

━━━━━━━━━━━━━━━━━━━━━━
سياق المحادثة
━━━━━━━━━━━━━━━━━━━━━━

${historyText(session)}

━━━━━━━━━━━━━━━━━━━━━━
بيانات المشروع
━━━━━━━━━━━━━━━━━━━━━━

${productData}

━━━━━━━━━━━━━━━━━━━━━━
سياسة قاعدة المعرفة
━━━━━━━━━━━━━━━━━━━━━━

${
  knowledgeBase.policy ||
  "استخدم المعلومات الموثقة ولا تخترع البيانات."
}

━━━━━━━━━━━━━━━━━━━━━━
تعليمات خاصة بهذه الرسالة
━━━━━━━━━━━━━━━━━━━━━━

${identityHint}

${trainingHint}

━━━━━━━━━━━━━━━━━━━━━━
السؤال الحالي
━━━━━━━━━━━━━━━━━━━━━━

${question}

━━━━━━━━━━━━━━━━━━━━━━

افهم المقصود حتى لو كان السؤال يحتوي على أخطاء إملائية أو عامية.

أجب عن السؤال الحالي مباشرة.

إذا كان تابعًا لما سبق، استخدم الذاكرة والسياق.

لا تطلب من المستخدم إعادة معلومات موجودة في الذاكرة.

`;
}


// ============================================================
// CLEAN INTERNAL MEMORY MARKERS
// ============================================================

function cleanAnswer(
  answer
) {

  return String(answer || "")

    .replace(
      /\[\[TRAINING_LEVEL:\d\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_SCORE:\d{1,2}\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_TOPIC:.*?\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_STRENGTH:.*?\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_WEAKNESS:.*?\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_SCENARIO:.*?\]\]/g,
      ""
    )

    .replace(
      /\[\[TRAINING_ACTIVE:(true|false)\]\]/g,
      ""
    )

    .replace(
      /\n{3,}/g,
      "\n\n"
    )

    .trim();
}


// ============================================================
// GEMINI API
// ============================================================

async function callModel(
  model,
  prompt,
  level,
  timeoutMs = REQUEST_TIMEOUT_MS
) {

  if (
    !GEMINI_API_KEY
  ) {

    const error =
      new Error(
        "GEMINI_API_KEY غير موجود"
      );

    error.status = 500;

    throw error;
  }


  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );


  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;


  try {

    const response =
      await fetch(
        url,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              GEMINI_API_KEY
          },


          body:
            JSON.stringify({

              systemInstruction: {

                parts: [

                  {
                    text:
                      SYSTEM_INSTRUCTION
                  }

                ]
              },


              contents: [

                {

                  role: "user",

                  parts: [

                    {
                      text:
                        prompt
                    }

                  ]
                }

              ],


              generationConfig: {

                maxOutputTokens:
                  MAX_OUTPUT_TOKENS,

                thinkingConfig: {

                  thinkingLevel:
                    level
                }

              }

            }),


          signal:
            controller.signal

        }
      );


    const raw =
      await response.text();


    let data = {};


    try {

      data =
        JSON.parse(raw);

    } catch (_) {

      console.error(
        "❌ Gemini returned invalid JSON"
      );
    }


    if (
      !response.ok
    ) {

      const error =
        new Error(

          data?.error?.message ||

          `Gemini HTTP ${response.status}`

        );


      error.status =
        response.status;


      console.error(
        "❌ Gemini:",
        response.status,
        error.message
      );


      throw error;
    }


    const candidate =
      data?.candidates?.[0];


    const answer =
      candidate
        ?.content
        ?.parts
        ?.map(
          part =>
            part?.text || ""
        )
        .join("")
        .trim();


    if (!answer) {

      const error =
        new Error(
          "Gemini returned no text"
        );

      error.status = 502;

      throw error;
    }


    return answer;

  } finally {

    clearTimeout(timer);
  }
}


// ============================================================
// RETRY + FALLBACK
// ============================================================

function retryable(
  error
) {

  return (

    [
      429,
      500,
      502,
      503,
      504
    ].includes(
      error?.status
    )

    ||

    error?.name ===
      "AbortError"

  );
}


async function askGemini(
  prompt,
  level
) {

  try {

    return {

      answer:
        await callModel(
          PRIMARY_MODEL,
          prompt,
          level,
          REQUEST_TIMEOUT_MS
        ),

      model:
        PRIMARY_MODEL
    };

  } catch (error) {

    console.warn(
      "⚠️ Gemini primary:",
      error.message
    );


    // لا ننتظر محاولة ثانية إذا كان السبب timeout
    // حتى لا نتجاوز هدف السرعة
    if (
      error?.name ===
      "AbortError"
    ) {

      throw error;
    }


    // fallback سريع للأخطاء المؤقتة فقط
    if (
      retryable(error)
    ) {

      try {

        return {

          answer:
            await callModel(
              FALLBACK_MODEL,
              prompt,
              level,
              1200
            ),

          model:
            FALLBACK_MODEL
        };

      } catch (fallbackError) {

        console.error(
          "❌ Fallback:",
          fallbackError.message
        );

        throw error;
      }
    }


    throw error;
  }
}


// ============================================================
// PUBLIC ERROR
// ============================================================

function publicError(
  error
) {

  const status =
    error?.status;

  const message =
    String(
      error?.message || ""
    );


  if (
    status === 429 ||
    /quota|resource exhausted|rate limit/i
      .test(message)
  ) {

    return (
      "⚠️ وصلنا مؤقتًا إلى حد استخدام Gemini المجاني. "
      +
      "انتظر قليلًا ثم جرّب مرة أخرى."
    );
  }


  if (
    status === 401 ||
    status === 403
  ) {

    return (
      "⚠️ مفتاح Gemini غير صالح أو غير مفعّل في Render."
    );
  }


  if (
    status === 404
  ) {

    return (
      "⚠️ نموذج Gemini غير متاح لهذا المفتاح حاليًا."
    );
  }


  if (
    error?.name ===
    "AbortError"
  ) {

    return (
      "⚡ الوكيل أخذ وقتًا أطول من المطلوب. جرّب إرسال السؤال مرة ثانية."
    );
  }


  return (
    "❌ تعذر الحصول على الإجابة حاليًا. جرّب مرة أخرى."
  );
}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/health",
  (req, res) => {

    res.json({

      ok: true,

      service:
        "DXN Life Hub AI Agent",

      model:
        PRIMARY_MODEL,

      fallback:
        FALLBACK_MODEL,

      geminiConfigured:
        Boolean(
          GEMINI_API_KEY
        ),

      products:
        knowledgeBase.products
          .length,

      memory:
        true,

      trainingMemory:
        true,

      typoUnderstanding:
        true,

      progressiveTraining:
        true,

      generalKnowledge:
        true,

      projectKnowledge:
        true,

      googleSearch:
        false,

      maxResponseTimeMs:
        REQUEST_TIMEOUT_MS,

      sessions:
        sessions.size
    });
  }
);


// ============================================================
// MAIN AI ENDPOINT
// ============================================================

app.post(
  "/ask",
  async (req, res) => {

    const started =
      Date.now();


    const question =
      typeof req.body?.question ===
      "string"

        ? req.body.question.trim()

        : "";


    if (!question) {

      return res
        .status(400)
        .json({

          ok: false,

          answer:
            "اكتب سؤالك أولًا 😊"

        });
    }


    if (
      question.length >
      4000
    ) {

      return res
        .status(400)
        .json({

          ok: false,

          answer:
            "السؤال طويل جدًا. اختصره قليلًا."

        });
    }


    if (
      !GEMINI_API_KEY
    ) {

      return res
        .status(500)
        .json({

          ok: false,

          answer:
            "الوكيل يحتاج GEMINI_API_KEY في Render."

        });
    }


    const sessionId =
      getSessionId(
        req,
        res
      );


    const session =
      getSession(
        sessionId
      );


    console.log(
      `🧠 سؤال جديد: ${question}`
    );


    try {

      // ======================================================
      // الهوية — إجابة فورية بدون Gemini
      // ======================================================

      if (
        isIdentityQuestion(
          question
        )
      ) {

        const answer =
          "أنا وكيل المدرب زين أمّهز داخل DXN Life Hub 🤝\n" +
          "أنا وكيل ذكاء اصطناعي، ودوري أساعدك بالمعلومات والتدريب والتطبيق، " +
          "وبقدر أتعامل معك كزبون أو كمتدرّب حسب شو بدك.";

        addHistory(
          session,
          "user",
          question
        );

        addHistory(
          session,
          "assistant",
          answer
        );

        return res.json({

          ok: true,

          answer,

          products: [],

          sources: [],

          cached: false,

          web_search: false,

          meta: {

            model:
              "identity-fast-path",

            thinkingLevel:
              "low",

            memory:
              true,

            response_time_ms:
              Date.now() -
              started

          }

        });
      }


      // ======================================================
      // CACHE
      // ======================================================

      const cached =
        getCached(
          sessionId,
          question
        );


      if (cached) {

        console.log(
          "⚡ إجابة من الذاكرة المؤقتة"
        );


        return res.json({

          ok: true,

          answer:
            cached.answer,

          products:
            cached.products,

          sources:
            cached.sources,

          cached:
            true,

          web_search:
            false,

          meta: {

            cached:
              true,

            memory:
              true,

            response_time_ms:
              Date.now() -
              started
          }

        });
      }


      // ======================================================
      // ذاكرة سريعة للسياق
      // ======================================================

      if (
        isTrainingRequest(
          question
        )
      ) {

        session.training.active =
          true;
      }


      // ======================================================
      // PRODUCT SEARCH
      // ======================================================

      const products =
        findRelevantProducts(
          question,
          8
        );


      console.log(
        `🔎 المنتجات المرتبطة: ${products.length}`
      );


      // ======================================================
      // THINKING LEVEL
      // ======================================================

      const level =
        thinkingLevel(
          question
        );


      // ======================================================
      // PROMPT
      // ======================================================

      const prompt =
        buildPrompt(
          question,
          session,
          products
        );


      // ======================================================
      // GEMINI
      // ======================================================

      const result =
        await askGemini(
          prompt,
          level
        );


      // ======================================================
      // تنظيف إشارات الذاكرة
      // ======================================================

      const rawAnswer =
        result.answer;

      const clean =
        cleanAnswer(
          rawAnswer
        );


      // ======================================================
      // تحديث ذاكرة التدريب
      // ======================================================

      updateTrainingMemory(
        session,
        {
          ...result,
          answer:
            rawAnswer
        }
      );


      // ======================================================
      // HISTORY
      // ======================================================

      addHistory(
        session,
        "user",
        question
      );


      addHistory(
        session,
        "assistant",
        clean
      );


      // ======================================================
      // SOURCES
      // ======================================================

      const sources =
        products

          .filter(
            product =>
              product.information_source
          )

          .slice(0, 5)

          .map(
            product => ({

              title:
                product.name_ar ||
                product.catalog_name ||
                "مصدر المنتج",

              url:
                product.information_source
            })
          );


      // ======================================================
      // RESPONSE
      // ======================================================

      const responseData = {

        answer:
          clean,

        products:
          products.map(
            compactProduct
          ),

        sources,

        cached:
          false,

        web_search:
          false,

        meta: {

          model:
            result.model,

          thinkingLevel:
            level,

          memory:
            true,

          trainingMemory:
            true,

          trainingLevel:
            session.training.level,

          lastTrainingScore:
            session.training.lastScore,

          generalKnowledge:
            true,

          projectKnowledge:
            true,

          googleSearch:
            false,

          products_found:
            products.length,

          response_time_ms:
            Date.now() -
            started

        }

      };


      setCached(
        sessionId,
        question,
        responseData
      );


      return res.json({

        ok: true,

        ...responseData

      });


    } catch (error) {

      console.error(
        "❌ AI ERROR:",
        error.status || "",
        error.message
      );


      return res
        .status(500)
        .json({

          ok: false,

          answer:
            publicError(
              error
            ),

          error:
            error.message,

          status:
            error.status ||
            500,

          meta: {

            response_time_ms:
              Date.now() -
              started

          }

        });
    }
  }
);


// ============================================================
// UNKNOWN ROUTES
// ============================================================

app.use(
  (req, res) => {

    res
      .status(404)
      .json({

        ok: false,

        answer:
          "المسار المطلوب غير موجود."

      });
  }
);


// ============================================================
// START
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      "========================================"
    );

    console.log(
      "🚀 DXN Life Hub AI Agent"
    );

    console.log(
      `🌐 Port: ${PORT}`
    );

    console.log(
      `🤖 Primary: ${PRIMARY_MODEL}`
    );

    console.log(
      `🔁 Fallback: ${FALLBACK_MODEL}`
    );

    console.log(
      "📚 Project Knowledge: ON"
    );

    console.log(
      "🧠 General Knowledge: ON"
    );

    console.log(
      "💬 Conversation Memory: ON"
    );

    console.log(
      "🎓 Progressive Training: ON"
    );

    console.log(
      "🧠 Training Memory: ON"
    );

    console.log(
      "✍️ Typo Understanding: ON"
    );

    console.log(
      "⚡ Fast Response Mode: ON"
    );

    console.log(
      "💰 Price Protection: ON"
    );

    console.log(
      "🛡️ Medical Safety: ON"
    );

    console.log(
      "🔎 Google Search: OFF"
    );

    console.log(
      "========================================"
    );
  }
);

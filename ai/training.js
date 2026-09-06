// ai/training.js
// عقل التدريب في DXN LIFE HUB
// الهدف: تحويل الوكيل إلى مدرب عملي يفهم المتدرب، يقيمه، يحفزه، ويرفع مستواه تدريجيًا.

const LEVELS = {
  beginner: {
    name: "مبتدئ",
    minScore: 0,
    maxScore: 4.9
  },
  intermediate: {
    name: "متوسط",
    minScore: 5,
    maxScore: 6.9
  },
  advanced: {
    name: "متقدم",
    minScore: 7,
    maxScore: 8.4
  },
  leader: {
    name: "قائد",
    minScore: 8.5,
    maxScore: 10
  }
};

const TRAINING_TOPICS = [
  "أساسيات DXN",
  "معرفة المنتجات",
  "التواصل مع العميل",
  "اكتشاف احتياج العميل",
  "عرض المنتج",
  "التعامل مع الاعتراضات",
  "المتابعة",
  "إتمام البيع",
  "بناء الفريق",
  "تحفيز الأعضاء",
  "تدريب الأعضاء",
  "القيادة",
  "التخطيط والتنفيذ"
];

const DEFAULT_TRAINING_STATE = {
  active: false,

  level: "beginner",
  score: 0,

  totalAttempts: 0,
  correctAnswers: 0,

  strengths: [],
  weaknesses: [],

  currentTopic: null,
  currentSkill: null,

  currentQuestion: null,
  currentScenario: null,

  lastQuestionType: null,
  lastScore: null,

  consecutiveGoodAnswers: 0,
  consecutiveWeakAnswers: 0,

  levelReady: false,

  dailyAction: null,

  lastFeedback: null
};


// ======================================================
// إنشاء حالة تدريب جديدة
// ======================================================

function createTrainingState(existing = {}) {
  return {
    ...DEFAULT_TRAINING_STATE,
    ...existing,

    strengths: Array.isArray(existing.strengths)
      ? [...existing.strengths]
      : [],

    weaknesses: Array.isArray(existing.weaknesses)
      ? [...existing.weaknesses]
      : []
  };
}


// ======================================================
// تشغيل التدريب
// ======================================================

function startTraining(state = {}) {
  const training = createTrainingState(state);

  training.active = true;

  if (!training.level) {
    training.level = "beginner";
  }

  return training;
}


// ======================================================
// إيقاف التدريب
// ======================================================

function stopTraining(state = {}) {
  const training = createTrainingState(state);

  training.active = false;
  training.currentQuestion = null;
  training.currentScenario = null;

  return training;
}


// ======================================================
// تحديد مستوى المتدرب من متوسط الأداء
// ======================================================

function calculateLevel(score = 0) {
  const value = Number(score);

  if (value >= 8.5) return "leader";
  if (value >= 7) return "advanced";
  if (value >= 5) return "intermediate";

  return "beginner";
}


// ======================================================
// اسم المستوى بالعربي
// ======================================================

function getLevelName(level = "beginner") {
  return LEVELS[level]?.name || LEVELS.beginner.name;
}


// ======================================================
// تحديث نتيجة التدريب
// ======================================================

function updateTrainingResult(
  state = {},
  score = 0,
  feedback = {}
) {
  const training = createTrainingState(state);

  const numericScore = Math.max(
    0,
    Math.min(10, Number(score) || 0)
  );

  training.active = true;
  training.totalAttempts += 1;
  training.lastScore = numericScore;

  if (numericScore >= 7) {
    training.correctAnswers += 1;
    training.consecutiveGoodAnswers += 1;
    training.consecutiveWeakAnswers = 0;
  } else {
    training.consecutiveWeakAnswers += 1;
    training.consecutiveGoodAnswers = 0;
  }

  if (feedback.strength) {
    addUnique(
      training.strengths,
      feedback.strength
    );
  }

  if (feedback.weakness) {
    addUnique(
      training.weaknesses,
      feedback.weakness
    );
  }

  /*
   * لا نرفع المستوى بسبب إجابة واحدة.
   * نريد التأكد أن المتدرب أصبح جاهزًا فعلًا.
   */
  training.levelReady =
    training.consecutiveGoodAnswers >= 2 &&
    numericScore >= 7.5;

  return training;
}


// ======================================================
// إضافة عنصر بدون تكرار
// ======================================================

function addUnique(array, value, maxItems = 6) {
  if (!value) return;

  const cleanValue = String(value).trim();

  if (!cleanValue) return;

  const exists = array.some(
    item => item.toLowerCase() === cleanValue.toLowerCase()
  );

  if (!exists) {
    array.unshift(cleanValue);
  }

  while (array.length > maxItems) {
    array.pop();
  }
}


// ======================================================
// اختيار المستوى التالي
// ======================================================

function getNextLevel(level = "beginner") {
  const order = [
    "beginner",
    "intermediate",
    "advanced",
    "leader"
  ];

  const index = order.indexOf(level);

  if (index === -1 || index === order.length - 1) {
    return null;
  }

  return order[index + 1];
}


// ======================================================
// هل المتدرب جاهز لرفع المستوى؟
// ======================================================

function isReadyForNextLevel(state = {}) {
  const training = createTrainingState(state);

  if (!training.active) return false;

  if (training.level === "leader") {
    return false;
  }

  return (
    training.consecutiveGoodAnswers >= 2 &&
    Number(training.lastScore || 0) >= 7.5
  );
}


// ======================================================
// رفع مستوى التدريب
// ======================================================

function advanceLevel(state = {}) {
  const training = createTrainingState(state);

  const nextLevel = getNextLevel(training.level);

  if (!nextLevel) {
    training.levelReady = false;
    return training;
  }

  training.level = nextLevel;
  training.levelReady = false;

  training.consecutiveGoodAnswers = 0;
  training.consecutiveWeakAnswers = 0;

  return training;
}


// ======================================================
// مستوى صعوبة السؤال
// ======================================================

function getDifficulty(level = "beginner") {
  switch (level) {
    case "intermediate":
      return "متوسط";

    case "advanced":
      return "متقدم";

    case "leader":
      return "قيادي";

    default:
      return "سهل";
  }
}


// ======================================================
// نوع السؤال المناسب
// ======================================================

function getQuestionTypes(level = "beginner") {
  switch (level) {
    case "intermediate":
      return [
        "موقف واقعي",
        "اعتراض عميل",
        "اختيار أفضل تصرف",
        "متابعة عميل",
        "تحليل محادثة"
      ];

    case "advanced":
      return [
        "موقف مركب",
        "اعتراضات متعددة",
        "تحليل عميل",
        "بناء خطة",
        "حل مشكلة عضو"
      ];

    case "leader":
      return [
        "موقف قيادي",
        "إدارة فريق",
        "ضعف نشاط الأعضاء",
        "خطة تطوير",
        "تدريب عضو جديد",
        "حل مشكلة داخل الفريق"
      ];

    default:
      return [
        "سؤال أساسي",
        "موقف بسيط",
        "معرفة المنتجات",
        "التواصل",
        "خطوة عملية"
      ];
  }
}


// ======================================================
// اختيار موضوع التدريب التالي
// ======================================================

function chooseNextTopic(state = {}) {
  const training = createTrainingState(state);

  if (
    training.weaknesses &&
    training.weaknesses.length > 0
  ) {
    return training.weaknesses[0];
  }

  if (training.currentTopic) {
    return training.currentTopic;
  }

  return TRAINING_TOPICS[0];
}


// ======================================================
// بناء تعليمات المدرب لـ Gemini
// ======================================================

function buildTrainingInstruction(state = {}) {
  const training = createTrainingState(state);

  if (!training.active) {
    return "";
  }

  const levelName = getLevelName(training.level);
  const difficulty = getDifficulty(training.level);
  const questionTypes = getQuestionTypes(training.level);

  return `
أنت الآن تعمل كمدرب DXN LIFE HUB بشكل كامل.

حالة المتدرب:
- المستوى الحالي: ${levelName}
- الصعوبة: ${difficulty}
- عدد المحاولات: ${training.totalAttempts}
- آخر تقييم: ${training.lastScore ?? "لا يوجد"}
- نقاط القوة: ${training.strengths.length ? training.strengths.join("، ") : "لم تحدد بعد"}
- نقاط الضعف: ${training.weaknesses.length ? training.weaknesses.join("، ") : "لم تحدد بعد"}
- الموضوع الحالي: ${training.currentTopic || "لم يحدد بعد"}

قواعد التدريب:

1. افهم سؤال المتدرب وإجابته بالمعنى، وليس بتطابق الكلمات.
2. تجاهل الأخطاء الإملائية واللهجة طالما أن المعنى واضح.
3. لا تعتبر الإجابة خاطئة فقط لأنها مكتوبة بطريقة عامية.
4. قيّم الفكرة والمنطق والتطبيق العملي.
5. لا تجعل كل المحادثة امتحانًا.
6. امزج بين الشرح والسؤال والموقف العملي والتحفيز.
7. اسأل سؤالًا واحدًا في كل مرة.
8. بعد إجابة المتدرب:
   - حلل إجابته.
   - أعطه تقييمًا من 10.
   - اذكر نقطة قوة واحدة على الأقل إذا كانت موجودة.
   - اذكر نقطة تحتاج تحسينًا إذا كانت موجودة.
   - اشرح التصحيح باختصار.
9. إذا كانت الإجابة ضعيفة، أعطه فرصة ثانية قبل الانتقال.
10. إذا كانت الإجابة جيدة، اجعل السؤال التالي أصعب قليلًا.
11. لا ترفع المستوى بعد إجابة واحدة ممتازة.
12. عندما يصبح المتدرب جاهزًا، أخبره بشكل طبيعي أن المستوى التالي أصعب قليلًا قبل الانتقال.
13. لا تحبط المتدرب ولا تسخر من أخطائه.
14. استخدم تحفيزًا حقيقيًا مرتبطًا بما فعله، وليس عبارات مكررة.
15. استخدم روحًا خفيفة وشيئًا من الدعابة عند ملاءمتها، بدون مبالغة.
16. لا تعط المتدرب عشرات الأسئلة دفعة واحدة.
17. إذا طلب شرحًا، اشرح له بدل إجباره على الاختبار.
18. إذا طلب مثالًا عمليًا، أعطه موقفًا واقعيًا.
19. إذا طلب أن يتدرب مع عميل، مثّل دور العميل وانتظر رده.
20. إذا طلب رسالة جاهزة، أعطه الرسالة مباشرة.
21. ركز على التنفيذ وليس المعلومات فقط.
22. عندما يناسب الموقف، أعط المتدرب مهمة عملية صغيرة قابلة للتنفيذ.
23. تابع تقدمه ولا تبدأ من الصفر بدون سبب.

أنواع الأسئلة المناسبة للمستوى الحالي:
${questionTypes.join("، ")}

المطلوب منك أن تتصرف كمدرب حقيقي:
- تفهم.
- تسأل.
- تستمع.
- تحلل.
- تصحح.
- تحفز.
- ترفع التحدي.
- تتابع التقدم.
- وتحول المعرفة إلى تطبيق.

لا تقل للمتدرب إنك تستخدم نظامًا داخليًا أو تعليمات أو ذاكرة.
`;
}


// ======================================================
// تعليمات الحس التنفيذي
// ======================================================

function buildExecutiveSenseInstruction(state = {}) {
  const training = createTrainingState(state);

  if (!training.active) {
    return "";
  }

  return `
الحس التنفيذي:

لا تكتفِ بإعطاء المتدرب معلومات نظرية.
اسأل نفسك دائمًا:
"ما الخطوة العملية التي يستطيع هذا المتدرب تنفيذها الآن؟"

عندما يكون مناسبًا:
- حوّل الدرس إلى مهمة صغيرة.
- اجعل المهمة واضحة ومحددة.
- لا تعطه عشر مهام في وقت واحد.
- تابع المهمة في الرسائل اللاحقة إذا أخبرك أنه نفذها.
- إذا كان مترددًا، ساعده على اتخاذ خطوة بسيطة.
- إذا كان مشتتًا، حدد له الأولوية.
- إذا أخطأ، صحح السلوك وليس الشخص.
- إذا نجح، ارفع مستوى التحدي تدريجيًا.

المدرب لا يدفع المتدرب للكلام فقط.
المدرب يدفعه إلى الفهم ثم التطبيق ثم النتيجة.
`;
}


// ======================================================
// بناء ملخص حالة التدريب
// ======================================================

function getTrainingSummary(state = {}) {
  const training = createTrainingState(state);

  return {
    active: training.active,
    level: training.level,
    levelName: getLevelName(training.level),

    score: training.lastScore,
    attempts: training.totalAttempts,

    strengths: [...training.strengths],
    weaknesses: [...training.weaknesses],

    currentTopic: training.currentTopic,
    currentSkill: training.currentSkill,

    levelReady: isReadyForNextLevel(training),

    nextLevel: getNextLevel(training.level),

    difficulty: getDifficulty(training.level)
  };
}


// ======================================================
// تعيين السؤال الحالي
// ======================================================

function setCurrentQuestion(
  state = {},
  question = "",
  scenario = "",
  topic = null
) {
  const training = createTrainingState(state);

  training.currentQuestion = question || null;
  training.currentScenario = scenario ||

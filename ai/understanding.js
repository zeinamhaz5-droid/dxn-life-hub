// ======================================================
// ai/understanding.js
// DXN LIFE HUB - طبقة الفهم الذكية
// ======================================================

function normalizeArabic(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/گ/g, "ك")
    .replace(/چ/g, "ج")
    .replace(/پ/g, "ب")
    .replace(/ڤ/g, "ف")
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text = "") {
  return normalizeArabic(text).replace(/\s+/g, "");
}

function containsAny(text = "", words = []) {
  const q = normalizeArabic(text);

  return words.some(word => {
    const w = normalizeArabic(word);
    return w && q.includes(w);
  });
}

function wordCount(text = "") {
  const q = normalizeArabic(text);
  return q ? q.split(" ").length : 0;
}


// ======================================================
// 1. الهوية
// ======================================================

function isIdentityQuestion(text = "") {
  const q = normalizeArabic(text);

  return [
    "من انت",
    "مين انت",
    "منو انت",
    "شو اسمك",
    "شو انت",
    "عرفني عنك",
    "خبرني عنك",
    "مين حضرتك",
    "مين هو زين",
    "مين زين",
    "شو دورك",
    "انت مين",
    "خبرني مين انت"
  ].some(item => q.includes(normalizeArabic(item)));
}


// ======================================================
// 2. قدرات الوكيل
// ======================================================

function isCapabilityQuestion(text = "") {
  return containsAny(text, [
    "شو فيك تعمل",
    "شو فيك تساعدني",
    "كيف فيك تساعدني",
    "شو بتقدر تعمل",
    "شو بتقدر تساعدني",
    "كيف بتقدر تساعدني",
    "شو دورك",
    "شو مهامك",
    "شو خدماتك",
    "بماذا تستطيع مساعدتي",
    "كيف تساعدني",
    "شو ممكن تساعدني",
    "شو بتعرف تعمل",
    "شو بتعرف تساعد",
    "فيني اسالك عن",
    "فيني اسال",
    "شو فيني اسالك"
  ]);
}


// ======================================================
// 3. أسئلة DXN العامة
// ======================================================

function isDXNGeneralQuestion(text = "") {
  const q = normalizeArabic(text);

  const hasDXN =
    q.includes("dxn") ||
    q.includes("دكسن") ||
    q.includes("دي اكس ان") ||
    q.includes("دي اكسن") ||
    q.includes("ديكسن");

  if (!hasDXN) return false;

  return (
    containsAny(q, [
      "شو هي",
      "ما هي",
      "شو هية",
      "شو بتعمل",
      "شو هي الشركه",
      "خبرني عن",
      "احكيلي عن",
      "شرحلي",
      "شو قصتها",
      "شو نظامها",
      "كيف بتشتغل",
      "كيف العمل فيها"
    ]) ||
    q === "dxn" ||
    q === "دكسن" ||
    q === "دي اكس ان"
  );
}


// ======================================================
// 4. فهم دور المستخدم
// ======================================================

function detectUserRole(text = "") {
  const q = normalizeArabic(text);

  // ------------------------------------------
  // أولوية أولى: هوية صريحة
  // ------------------------------------------

  if (
    containsAny(q, [
      "انا متدرب",
      "انا متدرب جديد",
      "انا عضو جديد",
      "بدي اتدرب",
      "بدي اتعلم",
      "بدي تعلم",
      "بدي طور حالي",
      "بدي اتطور",
      "دربني",
      "اختبرني",
      "قيم مستواي",
      "اختبر خبرتي",
      "بدي اعرف مستواي"
    ])
  ) {
    return "trainee";
  }

  if (
    containsAny(q, [
      "انا زبون",
      "انا عميل",
      "انا زبون جديد",
      "انا عميل جديد"
    ])
  ) {
    return "customer";
  }

  if (
    containsAny(q, [
      "انا قائد",
      "انا ليدر",
      "انا leader",
      "عندي فريق",
      "عندي تيم",
      "عندي مجموعه",
      "بني فريق",
      "عم ببني فريق",
      "مسؤول عن فريق",
      "عندي اعضاء"
    ])
  ) {
    return "leader";
  }


  // ------------------------------------------
  // طلبات واضحة تدل على متدرب
  // ------------------------------------------

  const trainingSignals = [
    "دربني",
    "بدي تدريب",
    "اختبرني",
    "اعمللي اختبار",
    "اعمل لي اختبار",
    "خلينا نتدرب",
    "خلينا نتمرن",
    "علمني",
    "بدي اتعلم",
    "كيف اتطور",
    "قيم مستواي",
    "قيمني",
    "شوف مستواي",
    "اختبر خبرتي",
    "شوف خبرتي"
  ];

  if (containsAny(q, trainingSignals)) {
    return "trainee";
  }


  // ------------------------------------------
  // طلبات واضحة تدل على زبون
  // ------------------------------------------

  const customerSignals = [
    "بدي اشتري",
    "حابب اشتري",
    "حابه اشتري",
    "بدي منتج",
    "بدي اعرف عن المنتج",
    "مهتم بالمنتجات",
    "قديش سعر",
    "كم سعر",
    "كم حق",
    "بكم",
    "شو سعر"
  ];

  if (containsAny(q, customerSignals)) {
    return "customer";
  }


  // ------------------------------------------
  // مهم جدًا:
  // كلمة "زبون" وحدها لا تعني أن المستخدم زبون.
  //
  // مثال:
  // "كيف اتعامل مع زبون قال السعر غالي؟"
  // هذا متدرب وليس زبون.
  // ------------------------------------------

  const trainingScenarioSignals = [
    "كيف اتعامل مع زبون",
    "كيف اتعامل مع عميل",
    "كيف اقنع الزبون",
    "كيف اقنع العميل",
    "الزبون قال",
    "العميل قال",
    "اذا الزبون",
    "اذا العميل",
    "اعتراض الزبون",
    "اعتراض العميل",
    "موقف مع زبون",
    "موقف مع عميل",
    "زبون غالي",
    "عميل غالي"
  ];

  if (containsAny(q, trainingScenarioSignals)) {
    return "trainee";
  }


  return null;
}


// ======================================================
// 5. طلب التدريب
// ======================================================

function isTrainingRequest(text = "") {
  return containsAny(text, [
    "دربني",
    "بدي تدريب",
    "بدي اتدرب",
    "اختبرني",
    "اعمللي اختبار",
    "اعمل لي اختبار",
    "خلينا نتدرب",
    "خلينا نتمرن",
    "علمني",
    "بدي اتعلم",
    "بدي تعلم",
    "كيف اتطور",
    "بدي طور حالي",
    "قيم مستواي",
    "قيمني",
    "شوف مستواي",
    "اختبر خبرتي",
    "شوف خبرتي",
    "بدي اعرف مستواي"
  ]);
}


// ======================================================
// 6. نوع التدريب
// ======================================================

function detectTrainingType(text = "") {
  const q = normalizeArabic(text);

  if (containsAny(q, [
    "اختبرني",
    "اختبار",
    "قيم مستواي",
    "قيمني",
    "شوف مستواي",
    "اختبر خبرتي"
  ])) {
    return "assessment";
  }

  if (containsAny(q, [
    "علمني",
    "شرحلي",
    "فهمني",
    "بدي اتعلم"
  ])) {
    return "learning";
  }

  if (containsAny(q, [
    "موقف",
    "سيناريو",
    "عميل",
    "زبون",
    "اعتراض"
  ])) {
    return "scenario";
  }

  if (containsAny(q, [
    "بيع",
    "المبيعات",
    "كيف ابيع"
  ])) {
    return "sales";
  }

  if (containsAny(q, [
    "متابعه",
    "تابع",
    "follow up",
    "فولو"
  ])) {
    return "follow_up";
  }

  if (containsAny(q, [
    "فريق",
    "بناء الفريق",
    "اعضاء",
    "قياده",
    "قائد",
    "ليدر"
  ])) {
    return "team_building";
  }

  return "general_training";
}


// ======================================================
// 7. موضوع السؤال
// ======================================================

function detectTopic(text = "") {
  const q = normalizeArabic(text);

  if (containsAny(q, [
    "منتج",
    "منتجات",
    "كوب",
    "قهوه",
    "عصير",
    "فيتامين",
    "مكمل",
    "بخور",
    "معجون",
    "صابون"
  ])) {
    return "products";
  }

  if (containsAny(q, [
    "سعر",
    "اسعار",
    "قديش",
    "كم حق",
    "بكم"
  ])) {
    return "pricing";
  }

  if (containsAny(q, [
    "بيع",
    "ابيع",
    "مبيعات",
    "زبون",
    "عميل",
    "اقناع"
  ])) {
    return "sales";
  }

  if (containsAny(q, [
    "متابعه",
    "تابع العميل",
    "فولو",
    "follow up"
  ])) {
    return "follow_up";
  }

  if (containsAny(q, [
    "اعتراض",
    "غالي",
    "ما بدي",
    "ما معي",
    "فكر وبخبرك",
    "ما عندي وقت"
  ])) {
    return "objections";
  }

  if (containsAny(q, [
    "فريق",
    "اعضاء",
    "ضم",
    "تجنيد",
    "توظيف",
    "بناء الفريق"
  ])) {
    return "team_building";
  }

  if (containsAny(q, [
    "رتبه",
    "رتب",
    "عموله",
    "ارباح",
    "ربح",
    "نقاط",
    "دخل"
  ])) {
    return "compensation";
  }

  if (containsAny(q, [
    "تحفيز",
    "حفز",
    "نشاط",
    "عضو غير نشيط",
    "فريق ضعيف"
  ])) {
    return "motivation";
  }

  if (containsAny(q, [
    "dxn",
    "دكسن",
    "دي اكس ان",
    "الشركه"
  ])) {
    return "dxn";
  }

  return "general";
}


// ======================================================
// 8. مستوى الخبرة
// ======================================================

function detectExperienceLevel(text = "") {
  const q = normalizeArabic(text);

  if (containsAny(q, [
    "انا جديد",
    "ما بعرف شي",
    "ما بعرف",
    "اول مره",
    "مبتدئ",
    "مبتديه",
    "لسا جديد"
  ])) {
    return "beginner";
  }

  if (containsAny(q, [
    "عندي خبره",
    "اشتغلت قبل",
    "بعرف الاساسيات",
    "بعرف الاساس",
    "عندي تجربه"
  ])) {
    return "intermediate";
  }

  if (containsAny(q, [
    "بدرب اعضاء",
    "بدرب فريق",
    "عندي خبرة كبيرة",
    "خبير",
    "متقدم",
    "انا ليدر"
  ])) {
    return "advanced";
  }

  return null;
}


// ======================================================
// 9. الأسئلة المختصرة
// ======================================================

function isShortContextQuestion(text = "") {
  const q = normalizeArabic(text);

  if (!q) return false;

  return (
    wordCount(q) <= 5 &&
    containsAny(q, [
      "شو هو",
      "شو هي",
      "شو يعني",
      "كيف",
      "ليش",
      "وقديش",
      "قديش",
      "وبعدين",
      "طيب وبعدين",
      "واذا",
      "شو اعمل",
      "شو بعمل",
      "كيف يعني",
      "فهمني",
      "وضحلي",
      "شرحلي"
    ])
  );
}


// ======================================================
// 10. التطبيق العملي
// ======================================================

function isPracticalRequest(text = "") {
  return containsAny(text, [
    "اعطيني مثال",
    "مثال عملي",
    "خليني جرب",
    "جربني",
    "خلينا نجرب",
    "اعمل معي",
    "احكي معي كأني عميل",
    "اعتبرني عميل",
    "اعمل حالك عميل",
    "اعمل حالك زبون",
    "خلينا نمثل",
    "تمثيل",
    "محادثه مع عميل"
  ]);
}


// ======================================================
// 11. رسالة جاهزة
// ======================================================

function isReadyMessageRequest(text = "") {
  return containsAny(text, [
    "اكتبلي رساله",
    "اكتب لي رساله",
    "اعطيني رساله",
    "رساله جاهزه",
    "رساله للزبون",
    "رساله للعميل",
    "شو ابعتله",
    "شو بعتله",
    "كيف احكي معه",
    "كيف ابعتله"
  ]);
}


// ======================================================
// 12. طلب التصحيح
// ======================================================

function isCorrectionRequest(text = "") {
  return containsAny(text, [
    "صححلي",
    "صحح",
    "صححها",
    "عدلها",
    "عدلي",
    "صلحلي",
    "صلحها",
    "هل جوابي صحيح",
    "جوابي صح",
    "وين غلطت",
    "شو الغلط"
  ]);
}


// ======================================================
// 13. النية الرئيسية
// ======================================================

function detectIntent(text = "") {
  if (isIdentityQuestion(text)) {
    return "identity";
  }

  if (isCapabilityQuestion(text)) {
    return "capabilities";
  }

  const role = detectUserRole(text);

  if (role === "customer") {
    return "customer";
  }

  if (role === "trainee") {
    return "trainee";
  }

  if (role === "leader") {
    return "leader";
  }

  if (isTrainingRequest(text)) {
    return "training";
  }

  if (isPracticalRequest(text)) {
    return "practical_training";
  }

  if (isReadyMessageRequest(text)) {
    return "ready_message";
  }

  if (isCorrectionRequest(text)) {
    return "correction";
  }

  if (isDXNGeneralQuestion(text)) {
    return "dxn_general";
  }

  return "general";
}


// ======================================================
// 14. بناء فهم كامل للرسالة
// ======================================================

function understandMessage(text = "") {
  const role = detectUserRole(text);
  const intent = detectIntent(text);
  const topic = detectTopic(text);
  const experienceLevel = detectExperienceLevel(text);

  return {
    originalText: String(text),

    normalizedText: normalizeArabic(text),

    compactText: compactText(text),

    intent,

    role,

    topic,

    experienceLevel,

    training: {
      requested: isTrainingRequest(text),
      type: detectTrainingType(text),
      practical: isPracticalRequest(text),
      correction: isCorrectionRequest(text)
    },

    readyMessage: isReadyMessageRequest(text),

    shortContextQuestion: isShortContextQuestion(text),

    wordCount: wordCount(text)
  };
}


// ======================================================
// التصدير
// ======================================================

module.exports = {
  normalizeArabic,
  compactText,
  containsAny,
  wordCount,

  isIdentityQuestion,
  isCapabilityQuestion,
  isDXNGeneralQuestion,

  detectUserRole,
  isTrainingRequest,
  detectTrainingType,
  detectTopic,
  detectExperienceLevel,

  isShortContextQuestion,
  isPracticalRequest,
  isReadyMessageRequest,
  isCorrectionRequest,

  detectIntent,
  understandMessage
};

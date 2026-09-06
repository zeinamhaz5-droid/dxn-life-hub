// ai/understanding.js
// طبقة الفهم الذكية في DXN LIFE HUB
// مسؤولة عن فهم:
// - الأخطاء الإملائية
// - اللهجة
// - هوية المستخدم
// - نية السؤال
// - مستوى المتدرب
// - نوع التدريب
// - الموضوع المطلوب
// - الأسئلة المختصرة

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

function containsAny(text, words = []) {
  const q = normalizeArabic(text);

  return words.some(word => {
    const w = normalizeArabic(word);
    return q.includes(w);
  });
}

function wordCount(text = "") {
  const q = normalizeArabic(text);
  return q ? q.split(" ").length : 0;
}


// ======================================================
// 1. فهم سؤال: من أنت؟
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
// 2. فهم قدرات الوكيل
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
// 3. فهم الأسئلة العامة عن DXN
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

  // زبون / عميل
  if (
    containsAny(q, [
      "انا زبون",
      "انا عميل",
      "انا زبون جديد",
      "انا عميل جديد",
      "بدي اشتري",
      "حابب اشتري",
      "حابه اشتري",
      "مهتم بالمنتجات",
      "بدي منتج",
      "بدي اعرف عن المنتج"
    ])
  ) {
    return "customer";
  }

  // متدرب / عضو جديد
  if (
    containsAny(q, [
      "انا متدرب",
      "انا متدرب جديد",
      "انا عضو",
      "انا عضو جديد",
      "انا مشترك",
      "انا مشترك جديد",
      "بدي اتدرب",
      "بدي اتعلم",
      "بدي تعلم",
      "بدي طور حالي",
      "بدي اتطور",
      "انا جديد بدكسن",
      "انا جديد ب dxn",
      "انا جديد بالشركه"
    ])
  ) {
    return "trainee";
  }

  // قائد / ليدر
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

  return null;
}


// ======================================================
// 5. هل المستخدم يطلب التدريب؟
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
// 6. نوع التدريب المطلوب
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
// 8. تحديد مستوى المتدرب من كلامه
// ======================================================

function detectExperienceLevel(text = "") {
  const q = normalizeArabic(text);

  if (containsAny(q, [
    "انا جديد",
    "ما بعرف شي",
    "ما بعرف",
    "اول مره",
    "اول مرة",
    "مبتدئ",
    "مبتديه",
    "لسا جديد"
  ])) {
    return "beginner";
  }

  if (containsAny(q, [
    "عندي خبره",
    "عندي خبرة",
    "اشتغلت قبل",
    "بعرف الاساسيات",
    "بعرف الاساس",
    "عندي تجربه",
    "عندي تجربة"
  ])) {
    return "intermediate";
  }

  if (containsAny(q, [
    "عندي فريق",
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
// 9. فهم العبارات المختصرة
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
// 10. فهم طلب التطبيق العملي
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
// 11. فهم طلب رسالة جاهزة
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
// 12. هل المستخدم يطلب تصحيحًا؟
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
// 13. اكتشاف النية الرئيسية
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
// 14. بناء صورة كاملة عن فهم الرسالة
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

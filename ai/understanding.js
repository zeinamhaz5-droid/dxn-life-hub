// ai/understanding.js
// طبقة فهم المستخدم في DXN LIFE HUB

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
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// أسئلة التعريف بالوكيل
function isIdentityQuestion(text = "") {
  const q = normalizeArabic(text);

  return [
    "من انت",
    "مين انت",
    "مين إنت",
    "منو انت",
    "شو اسمك",
    "شو انت",
    "عرفني عنك",
    "خبرني عنك",
    "مين حضرتك"
  ].some(item => q.includes(normalizeArabic(item)));
}

// أسئلة عن قدرات الوكيل
function isCapabilityQuestion(text = "") {
  const q = normalizeArabic(text);

  return [
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
    "كيف تساعدني"
  ].some(item => q.includes(normalizeArabic(item)));
}

// أسئلة عامة عن DXN
function isDXNGeneralQuestion(text = "") {
  const q = normalizeArabic(text);

  const hasDXN =
    q.includes("dxn") ||
    q.includes("دكسن") ||
    q.includes("دي اكس ان") ||
    q.includes("دي اكسن");

  const generalQuestion =
    q.includes("شو هي") ||
    q.includes("ما هي") ||
    q.includes("شو هية") ||
    q.includes("شو بتعمل") ||
    q.includes("شو هي الشركه") ||
    q.includes("خبرني عن") ||
    q.includes("احكيلي عن") ||
    q.includes("شرحلي");

  return hasDXN && generalQuestion;
}

// هل السؤال متعلق بالتدريب؟
function isTrainingRequest(text = "") {
  const q = normalizeArabic(text);

  return [
    "دربني",
    "بدي تدريب",
    "بدي اتدرب",
    "اختبرني",
    "اعمللي اختبار",
    "خلينا نتدرب",
    "علمني",
    "بدي اتعلم",
    "كيف اتطور"
  ].some(item => q.includes(normalizeArabic(item)));
}

// تحديد نوع الطلب
function detectIntent(text = "") {
  if (isIdentityQuestion(text)) {
    return "identity";
  }

  if (isCapabilityQuestion(text)) {
    return "capabilities";
  }

  if (isDXNGeneralQuestion(text)) {
    return "dxn_general";
  }

  if (isTrainingRequest(text)) {
    return "training";
  }

  return "general";
}

module.exports = {
  normalizeArabic,
  isIdentityQuestion,
  isCapabilityQuestion,
  isDXNGeneralQuestion,
  isTrainingRequest,
  detectIntent
};

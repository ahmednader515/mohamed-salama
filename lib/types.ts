/**
 * أنواع البيانات المطابقة لجداول Neon (بدون Prisma)
 */

export type UserRole = "ADMIN" | "ASSISTANT_ADMIN" | "STUDENT" | "TEACHER";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  balance: string;
  student_number?: string | null;
  guardian_number?: string | null;
  /** عنوان المادة / التخصص — يظهر في «اختر المدرسين» */
  teacher_subject?: string | null;
  teacher_avatar_url?: string | null;
  /** 1–4 لترتيب البطاقة في الرئيسية؛ null = تلقائي بعد المحددين */
  teacher_homepage_order?: number | null;
  /** كود حقوق الطبع والنشر — للطلاب فقط، فريد، يظهر على مشغّل الحصص */
  copyright_code?: string | null;
  current_session_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  order: number;
  /** من أنشأ القسم (بعد rowToCamel من قاعدة البيانات) */
  createdById?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  text: string;
  textEn?: string | null;
  authorName: string;
  authorTitle: string | null;
  authorTitleEn?: string | null;
  avatarLetter: string | null;
  imageUrl: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * مفتاح تدرج خلفية الهيرو الجاهز (وراء صورة المدرس).
 * عند تعبئة heroBgCustomFrom و heroBgCustomTo بصيغة hex صالحة يُستخدم التدرج المخصّص بدلاً من المفتاح.
 */
export type HeroBgPreset =
  | "navy"
  | "indigo"
  | "purple"
  | "teal"
  | "forest"
  | "slate"
  | "crimson"
  | "rose"
  | "sunset"
  | "sky"
  | "cyan"
  | "stone"
  | "midnight"
  | "wine";

export type PlatformDetailsPresetIcon =
  | "chat"
  | "bulb"
  | "pencil"
  | "book"
  | "users"
  | "rocket"
  | "target"
  | "certificate";

export interface PlatformDetailsItem {
  id: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  iconType: "preset" | "upload";
  presetIcon: PlatformDetailsPresetIcon;
  customIconUrl: string | null;
}

/** شريحة في قسم الأخبار بالصفحة الرئيسية */
export interface PlatformNewsItem {
  id: string;
  imageUrl: string;
  description: string;
  descriptionEn?: string | null;
}

export interface HomepageSetting {
  /** القالب العام لهيرو الصفحة الرئيسية */
  heroTemplate?: "classic" | "image_slider" | "coming_soon" | string | null;
  teacherImageUrl: string | null;
  heroTitle: string | null;
  heroTitleEn?: string | null;
  heroSlogan: string | null;
  heroSloganEn?: string | null;
  platformName: string | null;
  platformNameEn?: string | null;
  /** لوجو الهيدر (URL) — يظهر بجانب اسم المنصة */
  headerLogoUrl?: string | null;
  /** لون المنصة الأساسي (#RRGGBB) — عند null يُستخدم الافتراضي من CSS */
  primaryColor?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
  whatsappUrl: string | null;
  facebookUrl: string | null;
  telegramUrl?: string | null;
  /** روابط دعم فريق المنصة (أزرار ثابتة أسفل يسار الصفحة الرئيسية) */
  teamYoutubeUrl?: string | null;
  teamLinkedinUrl?: string | null;
  teamWhatsappUrl?: string | null;
  teamFacebookUrl?: string | null;
  teamTelegramUrl?: string | null;
  /** كلمة تسبق اسم المنصة في أزرار يمين الصفحة (مثال: الدعم) */
  socialRightLabel?: string | null;
  socialRightLabelEn?: string | null;
  /** كلمة تسبق اسم المنصة في أزرار يسار الصفحة (مثال: دعم الفريق) */
  socialLeftLabel?: string | null;
  socialLeftLabelEn?: string | null;
  /** تفعيل/إخفاء مجموعة أزرار السوشيال اليسرى بالكامل */
  socialLeftEnabled?: boolean;
  pageTitle: string | null;
  pageTitleEn?: string | null;
  heroBgPreset: HeroBgPreset | string | null;
  /** لون أعلى التدرج المخصّص (#RRGGBB) — يُستخدم مع heroBgCustomTo عند صلاحيتهما */
  heroBgCustomFrom?: string | null;
  /** لون أسفل التدرج المخصّص (#RRGGBB) */
  heroBgCustomTo?: string | null;
  /** روابط الصور الصغيرة العائمة حول صورة المدرس (1: يسار أعلى، 2: يمين أسفل، 3: أسفل يسار) */
  heroFloatImage1: string | null;
  heroFloatImage2: string | null;
  heroFloatImage3: string | null;
  /** صور قالب السلايدر (القالب الثاني) */
  heroSliderImage1?: string | null;
  heroSliderImage2?: string | null;
  heroSliderImage3?: string | null;
  heroSliderImage4?: string | null;
  heroSliderImage5?: string | null;
  /** ربط كل شريحة سلايدر بكورس منشور (معرف الكورس) */
  heroSliderCourseId1?: string | null;
  heroSliderCourseId2?: string | null;
  heroSliderCourseId3?: string | null;
  heroSliderCourseId4?: string | null;
  heroSliderCourseId5?: string | null;
  /** مدة التبديل التلقائي بالمللي ثانية */
  heroSliderIntervalMs?: number | null;
  /** عنوان القالب الثالث (Hero 3) */
  hero3Title?: string | null;
  hero3TitleEn?: string | null;
  /** النص الفرعي في القالب الثالث */
  hero3Subtitle?: string | null;
  hero3SubtitleEn?: string | null;
  /** صورة الهاتف في القالب الثالث */
  hero3PhoneImageUrl?: string | null;
  /** لون الشكل خلف الهاتف (#RRGGBB) */
  hero3PhoneBgColor?: string | null;
  /** صورة شارة المتجر الأولى (Google Play/App Store) */
  hero3StoreBadge1ImageUrl?: string | null;
  /** رابط الشارة الأولى */
  hero3StoreBadge1Link?: string | null;
  /** صورة شارة المتجر الثانية */
  hero3StoreBadge2ImageUrl?: string | null;
  /** رابط الشارة الثانية */
  hero3StoreBadge2Link?: string | null;
  /** عنوان الفوتر (مثلاً: منصتي التعليمية) */
  footerTitle: string | null;
  footerTitleEn?: string | null;
  /** وصف قصير تحت العنوان (مثلاً: تعلم بأسلوب حديث...) */
  footerTagline: string | null;
  footerTaglineEn?: string | null;
  /** نص حقوق النشر — يظهر بعد © والسنة (السنة تُضاف تلقائياً) */
  footerCopyright: string | null;
  footerCopyrightEn?: string | null;
  /** عنوان قسم تعليقات الطلاب في الصفحة الرئيسية */
  reviewsSectionTitle: string | null;
  reviewsSectionTitleEn?: string | null;
  /** وصف قصير تحت عنوان قسم التعليقات */
  reviewsSectionSubtitle: string | null;
  reviewsSectionSubtitleEn?: string | null;
  /** عنوان الشارة الصغيرة بقسم CTA أسفل الرئيسية */
  ctaBadgeText?: string | null;
  ctaBadgeTextEn?: string | null;
  /** عنوان CTA الرئيسي */
  ctaTitle?: string | null;
  ctaTitleEn?: string | null;
  /** وصف CTA */
  ctaDescription?: string | null;
  ctaDescriptionEn?: string | null;
  /** نص زر CTA */
  ctaButtonText?: string | null;
  ctaButtonTextEn?: string | null;
  /** عند true تظهر صفحة «اختر المدرسين» ويُسمح بحسابات TEACHER */
  teachersEnabled?: boolean;
  /** عند true يظهر قسم «الاشتراكات المتاحة» ويُفعّل شراء باقات الوصول لكل الدورات المدفوعة */
  subscriptionsEnabled?: boolean;
  /** عند true يظهر قسم متجر المنصة في الصفحة الرئيسية */
  storeEnabled?: boolean;
  /** عنوان قسم المتجر في الصفحة الرئيسية (عند null أو فارغ يُستخدم الافتراضي) */
  storeSectionTitle?: string | null;
  storeSectionTitleEn?: string | null;
  /** وصف قسم المتجر في الصفحة الرئيسية */
  storeSectionDescription?: string | null;
  storeSectionDescriptionEn?: string | null;
  /** عند true يظهر قسم تفاصيل المنصة بعد الهيرو مباشرة */
  platformDetailsEnabled?: boolean;
  /** عنوان قسم تفاصيل المنصة */
  platformDetailsTitle?: string | null;
  platformDetailsTitleEn?: string | null;
  /** وصف قصير تحت عنوان قسم تفاصيل المنصة */
  platformDetailsSubtitle?: string | null;
  platformDetailsSubtitleEn?: string | null;
  /** لون خلفية قسم تفاصيل المنصة (#RRGGBB) */
  platformDetailsBackgroundColor?: string | null;
  /** عناصر القسم (JSON) */
  platformDetailsItems?: string | null;
  /** عند true يظهر قسم الأخبار أسفل «ماذا يقول الطلاب» */
  platformNewsEnabled?: boolean;
  /** شرائح الأخبار (JSON: PlatformNewsItem[]) */
  platformNewsItems?: string | null;
  /** عنوان قسم الأخبار في الصفحة الرئيسية */
  platformNewsSectionTitle?: string | null;
  platformNewsSectionTitleEn?: string | null;
  /** عنوان صفحة إضافة الرصيد للطالب */
  addBalanceTitle?: string | null;
  addBalanceTitleEn?: string | null;
  /** وصف أعلى صفحة إضافة الرصيد */
  addBalanceSubtitle?: string | null;
  addBalanceSubtitleEn?: string | null;
  /** عنوان وسيلة الدفع */
  addBalanceMethodTitle?: string | null;
  addBalanceMethodTitleEn?: string | null;
  /** نص التحويل قبل رقم المحفظة */
  addBalanceTransferInstruction?: string | null;
  addBalanceTransferInstructionEn?: string | null;
  /** رقم المحفظة/التحويل */
  addBalanceWalletNumber?: string | null;
  /** ملاحظة ما بعد التحويل */
  addBalanceConfirmationNote?: string | null;
  addBalanceConfirmationNoteEn?: string | null;
  /** رقم واتساب استلام صورة التأكيد */
  addBalanceWhatsappNumber?: string | null;
  /** نص زر الواتساب */
  addBalanceWhatsappButtonText?: string | null;
  addBalanceWhatsappButtonTextEn?: string | null;
  /** نص انتظار إضافة الرصيد */
  addBalanceWaitingNote?: string | null;
  addBalanceWaitingNoteEn?: string | null;
  /** شكل عرض كود حقوق الطبع على مشغل الفيديو (floating الحالي أو watermark) */
  copyrightOverlayStyle?: "floating" | "watermark" | string | null;
}

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  /** تكلفة الوحدة للأدمن — للإحصائيات فقط، لا تُعرض للطلاب في المتجر العام */
  costPrice: number;
  imageUrl: string | null;
  pdfUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export type SubscriptionDurationKind = "week" | "month" | "year";

export interface Course {
  id: string;
  title: string;
  title_ar: string | null;
  description_en?: string | null;
  slug: string;
  description: string;
  short_desc: string | null;
  short_desc_en?: string | null;
  image_url: string | null;
  price: string;
  duration: string | null;
  level: string | null;
  is_published: boolean;
  order: number;
  category_id: string | null;
  created_by_id: string | null;
  accepts_homework?: boolean;
  /** متوسط تقييم الكورس المحسوب من كل تقييمات دروسه */
  course_rating?: number | null;
  /** عدد تقييمات الدروس المستخدمة في متوسط الكورس */
  course_rating_count?: number;
  created_at: Date;
  updated_at: Date;
}

/** تسليم واجب من طالب (لحصة أو للكورس قديماً) */
export interface HomeworkSubmission {
  id: string;
  course_id: string;
  user_id: string;
  lesson_id?: string | null;
  submission_type: "link" | "pdf" | "image";
  link_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: Date;
}

/** تقييم طالب لحصة (1..5) — صف واحد لكل طالب/حصة */
export interface LessonRating {
  id: string;
  lesson_id: string;
  user_id: string;
  course_id: string;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

export interface Lesson {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  content: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration: number | null;
  order: number;
  course_id: string;
  accepts_homework?: boolean;
  created_at: Date;
  updated_at: Date;
}

export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";

export interface Quiz {
  id: string;
  title: string;
  course_id: string;
  order: number;
  time_limit_minutes?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  type: QuestionType;
  question_text: string;
  order: number;
  quiz_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  question_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: Date;
}

/** كود تفعيل مجاني لدورة — للأدمن إنشاؤه وللطالب تفعيله */
export interface ActivationCode {
  id: string;
  course_id: string;
  code: string;
  created_at: Date;
  used_at: Date | null;
  used_by_user_id: string | null;
}

export type LiveStreamProvider = "zoom" | "google_meet";

export interface LiveStream {
  id: string;
  course_id: string;
  title: string;
  title_ar: string | null;
  provider: LiveStreamProvider;
  meeting_url: string;
  meeting_id: string | null;
  meeting_password: string | null;
  scheduled_at: Date;
  description: string | null;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// ----- أشكال للواجهة (camelCase) كما يتوقعها التطبيق -----
export interface CourseApp {
  id: string;
  title: string;
  titleAr?: string | null;
  slug: string;
  description?: string;
  shortDesc?: string | null;
  imageUrl?: string | null;
  price?: number | string;
  isPublished?: boolean;
  order?: number;
  categoryId?: string | null;
  courseRating?: number | null;
  courseRatingCount?: number;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
}

export interface LessonApp {
  id: string;
  title: string;
  titleAr?: string | null;
  slug: string;
  content?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  duration?: number | null;
  order: number;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizApp {
  id: string;
  title: string;
  courseId: string;
  order: number;
  timeLimitMinutes?: number | null;
  questions?: (QuestionApp & { options: QuestionOptionApp[] })[];
}

export interface QuestionApp {
  id: string;
  type: QuestionType;
  questionText: string;
  order: number;
  quizId: string;
  options?: QuestionOptionApp[];
}

export interface QuestionOptionApp {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
}

/** محادثة بين موظف (أدمن/مساعد) وطالب */
export interface Conversation {
  id: string;
  staffUserId: string;
  studentUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** رسالة داخل محادثة */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: "text" | "image" | "file";
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: Date;
}
